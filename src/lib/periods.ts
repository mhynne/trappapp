import { and, asc, desc, gt, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { activityPeriods, type ActivityPeriod } from "@/lib/db/schema";

export type PeriodRules = {
  pointsUp: number;
  pointsDown: number;
  dailyPointsCap: number;
};

/** Perioden som pågår nå. Ved overlapp velges den som slutter først. */
export async function getActivePeriod(): Promise<ActivityPeriod | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(activityPeriods)
    .where(
      and(lte(activityPeriods.startsAt, now), gt(activityPeriods.endsAt, now)),
    )
    .orderBy(asc(activityPeriods.endsAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAllPeriods(): Promise<ActivityPeriod[]> {
  return db.select().from(activityPeriods).orderBy(desc(activityPeriods.startsAt));
}

/**
 * Mellomlagrede varianter for de offentlige sidene, som henter perioden på
 * nesten hver visning selv om den endrer seg noen ganger i året.
 *
 * Brukes bevisst IKKE av registreringen i trips.ts: der avgjør perioden hvor
 * mange poeng turen gir, og en 60 sekunder gammel periode kan ved et
 * månedsskifte bokføre turen på feil periode. Admin bruker heller ikke disse,
 * så den som redigerer ser endringen med en gang.
 */
export const PERIODS_TAG = "perioder";

/**
 * unstable_cache lagrer verdien som JSON, så Date-feltene kommer tilbake som
 * tekst. Uten dette ville `period.endsAt.getTime()` kaste, og sidene feile.
 */
function revivePeriod(row: ActivityPeriod): ActivityPeriod {
  return {
    ...row,
    startsAt: new Date(row.startsAt),
    endsAt: new Date(row.endsAt),
    createdAt: new Date(row.createdAt),
  };
}

const loadActivePeriod = unstable_cache(getActivePeriod, ["aktiv-periode"], {
  revalidate: 60,
  tags: [PERIODS_TAG],
});

const loadAllPeriods = unstable_cache(getAllPeriods, ["alle-perioder"], {
  revalidate: 60,
  tags: [PERIODS_TAG],
});

export async function getActivePeriodCached(): Promise<ActivityPeriod | null> {
  const row = await loadActivePeriod();
  return row ? revivePeriod(row) : null;
}

export async function getAllPeriodsCached(): Promise<ActivityPeriod[]> {
  return (await loadAllPeriods()).map(revivePeriod);
}

export async function getPeriodById(id: number): Promise<ActivityPeriod | null> {
  const rows = await db
    .select()
    .from(activityPeriods)
    .where(sql`${activityPeriods.id} = ${id}`)
    .limit(1);
  return rows[0] ?? null;
}

export function rulesFor(period: ActivityPeriod): PeriodRules {
  return {
    pointsUp: Number(period.pointsUp),
    pointsDown: Number(period.pointsDown),
    dailyPointsCap: Number(period.dailyPointsCap),
  };
}

export type LeaderboardRow = {
  participantId: string;
  nickname: string;
  points: number;
  floorsUp: number;
  floorsDown: number;
  trips: number;
};

/**
 * Stillingen i en periode. Én spørring – på pilotskala (noen hundre
 * registreringer per dag) er dette raskt nok uten materialiserte views.
 */
/**
 * Selve summeringen. Mellomlagres i 30 sekunder og deles av alle som ser på
 * listen samtidig – uten det regnes den ut på nytt for hver eneste besøkende.
 *
 * Bare tallene mellomlagres, ikke siden: resultatsiden uthever din egen rad, og
 * en sidecache ville vist deg en annens uthevning.
 */
const loadLeaderboard = unstable_cache(
  async (periodId: number, locationId: number | null): Promise<LeaderboardRow[]> => {
  const rows = await db.execute<{
    participant_id: string;
    nickname: string;
    points: string;
    floors_up: string;
    floors_down: string;
    trips: string;
  }>(sql`
    select
      p.id            as participant_id,
      p.nickname      as nickname,
      sum(t.points)   as points,
      sum(t.floors_up)   as floors_up,
      sum(t.floors_down) as floors_down,
      count(*)        as trips
    from trips t
    join participants p on p.id = t.participant_id
    where t.period_id = ${periodId}
      and t.deleted_at is null
      and p.is_banned = false
      ${locationId === null ? sql`` : sql`and t.location_id = ${locationId}`}
    group by p.id, p.nickname
    having sum(t.points) > 0
    order by sum(t.points) desc, sum(t.floors_up) desc, min(t.created_at) asc
  `);

    return rows.map((row) => ({
      participantId: row.participant_id,
      nickname: row.nickname,
      points: Number(row.points),
      floorsUp: Number(row.floors_up),
      floorsDown: Number(row.floors_down),
      trips: Number(row.trips),
    }));
  },
  ["leaderboard"],
  { revalidate: 30 },
);

/** Hele bedriften når locationId er null, ellers bare det bygget. */
export async function getLeaderboard(
  periodId: number,
  locationId: number | null = null,
): Promise<LeaderboardRow[]> {
  return loadLeaderboard(periodId, locationId);
}

// Formattering ligger i @/lib/format slik at klientkomponenter kan bruke den
// uten å dra med seg databasetilkoblingen.

/* ------------------------------------------------------------- totaler */

export type PeriodTotals = {
  floorsUp: number;
  floorsDown: number;
  /** Opp og ned lagt sammen. Det er dette «antall trapper» betyr her. */
  floors: number;
  participants: number;
  trips: number;
};

const TOMME_TOTALER: PeriodTotals = {
  floorsUp: 0,
  floorsDown: 0,
  floors: 0,
  participants: 0,
  trips: 0,
};

/**
 * Etasjer, ikke poeng. Poengreglene settes per periode og kan endres, og
 * dagstaket lagrer turer over grensen med null poeng selv om de ble gått –
 * så poengsummen kan verken sammenlignes mellom kampanjer eller brukes som
 * mål på aktivitet. Etasjer er upåvirket av begge deler.
 */
const loadPeriodTotals = unstable_cache(
  async (periodId: number, locationId: number | null): Promise<PeriodTotals> => {
    const rows = await db.execute<{
      floors_up: string;
      floors_down: string;
      participants: string;
      trips: string;
    }>(sql`
      select
        coalesce(sum(t.floors_up), 0)        as floors_up,
        coalesce(sum(t.floors_down), 0)      as floors_down,
        count(distinct t.participant_id)     as participants,
        count(*)                             as trips
      from trips t
      join participants p on p.id = t.participant_id
      where t.period_id = ${periodId}
        and t.deleted_at is null
        and p.is_banned = false
        ${locationId === null ? sql`` : sql`and t.location_id = ${locationId}`}
    `);

    const row = rows[0];
    if (!row) return TOMME_TOTALER;

    const floorsUp = Number(row.floors_up);
    const floorsDown = Number(row.floors_down);
    return {
      floorsUp,
      floorsDown,
      floors: floorsUp + floorsDown,
      participants: Number(row.participants),
      trips: Number(row.trips),
    };
  },
  ["periode-totaler"],
  { revalidate: 60 },
);

export async function getPeriodTotals(
  periodId: number,
  locationId: number | null = null,
): Promise<PeriodTotals> {
  return loadPeriodTotals(periodId, locationId);
}

/** Totaler for alle perioder i én spørring, til sammenligning over tid. */
const loadTotalsByPeriod = unstable_cache(
  async (): Promise<Record<number, PeriodTotals>> => {
    const rows = await db.execute<{
      period_id: number;
      floors_up: string;
      floors_down: string;
      participants: string;
      trips: string;
    }>(sql`
      select
        t.period_id,
        coalesce(sum(t.floors_up), 0)    as floors_up,
        coalesce(sum(t.floors_down), 0)  as floors_down,
        count(distinct t.participant_id) as participants,
        count(*)                         as trips
      from trips t
      join participants p on p.id = t.participant_id
      where t.deleted_at is null
        and p.is_banned = false
        and t.period_id is not null
      group by t.period_id
    `);

    const ut: Record<number, PeriodTotals> = {};
    for (const row of rows) {
      const floorsUp = Number(row.floors_up);
      const floorsDown = Number(row.floors_down);
      ut[row.period_id] = {
        floorsUp,
        floorsDown,
        floors: floorsUp + floorsDown,
        participants: Number(row.participants),
        trips: Number(row.trips),
      };
    }
    return ut;
  },
  ["totaler-per-periode"],
  { revalidate: 60 },
);

export async function getTotalsByPeriod(): Promise<Record<number, PeriodTotals>> {
  return loadTotalsByPeriod();
}
