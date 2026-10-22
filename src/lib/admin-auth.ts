import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "trapp_admin";

/**
 * Admin er ett delt passord – ikke brukerkontoer. Informasjonskapselen
 * inneholder en HMAC, så den kan ikke gjettes uten å kjenne ADMIN_SECRET.
 */
/** Hvor lenge en innlogging varer. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.ADMIN_SECRET;
  if (!value) {
    throw new Error("ADMIN_SECRET mangler (se .env.example).");
  }
  return value;
}

/**
 * Avtrykk av passordet, slik at kapselen slutter å gjelde når passordet
 * byttes. Uten dette fortsatte alle innloggede som admin etter et
 * passordbytte, og eneste måte å stenge noen ute var å bytte ADMIN_SECRET.
 */
function passordavtrykk(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error("ADMIN_PASSWORD mangler (se .env.example).");
  }
  return createHash("sha256").update(pw).digest("hex").slice(0, 16);
}

function signatur(utstedt: number): string {
  return createHmac("sha256", secret())
    .update(`admin-v2:${passordavtrykk()}:${utstedt}`)
    .digest("hex");
}

export function passwordIsCorrect(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD mangler (se .env.example).");
  }

  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;

  const skille = raw.indexOf(".");
  if (skille <= 0) return false;

  const utstedt = Number(raw.slice(0, skille));
  if (!Number.isFinite(utstedt)) return false;

  // Kontrolleres på serveren, ikke bare via kapselens maxAge.
  const alder = Date.now() - utstedt;
  if (alder < 0 || alder > MAX_AGE_MS) return false;

  const a = Buffer.from(raw.slice(skille + 1));
  const b = Buffer.from(signatur(utstedt));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Brukes øverst i alle admin-sider utenom innloggingen. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/admin");
  }
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  const utstedt = Date.now();
  store.set(ADMIN_COOKIE, `${utstedt}.${signatur(utstedt)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
