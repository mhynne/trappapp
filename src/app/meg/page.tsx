import { AppShell } from "@/components/AppShell";
import { DeleteMyData } from "@/components/DeleteMyData";
import { LoginCard } from "@/components/LoginCard";
import { SignOutButton } from "@/components/SignOutButton";
import { formatDateTime, formatPoints, plural } from "@/lib/format";
import { getCurrentParticipant } from "@/lib/identity";
import { getActivePeriod } from "@/lib/periods";
import { getRecentTrips, getStanding } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const participant = await getCurrentParticipant();

  if (!participant) {
    return (
      <AppShell active="meg">
        <div className="space-y-5">
          <h1 className="text-2xl font-bold tracking-tight">Min side</h1>
          <p className="text-muted">
            Logg inn for å registrere trappeturer og se poengene dine.
          </p>
          <LoginCard />
        </div>
      </AppShell>
    );
  }

  const period = await getActivePeriod();
  const [standing, trips] = await Promise.all([
    period
      ? getStanding(participant.id, period.id)
      : Promise.resolve({ totalPoints: 0, rank: null, participantCount: 0 }),
    getRecentTrips(participant.id),
  ]);

  const totals = trips.reduce(
    (acc, trip) => ({
      up: acc.up + trip.floorsUp,
      down: acc.down + trip.floorsDown,
    }),
    { up: 0, down: 0 },
  );

  return (
    <AppShell active="meg">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">
            {participant.nickname}
          </h1>
          <p className="text-sm text-muted">
            {period ? period.name : "Ingen periode pågår"}
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Poeng" value={formatPoints(standing.totalPoints)} />
          <Stat
            label="Plassering"
            value={standing.rank ? `${standing.rank}.` : "–"}
          />
          <Stat label="Turer" value={String(trips.length)} />
        </div>

        <p className="text-sm text-muted">
          Siste {trips.length} {plural(trips.length, "tur", "turer")}:{" "}
          {totals.up} {plural(totals.up, "etasje", "etasjer")} opp og{" "}
          {totals.down} ned.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Historikk</h2>
          {trips.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
              Ingen turer registrert ennå. Skann QR-koden i trappeoppgangen når
              du kommer fram.
            </p>
          ) : (
            <ul className="space-y-2">
              {trips.map((trip) => (
                <li
                  key={trip.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="text-lg"
                    title={trip.floorsUp > 0 ? "Opp" : "Ned"}
                  >
                    {trip.floorsUp > 0 ? "↑" : "↓"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {trip.fromLabel} → {trip.toLabel}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(trip.createdAt)}
                      {trip.capped && " · over dagsgrensen"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    +{formatPoints(trip.points)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-3 border-t border-line pt-5">
          <p className="text-sm text-muted">
            Innlogget som {participant.email}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <SignOutButton />
            <DeleteMyData />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}
