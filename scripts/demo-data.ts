import "./env";

import { randomUUID } from "node:crypto";

import postgres from "postgres";

/**
 * Lager noen fiktive deltakere med turer, slik at resultatlisten kan testes.
 * Kun for lokal utvikling – nekter å kjøre mot annet enn localhost.
 */
const NICKNAMES = [
  "Trappetroll",
  "Etasjejeger",
  "Heisboikott",
  "Stigefot",
  "Rullegresshopper",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL mangler.");
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
    throw new Error("demo-data kjører kun mot localhost.");
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    const [period] = await sql`
      select id, points_up, points_down from activity_periods
      where now() between starts_at and ends_at
      order by ends_at asc limit 1
    `;
    if (!period) throw new Error("Ingen aktiv periode. Kjør npm run db:seed.");

    const floors = await sql`select id, number from floors where is_active order by number`;
    const byNumber = new Map(floors.map((f) => [Number(f.number), Number(f.id)]));
    const levels = floors.map((f) => Number(f.number));

    for (const [index, nickname] of NICKNAMES.entries()) {
      const [participant] = await sql`
        insert into participants (device_token, nickname)
        values (${randomUUID()}, ${nickname})
        on conflict do nothing
        returning id
      `;
      if (!participant) {
        console.log(`· ${nickname} finnes fra før`);
        continue;
      }

      const tripCount = 3 + ((index * 2) % 5);
      for (let i = 0; i < tripCount; i++) {
        const from = levels[(i + index) % levels.length];
        const to = levels[(i + index + 2 + (i % 2)) % levels.length];
        const scannedFloorId = byNumber.get(to);
        if (from === to || scannedFloorId === undefined) continue;

        const up = Math.max(0, to - from);
        const down = Math.max(0, from - to);
        const points =
          up * Number(period.points_up) + down * Number(period.points_down);
        const hoursAgo = i * 5 + index;

        await sql`
          insert into trips (
            participant_id, period_id, scanned_floor_id, from_floor, to_floor,
            floors_up, floors_down, points, created_at
          ) values (
            ${participant.id}, ${period.id}, ${scannedFloorId}, ${from}, ${to},
            ${up}, ${down}, ${points.toFixed(2)}, now() - (${hoursAgo} || ' hours')::interval
          )
        `;
      }
      console.log(`✓ ${nickname} med ${tripCount} turer`);
    }

    console.log("\nDemodata lagt inn. Se /resultater");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
