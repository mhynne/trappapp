import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "trapp_admin";

/**
 * Admin er ett delt passord – ikke brukerkontoer. Informasjonskapselen
 * inneholder en HMAC, så den kan ikke gjettes uten å kjenne ADMIN_SECRET.
 */
function expectedToken(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET mangler (se .env.example).");
  }
  return createHmac("sha256", secret).update("admin-v1").digest("hex");
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
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return false;

  const expected = expectedToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
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
  store.set(ADMIN_COOKIE, expectedToken(), {
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
