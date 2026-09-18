"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveLocation, setLocationActive } from "@/app/admin/actions";

export type LocationItem = {
  id: number;
  name: string;
  isActive: boolean;
  floorCount: number;
};

const INPUT =
  "rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-brand-500";

export function LocationManager({ locations }: { locations: LocationItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.message ?? "Noe gikk galt.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const result = await saveLocation({ name });
            if (result.ok) setName("");
            return result;
          });
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4"
      >
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-muted">
            Nytt bygg
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="F.eks. Lillestrøm"
            maxLength={40}
            className={INPUT}
          />
        </label>
        <button
          type="submit"
          disabled={pending || name.trim().length < 2}
          className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Legg til
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {locations.map((location) => (
          <li
            key={location.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
          >
            {editing === location.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={40}
                  className={`${INPUT} flex-1`}
                />
                <button
                  type="button"
                  disabled={pending || editName.trim().length < 2}
                  onClick={() =>
                    run(async () => {
                      const result = await saveLocation({
                        id: location.id,
                        name: editName,
                      });
                      if (result.ok) setEditing(null);
                      return result;
                    })
                  }
                  className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lagre
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-sm text-muted underline"
                >
                  Avbryt
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {location.name}
                    {!location.isActive && (
                      <span className="ml-2 text-xs text-red-700 dark:text-red-300">
                        ikke aktiv
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {location.floorCount}{" "}
                    {location.floorCount === 1 ? "etasje" : "etasjer"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(location.id);
                    setEditName(location.name);
                  }}
                  className="rounded-xl border border-line px-3 py-1.5 text-sm"
                >
                  Gi nytt navn
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => setLocationActive(location.id, !location.isActive))
                  }
                  className="rounded-xl border border-line px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  {location.isActive ? "Slå av" : "Slå på"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
