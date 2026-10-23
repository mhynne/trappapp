import { eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { participants, type Participant } from "@/lib/db/schema";
import { getSessionParticipantId } from "@/lib/session";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/** Invalideres fra admin når en deltaker endres eller utestenges. */
export const DELTAKER_TAG = "deltakere";

/** unstable_cache lagrer som JSON, så Date-felt kommer tilbake som tekst. */
function reviveParticipant(row: Participant): Participant {
  return { ...row, createdAt: new Date(row.createdAt) };
}

/**
 * Selve oppslaget, nøklet på deltaker-ID. Sesjonen leses utenfor, fordi en
 * mellomlagret funksjon ikke kan lese informasjonskapsler.
 *
 * Raden endrer seg sjelden – ved navnebytte eller utestengelse – men slås opp
 * på hver eneste sidevisning i hele appen. Det var den vanligste spørringen
 * mot databasen.
 */
const loadParticipant = unstable_cache(
  async (id: string): Promise<Participant | null> => {
    const rows = await db
      .select()
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  ["deltaker"],
  { revalidate: 60, tags: [DELTAKER_TAG] },
);

/** Deltakeren som er logget inn på denne enheten, eller null. */
export async function getCurrentParticipant(): Promise<Participant | null> {
  const id = await getSessionParticipantId();
  if (!id) return null;

  const row = await loadParticipant(id);
  return row ? reviveParticipant(row) : null;
}

/** Deltakeren som eier e-postadressen. Adressen må være normalisert. */
export async function findParticipantByEmail(
  email: string,
): Promise<Participant | null> {
  const rows = await db
    .select()
    .from(participants)
    .where(sql`lower(${participants.email}) = ${email}`)
    .limit(1);

  return rows[0] ?? null;
}

export type NicknameCheck =
  | { ok: true; nickname: string }
  | { ok: false; message: string };

/** Trimmer og validerer et kallenavn før det lagres. */
export function validateNickname(raw: string): NicknameCheck {
  const nickname = raw.trim().replace(/\s+/g, " ");

  if (nickname.length < NICKNAME_MIN) {
    return { ok: false, message: `Kallenavnet må ha minst ${NICKNAME_MIN} tegn.` };
  }
  if (nickname.length > NICKNAME_MAX) {
    return { ok: false, message: `Kallenavnet kan ha maks ${NICKNAME_MAX} tegn.` };
  }
  if (!/^[\p{L}\p{N} .!?_-]+$/u.test(nickname)) {
    return {
      ok: false,
      message: "Bruk bokstaver, tall, mellomrom og enkle tegn som - eller _.",
    };
  }

  return { ok: true, nickname };
}

/** Finnes kallenavnet fra før? Sammenlikning ignorerer store/små bokstaver. */
export async function nicknameIsTaken(nickname: string): Promise<boolean> {
  const rows = await db
    .select({ id: participants.id })
    .from(participants)
    .where(sql`lower(${participants.nickname}) = lower(${nickname})`)
    .limit(1);
  return rows.length > 0;
}
