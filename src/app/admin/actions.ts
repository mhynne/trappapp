"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import {
  clearAdminCookie,
  isAdmin,
  passwordIsCorrect,
  setAdminCookie,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  activityPeriods,
  floors,
  locations,
  participants,
  trips,
} from "@/lib/db/schema";
import { DELTAKER_TAG, validateNickname } from "@/lib/identity";
import {
  BYGG_TAG,
  locationNameIsTaken,
  validateLocationName,
} from "@/lib/locations";
import { PERIODS_TAG } from "@/lib/periods";
import { setReportHandled } from "@/lib/support";
import { osloDateStringToUtc } from "@/lib/timezone";
import { generateQrToken } from "@/lib/tokens";

type Result = { ok: boolean; message?: string };

async function guard(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Ikke innlogget som administrator.");
  }
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/resultater");
  // De offentlige sidene leser perioden fra cache. Uten dette ville en endring
  // her tatt opptil et minutt før den ble synlig for de ansatte.
  revalidateTag(PERIODS_TAG);
  // Etasjer, bygg og deltakere leses nå fra cache på de offentlige sidene.
  // Uten dette ville en endring her tatt opptil fem minutter å slå gjennom.
  revalidateTag(BYGG_TAG);
  revalidateTag(DELTAKER_TAG);
}

/* ------------------------------------------------------------- innlogging */

export async function login(password: string): Promise<Result> {
  if (!passwordIsCorrect(password)) {
    return { ok: false, message: "Feil passord." };
  }
  await setAdminCookie();
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function logout(): Promise<void> {
  await clearAdminCookie();
  revalidatePath("/admin", "layout");
}

/* ---------------------------------------------------------------- perioder */

export async function savePeriod(input: {
  id?: number;
  name: string;
  startDate: string; // "2026-08-01" (norsk dato)
  endDate: string; // "2026-08-31" – siste dag som teller med
  pointsUp: string;
  pointsDown: string;
  dailyPointsCap: string;
}): Promise<Result> {
  await guard();

  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, message: "Gi perioden et navn." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) {
    return { ok: false, message: "Ugyldige datoer." };
  }

  const startsAt = osloDateStringToUtc(input.startDate);
  const endsAt = osloDateStringToUtc(input.endDate, true);

  if (endsAt <= startsAt) {
    return { ok: false, message: "Sluttdatoen må være etter startdatoen." };
  }

  const numbers = {
    pointsUp: Number(input.pointsUp.replace(",", ".")),
    pointsDown: Number(input.pointsDown.replace(",", ".")),
    dailyPointsCap: Number(input.dailyPointsCap.replace(",", ".")),
  };

  if (
    !Number.isFinite(numbers.pointsUp) ||
    !Number.isFinite(numbers.pointsDown) ||
    !Number.isFinite(numbers.dailyPointsCap) ||
    numbers.pointsUp < 0 ||
    numbers.pointsDown < 0 ||
    numbers.dailyPointsCap <= 0
  ) {
    return { ok: false, message: "Poengverdiene må være positive tall." };
  }

  const values = {
    name,
    startsAt,
    endsAt,
    pointsUp: numbers.pointsUp.toFixed(2),
    pointsDown: numbers.pointsDown.toFixed(2),
    dailyPointsCap: numbers.dailyPointsCap.toFixed(2),
  };

  if (input.id) {
    await db
      .update(activityPeriods)
      .set(values)
      .where(eq(activityPeriods.id, input.id));
  } else {
    await db.insert(activityPeriods).values(values);
  }

  refreshAdmin();
  return { ok: true };
}

export async function deletePeriod(id: number): Promise<Result> {
  await guard();
  await db.delete(activityPeriods).where(eq(activityPeriods.id, id));
  refreshAdmin();
  return { ok: true };
}

/* --------------------------------------------------------------- lokasjoner */

export async function saveLocation(input: {
  id?: number;
  name: string;
}): Promise<Result> {
  await guard();

  const check = validateLocationName(input.name);
  if (!check.ok) return check;

  if (await locationNameIsTaken(check.name, input.id)) {
    return { ok: false, message: "Det finnes allerede en lokasjon med det navnet." };
  }

  if (input.id) {
    await db
      .update(locations)
      .set({ name: check.name })
      .where(eq(locations.id, input.id));
  } else {
    await db.insert(locations).values({ name: check.name });
  }

  refreshAdmin();
  return { ok: true };
}

