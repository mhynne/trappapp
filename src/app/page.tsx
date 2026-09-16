import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { LoginCard } from "@/components/LoginCard";
import { StairsMark } from "@/components/StairsMark";
import { daysLeft, formatDateRange, formatPoints } from "@/lib/format";
import { getCurrentParticipant } from "@/lib/identity";
import { getActivePeriod, rulesFor } from "@/lib/periods";
import { getStanding } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [participant, period] = await Promise.all([
    getCurrentParticipant(),
    getActivePeriod(),
  ]);

  const standing =
    participant && period ? await getStanding(participant.id, period.id) : null;

  return (
    <AppShell active="hjem">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-start gap-4">
            <StairsMark className="mt-1 h-9 w-9 shrink-0 text-brand-600" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {participant ? `Hei, ${participant.nickname}!` : "Ta trappa"}
              </h1>
              <p className="mt-1 text-muted">
                Skann QR-koden i trappeoppgangen når du kommer fram, så samler du
                poeng for hver etasje.
              </p>
            </div>
          </div>
        </section>

        {!participant && <LoginCard />}

        {period ? (
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{period.name}</h2>
              <span className="text-sm text-muted">
                {daysLeft(period.endsAt)} dager igjen
              </span>
            </div>
            <p className="text-sm text-muted">
              {formatDateRange(period.startsAt, period.endsAt)}
            </p>

            {standing && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat
                  label="Dine poeng"
                  value={formatPoints(standing.totalPoints)}
                />
                <Stat
                  label="Plassering"
                  value={
                    standing.rank
                      ? `${standing.rank}. av ${standing.participantCount}`
                      : "–"
                  }
                />
              </div>
            )}

            <p className="mt-5 text-sm text-muted">
              Én etasje opp gir {formatPoints(rulesFor(period).pointsUp)} poeng,
              én etasje ned gir {formatPoints(rulesFor(period).pointsDown)}.
              Maks {formatPoints(rulesFor(period).dailyPointsCap)} poeng per dag.
            </p>

            <Link
              href="/resultater"
              className="mt-5 block rounded-xl bg-brand-600 px-4 py-3 text-center font-semibold text-white"
            >
              Se resultatlisten
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">Ingen periode pågår</h2>
            <p className="mt-1 text-sm text-muted">
              Turene du registrerer blir lagret, men gir ikke poeng før en ny
              konkurranseperiode starter.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Slik virker det</h2>
          <ol className="mt-3 space-y-3 text-sm text-muted">
            <Step n={1}>Gå trappa i stedet for å ta heisen.</Step>
            <Step n={2}>
              Skann QR-plakaten i etasjen du kommer fram til.
            </Step>
            <Step n={3}>Trykk på etasjen du gikk fra, og bekreft.</Step>
          </ol>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
