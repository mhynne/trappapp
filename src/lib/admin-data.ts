import { asc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { floors, type Floor } from "@/lib/db/schema";

export type AdminTripRow = {
  id: number;
  createdAt: Date;
  nickname: string;
  participantId: string;
  fromLabel: string;
  toLabel: string;
  floorsUp: number;
  floorsDown: number;
  points: number;
  capped: boolean;
  flagged: boolean;
  deleted: boolean;
};

/** Turer til moderasjon. Flaggede og slettede kommer med, så de kan vurderes. */
export async function getTripsForModeration(
  limit = 100,
  onlyFlagged = false,
): Promise<AdminTripRow[]> {
  const rows = await db.execute<{
    id: string;
    created_at: string;
    nickname: string;
    participant_id: string;
    from_label: string | null;
    to_label: string | null;
    from_floor: number;
    to_floor: number;
    floors_up: number;
    floors_down: number;
    points: string;
    capped: boolean;
    flagged: boolean;
    deleted_at: string | null;
  }>(sql`
    select
      t.id, t.created_at, t.from_floor, t.to_floor, t.floors_up, t.floors_down,
      t.points, t.capped, t.flagged, t.deleted_at,
      p.nickname, p.id as participant_id,
      ff.label as from_label, tf.label as to_label
    from trips t
    join participants p on p.id = t.participant_id
    -- Etasjenummer er unikt per lokasjon, ikke globalt. Uten location_id i
    -- koblingen treffer hver etasje én rad per bygg, og turen dupliseres.
    left join floors ff
      on ff.number = t.from_floor and ff.location_id = t.location_id
    left join floors tf
      on tf.number = t.to_floor and tf.location_id = t.location_id
    ${onlyFlagged ? sql`where t.flagged = true` : sql``}
    order by t.created_at desc
    limit ${limit}
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    createdAt: new Date(row.created_at),
    nickname: row.nickname,
    participantId: row.participant_id,
    fromLabel: row.from_label ?? `Nivå ${row.from_floor}`,
    toLabel: row.to_label ?? `Nivå ${row.to_floor}`,
    floorsUp: row.floors_up,
    floorsDown: row.floors_down,
    points: Number(row.points),
    capped: row.capped,
    flagged: row.flagged,
    deleted: row.deleted_at !== null,
  }));
}

export type AdminParticipantRow = {
  id: string;
  nickname: string;
  email: string;
  isBanned: boolean;
  createdAt: Date;
  trips: number;
  points: number;
  flagged: number;
};

/** Alle deltakere med nøkkeltall, mest aktive først. */
export async function getParticipantsForAdmin(): Promise<AdminParticipantRow[]> {
  const rows = await db.execute<{
    id: string;
    nickname: string;
    email: string;
    is_banned: boolean;
    created_at: string;
    trips: string;
    points: string;
    flagged: string;
  }>(sql`
    select
      p.id, p.nickname, p.email, p.is_banned, p.created_at,
      count(t.id) filter (where t.deleted_at is null) as trips,
      coalesce(sum(t.points) filter (where t.deleted_at is null), 0) as points,
      count(t.id) filter (where t.flagged and t.deleted_at is null) as flagged
    from participants p
    left join trips t on t.participant_id = p.id
    group by p.id, p.nickname, p.email, p.is_banned, p.created_at
    order by coalesce(sum(t.points) filter (where t.deleted_at is null), 0) desc,
             p.created_at asc
  `);

  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    isBanned: row.is_banned,
    createdAt: new Date(row.created_at),
    trips: Number(row.trips),
    points: Number(row.points),
    flagged: Number(row.flagged),
  }));
}

/** Alle etasjer, også de som er slått av. Laveste nivå først. */
export async function getAllFloors(): Promise<Floor[]> {
  return db.select().from(floors).orderBy(asc(floors.number));
}

export async function getAdminSummary(): Promise<{
  participants: number;
  trips: number;
  flagged: number;
  floors: number;
}> {
  const rows = await db.execute<{
    participants: string;
    trips: string;
    flagged: string;
    floors: string;
  }>(sql`
    select
      (select count(*) from participants) as participants,
      (select count(*) from trips where deleted_at is null) as trips,
      (select count(*) from trips where flagged and deleted_at is null) as flagged,
      (select count(*) from floors where is_active) as floors
  `);

  return {
    participants: Number(rows[0]?.participants ?? 0),
    trips: Number(rows[0]?.trips ?? 0),
    flagged: Number(rows[0]?.flagged ?? 0),
    floors: Number(rows[0]?.floors ?? 0),
  };
}
