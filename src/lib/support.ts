import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { supportReports, type SupportReport } from "@/lib/db/schema";
import { SUPPORT_MESSAGE_MAX } from "@/lib/format";

/** Meldinger fra samme avsender per time. */
const MAX_PER_HOUR = 5;

/**
 * Tak på meldinger til sammen per time. Skjemaet er åpent uten innlogging, og
 * anonyme meldinger uten adresse har ingen avsender å telle på – uten et
 * samlet tak kan supportinnboksen oversvømmes.
 */
const MAX_TOTALT_PER_TIME = 30;
/** Hvor lenge rapportene beholdes. Står også i personvernerklæringen. */
const RETENTION_DAYS = 90;

export type ReportInput = {
  message: string;
  contactEmail: string | null;
  participantId: string | null;
  fromPage: string | null;
  userAgent: string | null;
  serviceWorker: boolean | null;
  appVersion: string | null;
};

export type ReportResult = { ok: true } | { ok: false; message: string };

/** Versjonen appen kjører. Avslører om noen sitter på noe utdatert fra cachen. */
export function appVersion(): string {
  return process.env.VERCEL_DEPLOYMENT_ID ?? "lokal";
}

export function validateMessage(raw: string): ReportResult {
  const message = raw.trim();
  if (message.length < 5) {
    return { ok: false, message: "Skriv litt om hva som skjedde." };
  }
  if (message.length > SUPPORT_MESSAGE_MAX) {
    return { ok: false, message: `Meldingen kan ha maks ${SUPPORT_MESSAGE_MAX} tegn.` };
  }
  return { ok: true };
}

/**
 * Teller meldinger den siste timen fra samme deltaker eller e-post. Uten
 * identitet finnes ingen god nøkkel å telle på – der er lengdegrensen og
 * admin-opprydding det vi har.
 */
async function tooMany(
  participantId: string | null,
  contactEmail: string | null,
): Promise<boolean> {
  if (!participantId && !contactEmail) return false;

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<string>`count(*)` })
    .from(supportReports)
    .where(
      and(
        gt(supportReports.createdAt, since),
        participantId
          ? eq(supportReports.participantId, participantId)
          : sql`lower(${supportReports.contactEmail}) = ${contactEmail}`,
      ),
    );

  return Number(rows[0]?.count ?? 0) >= MAX_PER_HOUR;
}

export async function createReport(input: ReportInput): Promise<ReportResult> {
  const check = validateMessage(input.message);
  if (!check.ok) return check;

  if (await tooMany(input.participantId, input.contactEmail)) {
    return {
      ok: false,
      message: "Du har sendt flere meldinger nå nettopp. Vent litt og prøv igjen.",
    };
  }

  const siste = await db
    .select({ count: sql<string>`count(*)` })
    .from(supportReports)
    .where(gt(supportReports.createdAt, new Date(Date.now() - 60 * 60 * 1000)));

  if (Number(siste[0]?.count ?? 0) >= MAX_TOTALT_PER_TIME) {
    console.warn("[TrappApp] Globalt tak for supportmeldinger nådd.");
    return {
      ok: false,
      message:
        "Vi mottar uvanlig mange meldinger akkurat nå. Prøv igjen om en liten stund.",
    };
  }

  // Rydder gamle rapporter underveis, som for innloggingskodene.
  await db
    .delete(supportReports)
    .where(
      lt(
        supportReports.createdAt,
        new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000),
      ),
    );

  await db.insert(supportReports).values({
    message: input.message.trim(),
    contactEmail: input.contactEmail,
    participantId: input.participantId,
    fromPage: input.fromPage?.slice(0, 200) ?? null,
    userAgent: input.userAgent?.slice(0, 300) ?? null,
    serviceWorker: input.serviceWorker,
    appVersion: input.appVersion,
  });

  return { ok: true };
}

export type AdminReport = SupportReport & { nickname: string | null };

/** Uhåndterte først, deretter nyeste. */
export async function getReportsForAdmin(): Promise<AdminReport[]> {
  const rows = await db.execute<{
    id: number;
    message: string;
    contact_email: string | null;
    participant_id: string | null;
    from_page: string | null;
    user_agent: string | null;
    service_worker: boolean | null;
    app_version: string | null;
    handled_at: string | null;
    created_at: string;
    nickname: string | null;
  }>(sql`
    select r.*, p.nickname
    from support_reports r
    left join participants p on p.id = r.participant_id
    order by r.handled_at nulls first, r.created_at desc
    limit 200
  `);

  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    contactEmail: row.contact_email,
    participantId: row.participant_id,
    fromPage: row.from_page,
    userAgent: row.user_agent,
    serviceWorker: row.service_worker,
    appVersion: row.app_version,
    handledAt: row.handled_at ? new Date(row.handled_at) : null,
    createdAt: new Date(row.created_at),
    nickname: row.nickname,
  }));
}

export async function setReportHandled(
  id: number,
  handled: boolean,
): Promise<void> {
  await db
    .update(supportReports)
    .set({ handledAt: handled ? new Date() : null })
    .where(eq(supportReports.id, id));
}

export async function countOpenReports(): Promise<number> {
  const rows = await db
    .select({ count: sql<string>`count(*)` })
    .from(supportReports)
    .where(isNull(supportReports.handledAt));
  return Number(rows[0]?.count ?? 0);
}
