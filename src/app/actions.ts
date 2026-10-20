"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { sendLoginCode, sendSupportNotification } from "@/lib/email";
import {
  findParticipantByEmail,
  getCurrentParticipant,
  nicknameIsTaken,
  validateNickname,
} from "@/lib/identity";
import {
  createLoginCode,
  validateEmail,
  verifyLoginCode,
} from "@/lib/login-codes";
import {
  clearPendingEmail,
  clearSession,
  getPendingEmail,
  setPendingEmail,
  setSession,
} from "@/lib/session";
import { appVersion, createReport } from "@/lib/support";
import { getFloorByToken, registerTrip, type RegisterResult } from "@/lib/trips";

export type ActionResult = { ok: true } | { ok: false; message: string };

/* ----------------------------------------------------------- innlogging */

/** Steg 1: sender en engangskode til adressen brukeren oppgir. */
export async function requestLoginCode(rawEmail: string): Promise<ActionResult> {
  const check = validateEmail(rawEmail);
  if (!check.ok) return check;

  const created = await createLoginCode(check.email);
  if (!created.ok) return created;

  const sent = await sendLoginCode(check.email, created.code);
  if (!sent.ok) return sent;

  return { ok: true };
}

export type SubmitCodeResult =
  | { ok: true; needsNickname: false; nickname: string }
  | { ok: true; needsNickname: true }
  | { ok: false; message: string };

/**
 * Steg 2: sjekker koden. Kjenner vi adressen fra før, er brukeren logget inn.
 * Ellers holdes den bekreftede adressen i en signert kapsel til kallenavnet er valgt.
 */
export async function submitLoginCode(
  rawEmail: string,
  code: string,
): Promise<SubmitCodeResult> {
  const check = validateEmail(rawEmail);
  if (!check.ok) return check;

  const verified = await verifyLoginCode(check.email, code);
  if (!verified.ok) return verified;

  const existing = await findParticipantByEmail(check.email);
  if (existing) {
    await setSession(existing.id);
    await clearPendingEmail();
    revalidatePath("/", "layout");
    return { ok: true, needsNickname: false, nickname: existing.nickname };
  }

  await setPendingEmail(check.email);
  return { ok: true, needsNickname: true };
}

export type SignupResult =
  | { ok: true; nickname: string }
  | { ok: false; message: string };

/** Steg 3, bare for nye: oppretter deltakeren med det valgte kallenavnet. */
export async function completeSignup(raw: string): Promise<SignupResult> {
  const email = await getPendingEmail();
  if (!email) {
    return { ok: false, message: "Bekreftelsen er utløpt. Logg inn på nytt." };
  }

  const check = validateNickname(raw);
  if (!check.ok) return check;

  // Kan ha blitt opprettet i mellomtiden, f.eks. i en annen fane.
  const existing = await findParticipantByEmail(email);
  if (existing) {
    await setSession(existing.id);
    await clearPendingEmail();
    revalidatePath("/", "layout");
    return { ok: true, nickname: existing.nickname };
  }

  if (await nicknameIsTaken(check.nickname)) {
    return { ok: false, message: "Kallenavnet er opptatt. Prøv et annet." };
  }

  let created;
  try {
    const rows = await db
      .insert(participants)
      .values({ email, nickname: check.nickname })
      .returning({ id: participants.id });
    created = rows[0];
  } catch {
    // To unike felt kan kollidere: e-post (dobbeltklikk) eller kallenavn.
    const mine = await findParticipantByEmail(email);
    if (mine) {
      await setSession(mine.id);
      await clearPendingEmail();
      revalidatePath("/", "layout");
      return { ok: true, nickname: mine.nickname };
    }
    return { ok: false, message: "Kallenavnet er opptatt. Prøv et annet." };
  }

  if (!created) {
    return { ok: false, message: "Klarte ikke å opprette deltakeren. Prøv igjen." };
  }

  await setSession(created.id);
  await clearPendingEmail();
  revalidatePath("/", "layout");
  return { ok: true, nickname: check.nickname };
}

export async function logout(): Promise<void> {
  await clearSession();
  await clearPendingEmail();
  revalidatePath("/", "layout");
}

/* --------------------------------------------------------- registrering */

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
      message: "Logg inn før du registrerer.",
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

/** Sletter deltakeren og alle turene (turene forsvinner via ON DELETE CASCADE). */
export async function deleteMyData(): Promise<{ ok: boolean }> {
  const participant = await getCurrentParticipant();
  if (!participant) return { ok: false };

  await db.delete(participants).where(eq(participants.id, participant.id));
  await clearSession();
  await clearPendingEmail();

  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------- support */

/**
 * Tar imot en melding om et problem. Virker uten innlogging, siden den
 * vanligste meldingen er at man ikke kommer inn.
 */
export async function submitSupportReport(input: {
  message: string;
  contactEmail: string;
  fromPage: string;
  serviceWorker: boolean | null;
}): Promise<ActionResult> {
  const participant = await getCurrentParticipant();

  // Innlogget: vi kjenner adressen fra før og dobbeltlagrer den ikke, slik at
  // "slett mine data" også fjerner den fra rapporten.
  const contactEmail = participant
    ? null
    : (() => {
        const check = validateEmail(input.contactEmail);
        return check.ok ? check.email : null;
      })();

  const store = await headers();

  const result = await createReport({
    message: input.message,
    contactEmail,
    participantId: participant?.id ?? null,
    fromPage: input.fromPage || null,
    userAgent: store.get("user-agent"),
    serviceWorker: input.serviceWorker,
    appVersion: appVersion(),
  });

  if (!result.ok) return result;

  await sendSupportNotification({
    message: input.message.trim(),
    from: participant
      ? `${participant.nickname} (${participant.email})`
      : (contactEmail ?? "ikke innlogget, ingen adresse oppgitt"),
    fromPage: input.fromPage || null,
    userAgent: store.get("user-agent"),
    serviceWorker: input.serviceWorker,
    appVersion: appVersion(),
  });

  return { ok: true };
}
