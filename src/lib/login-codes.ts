import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { loginCodes } from "@/lib/db/schema";

/** Hvor lenge en kode er gyldig. Kort nok til å begrense skade, langt nok til å rekke innboksen. */
const TTL_MINUTES = 10;
/** Gjetteforsøk per kode før den forkastes. */
const MAX_ATTEMPTS = 5;
/** Koder én adresse kan be om per time. */
const MAX_PER_HOUR = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Domenet ansatte må ha. Tom verdi slår av begrensningen. */
function allowedDomain(): string {
  return (process.env.ALLOWED_EMAIL_DOMAIN ?? "boitano.no").trim().toLowerCase();
}

export type EmailCheck = { ok: true; email: string } | { ok: false; message: string };

export function validateEmail(raw: string): EmailCheck {
  const email = normalizeEmail(raw);

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Skriv inn en gyldig e-postadresse." };
  }

  const domain = allowedDomain();
  if (domain && !email.endsWith(`@${domain}`)) {
    return { ok: false, message: `Bruk jobbadressen din på @${domain}.` };
  }

  return { ok: true, email };
}

/**
 * Hashen er en HMAC med appens hemmelighet, ikke en ren SHA. En sekssifret kode
 * har bare en million varianter, så uten hemmelighet ville en lekket tabell
 * kunne knekkes på sekunder.
 */
function hashCode(email: string, code: string): string {
  const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET eller ADMIN_SECRET mangler (se .env.example).");
  }
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type CreateResult =
  | { ok: true; code: string }
  | { ok: false; message: string };

/**
 * Lager en ny kode og ugyldiggjør tidligere ubrukte koder for adressen, slik at
 * bare den nyeste virker. Returnerer koden – kalleren sender den.
 */
export async function createLoginCode(email: string): Promise<CreateResult> {
  const recent = await db
    .select({ count: sql<string>`count(*)` })
    .from(loginCodes)
    .where(
      and(
        sql`lower(${loginCodes.email}) = ${email}`,
        gt(loginCodes.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    );

  if (Number(recent[0]?.count ?? 0) >= MAX_PER_HOUR) {
    return {
      ok: false,
      message: "Du har bedt om for mange koder. Vent en time og prøv igjen.",
    };
  }

  const code = generateCode();

  await db.transaction(async (tx) => {
    await tx
      .update(loginCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(sql`lower(${loginCodes.email}) = ${email}`, isNull(loginCodes.consumedAt)),
      );

    await tx.insert(loginCodes).values({
      email,
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000),
    });
  });

  return { ok: true, code };
}

export type VerifyResult = { ok: true } | { ok: false; message: string };

/** Sjekker koden og bruker den opp. Samme kode kan aldri brukes to ganger. */
export async function verifyLoginCode(
  email: string,
  candidate: string,
): Promise<VerifyResult> {
  const code = candidate.trim().replace(/\s+/g, "");

  const rows = await db
    .select()
    .from(loginCodes)
    .where(
      and(sql`lower(${loginCodes.email}) = ${email}`, isNull(loginCodes.consumedAt)),
    )
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { ok: false, message: "Koden er ikke gyldig. Be om en ny." };
  }

  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Koden er utløpt. Be om en ny." };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    // Kvoten er brukt opp. Forkast koden så den ikke kan gjettes videre.
    await db
      .update(loginCodes)
      .set({ consumedAt: new Date() })
      .where(eq(loginCodes.id, row.id));
    return { ok: false, message: "For mange forsøk. Be om en ny kode." };
  }

  await db
    .update(loginCodes)
    .set({ attempts: row.attempts + 1 })
    .where(eq(loginCodes.id, row.id));

  const expected = Buffer.from(row.codeHash);
  const actual = Buffer.from(hashCode(email, code));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, message: "Feil kode. Prøv igjen." };
  }

  await db
    .update(loginCodes)
    .set({ consumedAt: new Date() })
    .where(eq(loginCodes.id, row.id));

  return { ok: true };
}
