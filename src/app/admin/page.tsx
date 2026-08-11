import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminSummary } from "@/lib/admin-data";
import { daysLeft, formatDateRange, formatPoints } from "@/lib/format";
import { getActivePeriod, rulesFor } from "@/lib/periods";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const [summary, period] = await Promise.all([
    getAdminSummary(),
    getActivePeriod(),
  ]);

  return (
    <AdminShell active="oversikt">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Oversikt</h1>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Deltakere" value={String(summary.participants)} />
          <Stat label="Turer" value={String(summary.trips)} />
          <Stat label="Flagget" value={String(summary.flagged)} />
          <Stat label="Aktive etasjer" value={String(summary.floors)} />
        </div>

        {summary.flagged > 0 && (
          <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {summary.flagged} {summary.flagged === 1 ? "tur er" : "turer er"}
            {" "}flagget for gjennomgang.{" "}
            <Link
              href="/admin/moderasjon?flagget=1"
              className="font-medium underline underline-offset-2"
            >
              Se dem
            </Link>
          </p>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Aktiv periode</h2>
          {period ? (
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-base font-medium">{period.name}</p>
              <p className="text-muted">
                {formatDateRange(period.startsAt, period.endsAt)} ·{" "}
                {daysLeft(period.endsAt)} dager igjen
              </p>
              <p className="text-muted">
                Opp {formatPoints(rulesFor(period).pointsUp)} poeng/etasje · ned{" "}
                {formatPoints(rulesFor(period).pointsDown)} · dagstak{" "}
                {formatPoints(rulesFor(period).dailyPointsCap)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Ingen periode pågår nå. Turer blir registrert, men gir ikke poeng.{" "}
              <Link
                href="/admin/perioder"
                className="font-medium underline underline-offset-2"
              >
                Opprett en periode
              </Link>
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Kom i gang</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>
              Sjekk at{" "}
              <Link href="/admin/etasjer" className="underline underline-offset-2">
                etasjene
              </Link>{" "}
              stemmer med bygget.
            </li>
            <li>
              Opprett en{" "}
              <Link href="/admin/perioder" className="underline underline-offset-2">
                aktivitetsperiode
              </Link>{" "}
              med poengregler.
            </li>
            <li>
              Skriv ut{" "}
              <Link href="/admin/plakater" className="underline underline-offset-2">
                QR-plakatene
              </Link>{" "}
              og heng dem opp i trappeoppgangen.
            </li>
          </ol>
        </section>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
