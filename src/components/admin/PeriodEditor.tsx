"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePeriod, savePeriod } from "@/app/admin/actions";

export type PeriodFormValues = {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  pointsUp: string;
  pointsDown: string;
  dailyPointsCap: string;
};

export function PeriodEditor({
  initial,
  isNew,
  onClose,
}: {
  initial: PeriodFormValues;
  isNew: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof PeriodFormValues>(
    key: K,
    value: PeriodFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await savePeriod(values);
      if (result.ok) {
        router.refresh();
        onClose?.();
      } else {
        setError(result.message ?? "Kunne ikke lagre.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-line bg-surface p-5"
    >
      <Field label="Navn">
        <input
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="F.eks. September-konkurransen"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Første dag">
          <input
            type="date"
            value={values.startDate}
            onChange={(event) => set("startDate", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Siste dag">
          <input
            type="date"
            value={values.endDate}
            onChange={(event) => set("endDate", event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Poeng opp">
          <input
            inputMode="decimal"
            value={values.pointsUp}
            onChange={(event) => set("pointsUp", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Poeng ned">
          <input
            inputMode="decimal"
            value={values.pointsDown}
            onChange={(event) => set("pointsDown", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Dagstak">
          <input
            inputMode="decimal"
            value={values.dailyPointsCap}
            onChange={(event) => set("dailyPointsCap", event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <p className="text-xs text-muted">
        Poeng regnes per etasje. Dagstaket er maks poeng én person kan få på en
        dag – turer utover taket blir registrert, men gir 0 poeng.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Lagrer …" : isNew ? "Opprett periode" : "Lagre endringer"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium"
          >
            Avbryt
          </button>
        )}
        {!isNew && values.id && (
          <div className="ml-auto">
            {confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await deletePeriod(values.id!);
                      router.refresh();
                      onClose?.();
                    })
                  }
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Slett perioden
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-line px-4 py-2 text-sm"
                >
                  Nei
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-muted underline underline-offset-2"
              >
                Slett
              </button>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <p className="text-xs text-muted">
          Turene blir ikke slettet, men mister koblingen til perioden og
          forsvinner fra resultatlisten.
        </p>
      )}
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
