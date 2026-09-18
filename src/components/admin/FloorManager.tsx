"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { regenerateQrToken, saveFloor, setFloorActive } from "@/app/admin/actions";

export type FloorItem = {
  id: number;
  number: number;
  label: string;
  qrToken: string;
  isActive: boolean;
};

export function FloorManager({
  locationId,
  floors,
}: {
  locationId: number;
  floors: FloorItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newFloor, setNewFloor] = useState({ number: "", label: "" });
  const [editing, setEditing] = useState<number | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.message ?? "Noe gikk galt.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const result = await saveFloor({ ...newFloor, locationId });
            if (result.ok) setNewFloor({ number: "", label: "" });
            return result;
          });
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4"
      >
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-muted">
            Nivå
          </span>
          <input
            inputMode="numeric"
            value={newFloor.number}
            onChange={(event) =>
              setNewFloor((prev) => ({ ...prev, number: event.target.value }))
            }
            placeholder="7"
            className="w-20 rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-brand-500"
          />
        </label>
        <label className="min-w-40 flex-1 space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-muted">
            Navn på plakaten
          </span>
          <input
            value={newFloor.label}
            onChange={(event) =>
              setNewFloor((prev) => ({ ...prev, label: event.target.value }))
            }
            placeholder="7. etasje"
            className="w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-brand-500"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !newFloor.number || !newFloor.label}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Legg til etasje
        </button>
      </form>

      <p className="text-xs text-muted">
        Nivå er tallet som brukes til å regne ut hvor mange etasjer man har gått.
        Kjeller = 0, 1. etasje = 1, og så videre. Navnet er det folk ser.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {floors.map((floor) => (
          <li
            key={floor.id}
            className={`rounded-2xl border px-4 py-3 ${
              floor.isActive ? "border-line bg-surface" : "border-line bg-surface-muted"
            }`}
          >
            {editing === floor.id ? (
              <FloorEditRow
                floor={floor}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(values) =>
                  run(async () => {
                    const result = await saveFloor({
                      id: floor.id,
                      locationId,
                      ...values,
                    });
                    if (result.ok) setEditing(null);
                    return result;
                  })
                }
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-10 shrink-0 text-center text-sm font-semibold tabular-nums text-muted">
                  {floor.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {floor.label}
                    {!floor.isActive && (
                      <span className="ml-2 text-xs text-muted">(av)</span>
                    )}
                  </p>
                  <p className="truncate font-mono text-xs text-muted">
                    /t/{floor.qrToken}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(floor.id)}
                  className="rounded-xl border border-line px-3 py-1.5 text-sm"
                >
                  Endre navn
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setFloorActive(floor.id, !floor.isActive))}
                  className="rounded-xl border border-line px-3 py-1.5 text-sm"
                >
                  {floor.isActive ? "Slå av" : "Slå på"}
                </button>
                <RegenerateButton
                  floor={floor}
                  pending={pending}
                  onConfirm={() => run(() => regenerateQrToken(floor.id))}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FloorEditRow({
  floor,
  pending,
  onSave,
  onCancel,
}: {
  floor: FloorItem;
  pending: boolean;
  onSave: (values: { number: string; label: string }) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
    number: String(floor.number),
    label: floor.label,
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <input
        inputMode="numeric"
        value={values.number}
        onChange={(event) =>
          setValues((prev) => ({ ...prev, number: event.target.value }))
        }
        className="w-20 rounded-xl border border-line bg-background px-3 py-2"
      />
      <input
        value={values.label}
        onChange={(event) =>
          setValues((prev) => ({ ...prev, label: event.target.value }))
        }
        className="min-w-40 flex-1 rounded-xl border border-line bg-background px-3 py-2"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(values)}
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

function RegenerateButton({
  floor,
  pending,
  onConfirm,
}: {
  floor: FloorItem;
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
        Ny QR
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-muted">
        Plakaten i {floor.label} slutter å virke. Sikker?
      </span>
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