/**
 * Slås en lokasjon av, slutter plakatene der å virke. Turene som alt er
 * registrert blir stående – derfor ingen sletting her.
 */
export async function setLocationActive(
  id: number,
  isActive: boolean,
): Promise<Result> {
  await guard();
  await db.update(locations).set({ isActive }).where(eq(locations.id, id));
  refreshAdmin();
  return { ok: true };
}

/* ----------------------------------------------------------------- etasjer */

export async function saveFloor(input: {
  id?: number;
  locationId: number;
  number: string;
  label: string;
}): Promise<Result> {
  await guard();

  const level = Number(input.number);
  if (!Number.isInteger(level)) {
    return { ok: false, message: "Nivået må være et heltall." };
  }

  const label = input.label.trim();
  if (label.length < 1) {
    return { ok: false, message: "Gi etasjen et navn." };
  }

  try {
    if (input.id) {
      await db
        .update(floors)
        .set({ number: level, label })
        .where(eq(floors.id, input.id));
    } else {
      await db.insert(floors).values({
        locationId: input.locationId,
        number: level,
        label,
        qrToken: generateQrToken(),
      });
    }
  } catch {
    return {
      ok: false,
      message: `Nivå ${level} finnes allerede i denne lokasjonen.`,
    };
  }

  refreshAdmin();
  return { ok: true };
}

export async function setFloorActive(
  id: number,
  isActive: boolean,
): Promise<Result> {
  await guard();
  await db.update(floors).set({ isActive }).where(eq(floors.id, id));
  refreshAdmin();
  return { ok: true };
}

/**
 * Lager en ny QR-token. Gamle plakater slutter å virke umiddelbart, så dette
 * skal bare brukes hvis en token har lekket.
 */
export async function regenerateQrToken(id: number): Promise<Result> {
  await guard();
  await db
    .update(floors)
    .set({ qrToken: generateQrToken() })
    .where(eq(floors.id, id));
  refreshAdmin();
  return { ok: true };
}

/* -------------------------------------------------------------- moderasjon */

export async function softDeleteTrip(id: number): Promise<Result> {
  await guard();
  await db
    .update(trips)
    .set({ deletedAt: new Date() })
    .where(eq(trips.id, id));
  refreshAdmin();
  return { ok: true };
}

export async function restoreTrip(id: number): Promise<Result> {
  await guard();
  await db.update(trips).set({ deletedAt: null }).where(eq(trips.id, id));
  refreshAdmin();
  return { ok: true };
}

export async function setParticipantBanned(
  id: string,
  isBanned: boolean,
): Promise<Result> {
  await guard();
  await db.update(participants).set({ isBanned }).where(eq(participants.id, id));
  refreshAdmin();
  return { ok: true };
}

export async function renameParticipant(
  id: string,
  nickname: string,
): Promise<Result> {
  await guard();

  const check = validateNickname(nickname);
  if (!check.ok) return { ok: false, message: check.message };

  const clash = await db
    .select({ id: participants.id })
    .from(participants)
    .where(sql`lower(${participants.nickname}) = lower(${check.nickname}) and ${participants.id} <> ${id}`)
    .limit(1);

  if (clash.length > 0) {
    return { ok: false, message: "Kallenavnet er opptatt." };
  }

  await db
    .update(participants)
    .set({ nickname: check.nickname })
    .where(eq(participants.id, id));

  refreshAdmin();
  return { ok: true };
}

export async function deleteParticipant(id: string): Promise<Result> {
  await guard();
  await db.delete(participants).where(eq(participants.id, id));
  refreshAdmin();
  return { ok: true };
}

/* ----------------------------------------------------------------- support */

export async function markSupportHandled(
  id: number,
  handled: boolean,
): Promise<Result> {
  await guard();
  await setReportHandled(id, handled);
  refreshAdmin();
  return { ok: true };
}
