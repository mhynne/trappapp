import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { daysLeft, formatDateRange, formatPoints, plural } from "@/lib/format";
import { getCurrentParticipant } from "@/lib/identity";
import {
  getActivePeriodCached,
  getAllPeriodsCached,
  getLeaderboard,
  type LeaderboardRow,
} from "@/lib/periods";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode } = await searchParams;
  const [participant, periods, active] = await Promise.all([
    getCurrentParticipant(),
    getAllPeriodsCached(),
    getActivePeriodCached(),
  ]);

  const selectedId = periode ? Number(periode) : (active?.id ?? periods[0]?.id);
  const period = periods.find((p) => p.id === selectedId) ?? null;
  const rows = period ? await getLeaderboard(period.id) : [];

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

        {periods.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <Link
                key={p.id}
                href={`/resultater?periode=${p.id}`}
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
      </div>
    </AppShell>
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
