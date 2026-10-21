import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import {
  daysLeft,
  etasjerPerDeltakerPerDag,
  formatAntall,
  formatDateRange,
  formatHøyde,
  formatPoints,
  formatSnitt,
  plural,
} from "@/lib/format";
import { getCurrentParticipant } from "@/lib/identity";
import type { ActivityPeriod } from "@/lib/db/schema";
import { getActiveLocations } from "@/lib/locations";
import {
  getActivePeriodCached,
  getAllPeriodsCached,
  getPeriodTotals,
  getTotalsByPeriod,
  type PeriodTotals,
  getLeaderboard,
  type LeaderboardRow,
} from "@/lib/periods";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; bygg?: string }>;
}) {
  const { periode, bygg } = await searchParams;
  const [participant, periods, active, locations] = await Promise.all([
    getCurrentParticipant(),
    getAllPeriodsCached(),
    getActivePeriodCached(),
    getActiveLocations(),
  ]);

  const alleTotaler = await getTotalsByPeriod();

  const selectedId = periode ? Number(periode) : (active?.id ?? periods[0]?.id);
  const period = periods.find((p) => p.id === selectedId) ?? null;

  // Uten bygg-parameter vises hele bedriften.
  const selectedLocation =
    bygg && locations.some((l) => l.id === Number(bygg)) ? Number(bygg) : null;

  const [rows, totals] = period
    ? await Promise.all([
        getLeaderboard(period.id, selectedLocation),
        getPeriodTotals(period.id, selectedLocation),
      ])
    : [[], null];

  const periodQuery = period ? `periode=${period.id}&` : "";

  return (
    <AppShell active="resultater">
      <div className="space-y-5">
        {period ? (
          <header>
            <h1 className="text-2xl font-bold tracking-tight">{period.name}</h1>
            <p className="text-sm text-muted">
              {formatDateRange(period.startsAt, period.endsAt)}
              {period.id === active?.id && (
                <> · {daysLeft(period.endsAt)} dager igjen</>
              )}
            </p>
          </header>
        ) : (
          <header>
            <h1 className="text-2xl font-bold tracking-tight">Resultater</h1>
            <p className="text-sm text-muted">
              Ingen konkurranseperiode er opprettet ennå.
            </p>
          </header>
        )}

        {period && totals && totals.floors > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              {selectedLocation
                ? locations.find((l) => l.id === selectedLocation)?.name
                : "Hele bedriften"}{" "}
              til sammen
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatAntall(totals.floors)} etasjer
            </p>
            <p className="mt-1 text-sm text-muted">
              Omtrent {formatHøyde(totals.floors)} rett opp, fordelt på{" "}
              {formatAntall(totals.trips)}{" "}
              {totals.trips === 1 ? "tur" : "turer"} fra{" "}
              {formatAntall(totals.participants)}{" "}
              {totals.participants === 1 ? "deltaker" : "deltakere"}.
            </p>
            {(() => {
              const snitt = etasjerPerDeltakerPerDag(
                totals.floors,
                totals.participants,
                period.startsAt,
                period.endsAt,
              );
              return snitt === null ? null : (
                <p className="mt-3 text-sm">
                  <span className="font-medium">{formatSnitt(snitt)}</span>
                  <span className="text-muted">
                    {" "}
                    etasjer per deltaker per dag
                  </span>
                </p>
              );
            })()}
          </section>
        )}

        {locations.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            <Link
              href={`/resultater?${periodQuery}`}
              aria-current={selectedLocation === null ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                selectedLocation === null
                  ? "bg-brand-600 text-white"
                  : "bg-surface-muted text-muted"
              }`}
            >
              Hele bedriften
            </Link>
            {locations.map((l) => (
              <Link
                key={l.id}
                href={`/resultater?${periodQuery}bygg=${l.id}`}
                aria-current={l.id === selectedLocation ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  l.id === selectedLocation
                    ? "bg-brand-600 text-white"
                    : "bg-surface-muted text-muted"
                }`}
              >
                {l.name}
              </Link>
            ))}
          </nav>
        )}

        {periods.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <Link
                key={p.id}
                href={`/resultater?periode=${p.id}${selectedLocation ? `&bygg=${selectedLocation}` : ""}`}
                aria-current={p.id === period?.id ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  p.id === period?.id
                    ? "bg-brand-600 text-white"
                    : "bg-surface-muted text-muted"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        )}

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
            Ingen har registrert trappeturer ennå. Bli den første!
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, index) => (
              <Row
                key={row.participantId}
                row={row}
                place={index + 1}
                isMe={row.participantId === participant?.id}
              />
            ))}
          </ol>
        )}

        <Utvikling
          periods={periods}
          totaler={alleTotaler}
          valgtId={period?.id ?? null}
        />
      </div>
    </AppShell>
  );
}

/**
 * Kampanjene stilt opp mot hverandre. Snittet er det som kan sammenlignes –
 * totalen rangerer etter varighet og deltakerantall, ikke etter innsats.
 * Gjelder alltid hele bedriften, også når et enkeltbygg er valgt over.
 */
function Utvikling({
  periods,
  totaler,
  valgtId,
}: {
  periods: ActivityPeriod[];
  totaler: Record<number, PeriodTotals>;
  valgtId: number | null;
}) {
  const medData = periods.filter((p) => (totaler[p.id]?.floors ?? 0) > 0);
  if (medData.length < 2) return null;

  return (
    <section className="space-y-3 pt-2">
      <div>
        <h2 className="text-lg font-semibold">Utvikling</h2>
        <p className="text-sm text-muted">
          Snittet gjør kampanjer av ulik lengde sammenlignbare. Tallene gjelder
          hele bedriften.
        </p>
      </div>

      <ul className="space-y-2">
        {medData.map((p) => {
          const t = totaler[p.id];
          const snitt = etasjerPerDeltakerPerDag(
            t.floors,
            t.participants,
            p.startsAt,
            p.endsAt,
          );
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                p.id === valgtId
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40"
                  : "border-line bg-surface"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted">
                  {formatAntall(t.floors)} etasjer ·{" "}
                  {formatAntall(t.participants)}{" "}
                  {plural(t.participants, "deltaker", "deltakere")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums">
                  {snitt === null ? "–" : formatSnitt(snitt)}
                </p>
                <p className="text-xs text-muted">per dag</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function Row({
  row,
  place,
  isMe,
}: {
  row: LeaderboardRow;
  place: number;
  isMe: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        isMe
          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40"
          : "border-line bg-surface"
      }`}
    >
      <span className="w-8 shrink-0 text-center text-lg font-semibold tabular-nums">
        {MEDALS[place - 1] ?? place}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {row.nickname}
          {isMe && <span className="ml-2 text-xs text-brand-700 dark:text-brand-300">deg</span>}
        </p>
        <p className="text-xs text-muted">
          {row.floorsUp} {plural(row.floorsUp, "etasje", "etasjer")} opp ·{" "}
          {row.floorsDown} ned · {row.trips} {plural(row.trips, "tur", "turer")}
        </p>
      </div>
      <span className="shrink-0 text-lg font-semibold tabular-nums">
        {formatPoints(row.points)}
      </span>
    </li>
  );
}
