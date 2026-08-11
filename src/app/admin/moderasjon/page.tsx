import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  ParticipantModeration,
  TripModeration,
} from "@/components/admin/Moderation";
import { requireAdmin } from "@/lib/admin-auth";
import { getParticipantsForAdmin, getTripsForModeration } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ flagget?: string }>;
}) {
  await requireAdmin();

  const { flagget } = await searchParams;
  const onlyFlagged = flagget === "1";

  const [trips, participants] = await Promise.all([
    getTripsForModeration(100, onlyFlagged),
    getParticipantsForAdmin(),
  ]);

  return (
    <AdminShell active="moderasjon">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderasjon</h1>
          <p className="text-sm text-muted">
            Flaggede turer er ikke nødvendigvis juks – folk kan ha tatt heisen
            imellom. Bruk skjønn.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {onlyFlagged ? "Flaggede turer" : "Siste turer"}
            </h2>
            <nav className="flex gap-2">
              <Link
                href="/admin/moderasjon"
                aria-current={!onlyFlagged ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  !onlyFlagged ? "bg-brand-600 text-white" : "bg-surface-muted text-muted"
                }`}
              >
                Alle
              </Link>
              <Link
                href="/admin/moderasjon?flagget=1"
                aria-current={onlyFlagged ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  onlyFlagged ? "bg-brand-600 text-white" : "bg-surface-muted text-muted"
                }`}
              >
                Bare flaggede
              </Link>
            </nav>
          </div>

          <TripModeration
            trips={trips.map((trip) => ({
              id: trip.id,
              when: formatDateTime(trip.createdAt),
              nickname: trip.nickname,
              fromLabel: trip.fromLabel,
              toLabel: trip.toLabel,
              points: trip.points,
              capped: trip.capped,
              flagged: trip.flagged,
              deleted: trip.deleted,
            }))}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Deltakere</h2>
          <ParticipantModeration
            participants={participants.map((participant) => ({
              id: participant.id,
              nickname: participant.nickname,
              isBanned: participant.isBanned,
              joined: formatDateTime(participant.createdAt),
              trips: participant.trips,
              points: participant.points,
              flagged: participant.flagged,
            }))}
          />
        </section>
      </div>
    </AdminShell>
  );
}
