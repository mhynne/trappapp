import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "trapp_session";

/** Ett år. Folk skal logge inn én gang per enhet, ikke én gang i uka. */
const MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Sesjonen er deltaker-IDen pluss en signatur, ikke en oppslagsnøkkel i
 * databasen. Det sparer et søk på hver forespørsel, og kapselen kan ikke
 * forfalskes uten hemmeligheten.
 *
 * SESSION_SECRET er valgfri: uten den brukes ADMIN_SECRET med en egen etikett,
 * slik at en sesjonskapsel aldri kan gjenbrukes som admin-kapsel.
 */
function secret(): string {
  const value = process.env.SESSION_SECRET ?? process.env.ADMIN_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET eller ADMIN_SECRET mangler (se .env.example).");
  }
  return value;
}

function signatureFor(participantId: string): string {
  return createHmac("sha256", secret())
    .update(`session-v1:${participantId}`)
    .digest("hex");
}

function equal(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function setSession(participantId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, `${participantId}.${signatureFor(participantId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Deltaker-IDen fra en gyldig sesjon, eller null. */
export async function getSessionParticipantId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  const participantId = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  return equal(signature, signatureFor(participantId)) ? participantId : null;
}

/* ------------------------------------------------- e-post under registrering */

export const PENDING_COOKIE = "trapp_pending";

/** Kort – dette er bare vinduet mellom bekreftet kode og valgt kallenavn. */
const PENDING_MAX_AGE = 15 * 60;

function pendingSignatureFor(email: string): string {
  return createHmac("sha256", secret()).update(`pending-v1:${email}`).digest("hex");
}

/**
 * Holder på en e-post som er bekreftet med kode, men som ennå ikke har en
 * deltaker. Signert, så den kan ikke settes av klienten for å hoppe over koden.
 */
export async function setPendingEmail(email: string): Promise<void> {
  const store = await cookies();
  const encoded = Buffer.from(email).toString("base64url");
  store.set(PENDING_COOKIE, `${encoded}.${pendingSignatureFor(email)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_MAX_AGE,
  });
}

export async function getPendingEmail(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(PENDING_COOKIE)?.value;
  if (!raw) return null;

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  let email: string;
  try {
    email = Buffer.from(raw.slice(0, separator), "base64url").toString("utf8");
  } catch {
    return null;
  }

  return equal(raw.slice(separator + 1), pendingSignatureFor(email)) ? email : null;
}

export async function clearPendingEmail(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}
