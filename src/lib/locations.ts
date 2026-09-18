import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { locations, type Location } from "@/lib/db/schema";

export const LOCATION_NAME_MAX = 40;

export async function getAllLocations(): Promise<Location[]> {
  return db.select().from(locations).orderBy(asc(locations.name));
}

export async function getActiveLocations(): Promise<Location[]> {
  return db
    .select()
    .from(locations)
    .where(eq(locations.isActive, true))
    .orderBy(asc(locations.name));
}

export async function getLocationById(id: number): Promise<Location | null> {
  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export type LocationCheck =
  | { ok: true; name: string }
  | { ok: false; message: string };

export function validateLocationName(raw: string): LocationCheck {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) {
    return { ok: false, message: "Gi lokasjonen et navn." };
  }
  if (name.length > LOCATION_NAME_MAX) {
    return {
      ok: false,
      message: `Navnet kan ha maks ${LOCATION_NAME_MAX} tegn.`,
    };
  }
  return { ok: true, name };
}

/** Finnes navnet fra før? Sammenlikning ignorerer store/små bokstaver. */
export async function locationNameIsTaken(
  name: string,
  exceptId?: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: locations.id })
    .from(locations)
    .where(sql`lower(${locations.name}) = lower(${name})`);
  return rows.some((row) => row.id !== exceptId);
}
