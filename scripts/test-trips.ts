import "./env";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db, sqlClient } from "../src/lib/db";
import { participants } from "../src/lib/db/schema";

import { getActivePeriod, rulesFor } from "../src/lib/periods";
import {
  fetchActiveFloors,
  fetchFloorByToken,
  registerTrip,
  suggestFromFloor,
} from "../src/lib/trips";

/**
 * Sjekker registreringslogikken mot en ekte database uten å gå via nettleseren.
 * Lager en midlertidig deltaker og rydder opp etterpå.
 *
 *   npm run test:logic
 */
let failures = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`);
    if (detail !== undefined) console.log(`      ${JSON.stringify(detail)}`);
  }
}

/** Flytter deltakerens turer bakover i tid, så tidssjekkene kan testes. */
async function ageTrips(participantId: string, seconds: number) {
  await sqlClient`
    update trips
    set created_at = now() - (${seconds} || ' seconds')::interval
    where participant_id = ${participantId}
  `;
}

async function main() {
  // Hentes direkte: de mellomlagrede variantene virker bare inne i Next.js.
  const [location] = await sqlClient<{ id: number }[]>`
    select id from locations where is_active order by id limit 1
  `;
  if (!location) throw new Error("Ingen lokasjon. Kjør npm run db:seed.");

  const floors = await fetchActiveFloors(location.id);
  const period = await getActivePeriod();

  if (!period) throw new Error("Ingen aktiv periode. Kjør npm run db:seed.");
  if (floors.length < 3) throw new Error("Trenger minst tre etasjer å teste med.");

  const rules = rulesFor(period);
  const floorAt = async (level: number) => {
    const floor = floors.find((f) => f.number === level);
    if (!floor) throw new Error(`Fant ingen etasje på nivå ${level}`);
    const resolved = await fetchFloorByToken(floor.qrToken);
    if (!resolved) throw new Error(`Fant ingen etasje for token ${floor.qrToken}`);
    return resolved;
  };

  const top = floors.reduce((a, b) => (a.number > b.number ? a : b));
  const bottom = floors.reduce((a, b) => (a.number < b.number ? a : b));
  const spread = top.number - bottom.number;

  const [participant] = await db
    .insert(participants)
    .values({
      email: `test-${randomUUID().slice(0, 8)}@example.test`,
      nickname: `test-${randomUUID().slice(0, 8)}`,
    })
    .returning();

  try {
    console.log(`Periode: ${period.name} (opp ${rules.pointsUp}, ned ${rules.pointsDown}, tak ${rules.dailyPointsCap})`);

    console.log("\nPoengberegning");
    const up = await registerTrip({
      participant,
      scannedFloor: await floorAt(top.number),
      fromFloor: bottom.number,
    });
    check(
      `${spread} etasjer opp gir ${spread * rules.pointsUp} poeng`,
      up.ok && up.pointsEarned === spread * rules.pointsUp,
      up,
    );
    check("turen regnes som opp, ikke ned", up.ok && up.floorsDown === 0, up);

    await ageTrips(participant.id, 3600);
    const down = await registerTrip({
      participant,
      scannedFloor: await floorAt(bottom.number),
      fromFloor: top.number,
    });
    check(
      `${spread} etasjer ned gir ${spread * rules.pointsDown} poeng`,
      down.ok && down.pointsEarned === spread * rules.pointsDown,
      down,
    );

    console.log("\nValidering");
    const same = await registerTrip({
      participant,
      scannedFloor: await floorAt(top.number),
      fromFloor: top.number,
    });
    check("samme start- og sluttetasje avvises", !same.ok && same.code === "same_floor", same);

    const unknown = await registerTrip({
      participant,
      scannedFloor: await floorAt(top.number),
      fromFloor: 9999,
    });
    check("ukjent startetasje avvises", !unknown.ok && unknown.code === "unknown_from_floor", unknown);

    console.log("\nAnti-juks");
    await ageTrips(participant.id, 5);
    const cooldown = await registerTrip({
      participant,
      scannedFloor: await floorAt(top.number),
      fromFloor: bottom.number,
    });
    check("registrering rett etter forrige avvises", !cooldown.ok && cooldown.code === "cooldown", cooldown);
    check(
      "avvisningen sier hvor lenge man må vente",
      !cooldown.ok && typeof cooldown.retryAfterSeconds === "number" && cooldown.retryAfterSeconds > 0,
      cooldown,
    );

    // Nedkjølingen er passert, men ikke 10 sekunder per etasje.
    await ageTrips(participant.id, 31);
    const tooFast = await registerTrip({
      participant,
      scannedFloor: await floorAt(top.number),
      fromFloor: bottom.number,
    });
    const needsSpeedCheck = spread * 10 > 31;
    check(
      needsSpeedCheck
        ? `${spread} etasjer på 31 sekunder avvises som for raskt`
        : `bygget er for lavt til at fartssjekken slår inn (${spread} etasjer krever ${spread * 10} s)`,
      needsSpeedCheck ? !tooFast.ok && tooFast.code === "too_fast" : tooFast.ok,
      tooFast,
    );

    await ageTrips(participant.id, 3600);
    const middle = floors.find(
      (f) => f.number !== top.number && f.number !== bottom.number,
    )!;
    const flagged = await registerTrip({
      participant,
      scannedFloor: await floorAt(middle.number),
      fromFloor: top.number,
    });
    check(
      "start et annet sted enn forrige tur endte gir ikke flagg etter lang tid",
      flagged.ok && flagged.flagged === false,
      flagged,
    );

    await ageTrips(participant.id, 60);
    const discontinuous = await registerTrip({
      participant,
      scannedFloor: await floorAt(top.number),
      fromFloor: bottom.number,
    });
    check(
      "brudd i etasjekjeden kort tid etter flagges, men godkjennes",
      discontinuous.ok && discontinuous.flagged === true,
      discontinuous,
    );

    console.log("\nDagstak");
    let capped = false;
    for (let i = 0; i < 40 && !capped; i++) {
      await ageTrips(participant.id, 3600);
      const trip = await registerTrip({
        participant,
        scannedFloor: await floorAt(top.number),
        fromFloor: bottom.number,
      });
      if (trip.ok && trip.capped) capped = true;
    }
    check(`poeng stopper på dagstaket (${rules.dailyPointsCap})`, capped);

    const total = await sqlClient<{ total: string }[]>`
      select coalesce(sum(points), 0) as total from trips
      where participant_id = ${participant.id} and deleted_at is null
    `;
    check(
      "samlede poeng overstiger ikke dagstaket",
      Number(total[0].total) <= rules.dailyPointsCap,
      total[0],
    );

    console.log("\nForslag til startetasje");
    check(
      "uten historikk foreslås 1. etasje",
      suggestFromFloor(floors, top, null) === 1 || suggestFromFloor(floors, top, null) === bottom.number,
      suggestFromFloor(floors, top, null),
    );
  } finally {
    await db.delete(participants).where(eq(participants.id, participant.id));
    await sqlClient.end();
  }

  console.log(
    failures === 0
      ? "\nAlle sjekker gikk gjennom."
      : `\n${failures} sjekk(er) feilet.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
