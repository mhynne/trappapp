import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  floors,
  trips,
  type ActivityPeriod,
  type Floor,
  type Participant,
  type Trip,
} from "@/lib/db/schema";
import { getActivePeriod, rulesFor } from "@/lib/periods";

/**
 * Plausibilitetsregler. Bevisst lettvekt: vi antar kolleger, ikke motstandere.
 * Den egentlige sikkerhetsventilen er at admin kan slette turer og utestenge folk.
 */
// Nedkjølingen er et absolutt gulv mot dobbeltregistrering. Den reelle bremsen er
// fartssjekken (10 s per etasje) og dagstaket – derfor holdes den lav nok til at
// noen som faktisk går to etapper etter hverandre ikke blir avvist.
export const COOLDOWN_SECONDS = 30;
export const SECONDS_PER_FLOOR = 10;
export const CONTINUITY_WINDOW_SECONDS = 5 * 60;

export type RegisterSuccess = {
  ok: true;
  floorsUp: number;
  floorsDown: number;
  pointsEarned: number;
  capped: boolean;
  flagged: boolean;
  periodName: string | null;
  totalPoints: number;
  rank: number | null;
  participantCount: number;
};

export type RegisterFailureCode =
  | "no_participant"
  | "banned"
  | "unknown_floor"
  | "unknown_from_floor"
  | "same_floor"
  | "cooldown"
  | "too_fast";

export type RegisterFailure = {
  ok: false;
  code: RegisterFailureCode;
  message: string;
  retryAfterSeconds?: number;
};

export type RegisterResult = RegisterSuccess | RegisterFailure;

