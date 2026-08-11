import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { participants, type Participant } from "@/lib/db/schema";
import { DEVICE_COOKIE } from "@/middleware";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/** Enhets-IDen fra informasjonskapselen (settes av middleware). */
export async function getDeviceToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

/** Deltakeren som hører til denne enheten, eller null hvis kallenavn ikke er valgt. */
export async function getCurrentParticipant(): Promise<Participant | null> {
  const token = await getDeviceToken();
  if (!token) return null;

  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.deviceToken, token))
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
