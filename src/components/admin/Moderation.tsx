"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteParticipant,
  renameParticipant,
  restoreTrip,
  setParticipantBanned,
  softDeleteTrip,
} from "@/app/admin/actions";
import { formatPoints } from "@/lib/format";

export type TripItem = {
  id: number;
  when: string;
  nickname: string;
  fromLabel: string;
  toLabel: string;
  points: number;
  capped: boolean;
  flagged: boolean;
  deleted: boolean;
};

export type ParticipantItem = {
  id: string;
  nickname: string;
  isBanned: boolean;
  joined: string;
  trips: number;
  points: number;
  flagged: number;
};

export function TripModeration({ trips }: { trips: TripItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  if (trips.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
        Ingen turer å vise.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {trips.map((trip) => (
        <li
          key={trip.id}
          className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${
            trip.deleted
              ? "border-line bg-surface-muted opacity-70"
              : trip.flagged
                ? "border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                : "border-line bg-surface"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {trip.nickname}
              {trip.flagged && !trip.deleted && (
                <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  flagget
                </span>
              )}
              {trip.deleted && (
                <span className="ml-2 text-xs text-muted">slettet</span>
              )}
            </p>
            <p className="text-sm text-muted">
              {trip.fromLabel} → {trip.toLabel} · {trip.when}
              {trip.capped && " · over dagsgrensen"}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatPoints(trip.points)} p
          </span>
          {trip.deleted ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => restoreTrip(trip.id))}
              className="rounded-xl border border-line px-3 py-1.5 text-sm font-medium"
            >
              Gjenopprett
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => softDeleteTrip(trip.id))}
              className="rounded-xl border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-300"
            >
              Slett
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ParticipantModeration({
  participants,
}: {
  participants: ParticipantItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) setError(result.message ?? "Noe gikk galt.");
      router.refresh();
    });
  }

  if (participants.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
        Ingen deltakere ennå.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className={`rounded-2xl border px-4 py-3 ${
              participant.isBanned
                ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                : "border-line bg-surface"
            }`}
          >
            {renaming === participant.id ? (
              <RenameRow
                current={participant.nickname}
                pending={pending}
                onCancel={() => setRenaming(null)}
                onSave={(nickname) =>
                  run(async () => {
                    const result = await renameParticipant(
                      participant.id,
                      nickname,
                    );
                    if (result.ok) setRenaming(null);
                    return result;
                  })
                }
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {participant.nickname}
                    {participant.isBanned && (
                      <span className="ml-2 text-xs text-red-700 dark:text-red-300">
                        utestengt
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {formatPoints(participant.points)} poeng ·{" "}
                    {participant.trips} turer
                    {participant.flagged > 0 &&
                      ` · ${participant.flagged} flagget`}{" "}
                    · med siden {participant.joined}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRenaming(participant.id)}
                  className="rounded-xl border border-line px-3 py-1.5 text-sm"
                >
                  Endre navn
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setParticipantBanned(
                        participant.id,
                        !participant.isBanned,
                      ),
                    )
                  }
                  className="rounded-xl border border-line px-3 py-1.5 text-sm"
                >
                  {participant.isBanned ? "Slipp inn igjen" : "Utesteng"}
                </button>
                <DeleteParticipantButton
                  nickname={participant.nickname}
                  pending={pending}
                  onConfirm={() => run(() => deleteParticipant(participant.id))}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Utestengte deltakere forsvinner fra resultatlisten, men beholder turene
        sine. Sletting fjerner alt permanent.
      </p>
    </div>
  );
}

function RenameRow({
  current,
  pending,
  onSave,
  onCancel,
}: {
  current: string;
  pending: boolean;
  onSave: (nickname: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(current);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={value}
        maxLength={20}
        onChange={(event) => setValue(event.target.value)}
        className="min-w-40 flex-1 rounded-xl border border-line bg-background px-3 py-2"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(value)}
        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Lagre
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-line px-4 py-2 text-sm"
      >
        Avbryt
      </button>
    </div>
  );
}

function DeleteParticipantButton({
  nickname,
  pending,
  onConfirm,
}: {
  nickname: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-muted underline underline-offset-2"
      >
        Slett
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-muted">Slette {nickname} og alle turene?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
        className="rounded-xl bg-red-600 px-3 py-1.5 font-semibold text-white"
      >
        Ja
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-xl border border-line px-3 py-1.5"
      >
        Nei
      </button>
    </span>
  );
}
