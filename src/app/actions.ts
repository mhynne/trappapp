"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import {
  getCurrentParticipant,
  getDeviceToken,
  nicknameIsTaken,
  validateNickname,
} from "@/lib/identity";
import { getFloorByToken, registerTrip, type RegisterResult } from "@/lib/trips";
import { DEVICE_COOKIE } from "@/middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ChooseNicknameResult =
  | { ok: true; nickname: string }
  | { ok: false; message: string };

/** Oppretter deltakeren som hører til denne enheten. */
export async function chooseNickname(
  raw: string,
): Promise<ChooseNicknameResult> {
  const deviceToken = await getDeviceToken();
  if (!deviceToken) {
    return {
      ok: false,
      message: "Fant ikke enheten din. Prøv å laste siden på nytt.",
    };
  }

  const check = validateNickname(raw);
  if (!check.ok) return check;

  const existing = await getCurrentParticipant();
  if (existing) {
    return { ok: true, nickname: existing.nickname };
  }

  if (await nicknameIsTaken(check.nickname)) {
    return { ok: false, message: "Kallenavnet er opptatt. Prøv et annet." };
  }

  try {
    await db
      .insert(participants)
      .values({ deviceToken, nickname: check.nickname });
  } catch {
    // Innsettingen kan feile på to unike felt: kallenavnet eller enhets-IDen.
    // To parallelle forespørsler fra samme enhet må ikke få «navnet er opptatt».
    const mine = await getCurrentParticipant();
    if (mine) {
      return { ok: true, nickname: mine.nickname };
    }
    return { ok: false, message: "Kallenavnet er opptatt. Prøv et annet." };
  }

  revalidatePath("/", "layout");
  return { ok: true, nickname: check.nickname };
}

/** Registrerer en trappetur fra skanne-siden. */
export async function registerTripAction(
  qrToken: string,
  fromFloor: number,
): Promise<RegisterResult> {
  const participant = await getCurrentParticipant();
  if (!participant) {
    return {
      ok: false,
      code: "no_participant",
      message: "Velg et kallenavn før du registrerer.",
    };
  }

  const scannedFloor = await getFloorByToken(qrToken);
  if (!scannedFloor) {
    return { ok: false, code: "unknown_floor", message: "Ukjent QR-kode." };
  }

  const result = await registerTrip({ participant, scannedFloor, fromFloor });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/resultater");
    revalidatePath("/meg");
  }

  return result;
}

/**
 * Gjenoppretter identiteten hvis informasjonskapselen er borte, men enhets-IDen
 * fortsatt ligger i localStorage. Overtar aldri en identitet som allerede er i
 * bruk på denne enheten.
 */
export async function restoreIdentity(
  storedToken: string,
): Promise<{ restored: boolean }> {
  if (!UUID_RE.test(storedToken)) return { restored: false };

  const current = await getCurrentParticipant();
  if (current) return { restored: false };

  const rows = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.deviceToken, storedToken))
    .limit(1);

  if (rows.length === 0) return { restored: false };

  const store = await cookies();
  store.set(DEVICE_COOKIE, storedToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });

  revalidatePath("/", "layout");
  return { restored: true };
}

/** Sletter deltakeren og alle turene (turene forsvinner via ON DELETE CASCADE). */
export async function deleteMyData(): Promise<{ ok: boolean }> {
  const participant = await getCurrentParticipant();
  if (!participant) return { ok: false };

  await db.delete(participants).where(eq(participants.id, participant.id));

  revalidatePath("/", "layout");
  return { ok: true };
}