/** Siste registrerte tur (ikke slettet) for en deltaker. */
export async function getLastTrip(participantId: string): Promise<Trip | null> {
  const rows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.participantId, participantId), isNull(trips.deletedAt)))
    .orderBy(desc(trips.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export type TripHistoryRow = {
  id: number;
  createdAt: Date;
  fromLabel: string;
  toLabel: string;
  floorsUp: number;
  floorsDown: number;
  points: number;
  capped: boolean;
};

/** De siste turene til en deltaker, med lesbare etasjenavn. */
export async function getRecentTrips(
  participantId: string,
  limit = 20,
): Promise<TripHistoryRow[]> {
  const rows = await db.execute<{
    id: string;
    created_at: string;
    from_label: string | null;
    to_label: string | null;
    from_floor: number;
    to_floor: number;
    floors_up: number;
    floors_down: number;
    points: string;
    capped: boolean;
  }>(sql`
    select
      t.id, t.created_at, t.from_floor, t.to_floor,
      t.floors_up, t.floors_down, t.points, t.capped,
      ff.label as from_label,
      tf.label as to_label
    from trips t
    left join floors ff on ff.number = t.from_floor
    left join floors tf on tf.number = t.to_floor
    where t.participant_id = ${participantId}
      and t.deleted_at is null
    order by t.created_at desc
    limit ${limit}
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    createdAt: new Date(row.created_at),
    fromLabel: row.from_label ?? `Etasje ${row.from_floor}`,
    toLabel: row.to_label ?? `Etasje ${row.to_floor}`,
    floorsUp: row.floors_up,
    floorsDown: row.floors_down,
    points: Number(row.points),
    capped: row.capped,
  }));
}

/** Poeng deltakeren allerede har fått i dag (norsk døgn). */
async function pointsToday(participantId: string): Promise<number> {
  const rows = await db.execute<{ total: string }>(sql`
    select coalesce(sum(points), 0) as total
    from trips
    where participant_id = ${participantId}
      and deleted_at is null
      and created_at >= date_trunc('day', now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo'
  `);
  return Number(rows[0]?.total ?? 0);
}

/**
 * Foreslår startetasje: der forrige tur endte, hvis den var nylig. Ellers 1. etasje
 * (eller laveste etasje som finnes). Gjør at de fleste registreringer blir ett trykk.
 */
export function suggestFromFloor(
  activeFloors: Floor[],
  scannedFloor: Floor,
  lastTrip: Trip | null,
): number | null {
  const candidates = activeFloors.filter((f) => f.number !== scannedFloor.number);
  if (candidates.length === 0) return null;

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  if (lastTrip && lastTrip.createdAt.getTime() > twoHoursAgo) {
    const match = candidates.find((f) => f.number === lastTrip.toFloor);
    if (match) return match.number;
  }

  const ground = candidates.find((f) => f.number === 1);
  if (ground) return ground.number;

  return candidates.reduce((lowest, f) =>
    f.number < lowest.number ? f : lowest,
  ).number;
}

/** Aktive etasjer i ett bygg. Etasjer fra andre bygg hører ikke hjemme her. */
export async function getActiveFloors(locationId: number): Promise<Floor[]> {
  return db
    .select()
    .from(floors)
    .where(and(eq(floors.isActive, true), eq(floors.locationId, locationId)))
    .orderBy(desc(floors.number));
}

export async function getFloorByToken(qrToken: string): Promise<Floor | null> {
  const rows = await db
    .select()
    .from(floors)
    .where(eq(floors.qrToken, qrToken))
    .limit(1);
  return rows[0] ?? null;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/**
 * Registrerer én trappetur. All validering skjer her på serveren – klienten
 * sender bare hvilken etasje man startet i.
 */
export async function registerTrip(params: {
  participant: Participant;
  scannedFloor: Floor;
  fromFloor: number;
}): Promise<RegisterResult> {
  const { participant, scannedFloor, fromFloor } = params;

  if (participant.isBanned) {
    return {
      ok: false,
      code: "banned",
      message: "Kontoen din er satt på pause. Ta kontakt med administrator.",
    };
  }

  if (!scannedFloor.isActive) {
    return {
      ok: false,
      code: "unknown_floor",
      message: "Denne QR-koden er ikke i bruk lenger.",
    };
  }

  const toFloor = scannedFloor.number;

  if (fromFloor === toFloor) {
    return {
      ok: false,
      code: "same_floor",
      message: "Start- og sluttetasje kan ikke være den samme.",
    };
  }

  // Startetasjen må ligge i samme bygg som den skannede plakaten. Uten dette
  // kunne man oppgi en etasje fra et annet bygg og få poeng for differansen.
  const knownFloors = await getActiveFloors(scannedFloor.locationId);
  if (!knownFloors.some((f) => f.number === fromFloor)) {
    return {
      ok: false,
      code: "unknown_from_floor",
      message: "Ukjent startetasje.",
    };
  }

  const floorsMoved = Math.abs(toFloor - fromFloor);
  const lastTrip = await getLastTrip(participant.id);
  const now = Date.now();

  let flagged = false;

  if (lastTrip) {
    const secondsSinceLast = (now - lastTrip.createdAt.getTime()) / 1000;

    if (secondsSinceLast < COOLDOWN_SECONDS) {
      return {
        ok: false,
        code: "cooldown",
        message: "Du registrerte nettopp en tur. Vent litt før neste.",
        retryAfterSeconds: Math.ceil(COOLDOWN_SECONDS - secondsSinceLast),
      };
    }

    const requiredSeconds = floorsMoved * SECONDS_PER_FLOOR;
    if (secondsSinceLast < requiredSeconds) {
      return {
        ok: false,
        code: "too_fast",
        message: `Det gikk litt fort – ${floorsMoved} ${plural(floorsMoved, "etasje", "etasjer")} tar mer enn ${Math.round(requiredSeconds)} sekunder.`,
        retryAfterSeconds: Math.ceil(requiredSeconds - secondsSinceLast),
      };
    }

    // Startet du et annet sted enn du sist endte, kort tid etter? Fullt lovlig
    // (man kan ta heisen imellom), men verdt å merke for moderering.
    if (
      lastTrip.toFloor !== fromFloor &&
      secondsSinceLast < CONTINUITY_WINDOW_SECONDS
    ) {
      flagged = true;
    }
  }

  const period: ActivityPeriod | null = await getActivePeriod();

  const floorsUp = Math.max(0, toFloor - fromFloor);
  const floorsDown = Math.max(0, fromFloor - toFloor);

  let pointsEarned = 0;
  let capped = false;

  if (period) {
    const rules = rulesFor(period);
    const rawPoints = floorsUp * rules.pointsUp + floorsDown * rules.pointsDown;
    const alreadyToday = await pointsToday(participant.id);
    const remaining = Math.max(0, rules.dailyPointsCap - alreadyToday);
    pointsEarned = Math.min(rawPoints, remaining);
    capped = pointsEarned < rawPoints;
  }

  await db.insert(trips).values({
    participantId: participant.id,
    periodId: period?.id ?? null,
    scannedFloorId: scannedFloor.id,
    locationId: scannedFloor.locationId,
    fromFloor,
    toFloor,
    floorsUp,
    floorsDown,
    points: pointsEarned.toFixed(2),
    capped,
    flagged,
  });

  const standing = period
    ? await getStanding(participant.id, period.id)
    : { totalPoints: 0, rank: null, participantCount: 0 };

  return {
    ok: true,
    floorsUp,
    floorsDown,
    pointsEarned,
    capped,
    flagged,
    periodName: period?.name ?? null,
    ...standing,
  };
}

/** Deltakerens poengsum og plassering i en periode. */
export async function getStanding(
  participantId: string,
  periodId: number,
): Promise<{
  totalPoints: number;
  rank: number | null;
  participantCount: number;
}> {
  const rows = await db.execute<{
    total_points: string;
    rank: string | null;
    participant_count: string;
  }>(sql`
    with totals as (
      select t.participant_id, sum(t.points) as points
      from trips t
      join participants p on p.id = t.participant_id
      where t.period_id = ${periodId}
        and t.deleted_at is null
        and p.is_banned = false
      group by t.participant_id
      having sum(t.points) > 0
    )
    select
      coalesce((select points from totals where participant_id = ${participantId}), 0) as total_points,
      (select count(*) + 1 from totals where points >
        coalesce((select points from totals where participant_id = ${participantId}), 0)
      ) as rank,
      (select count(*) from totals) as participant_count
  `);

  const row = rows[0];
  const totalPoints = Number(row?.total_points ?? 0);

  return {
    totalPoints,
    rank: totalPoints > 0 ? Number(row?.rank ?? 0) : null,
    participantCount: Number(row?.participant_count ?? 0),
  };
}
