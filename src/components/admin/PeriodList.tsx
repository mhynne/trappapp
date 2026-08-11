"use client";

import { useState } from "react";

import {
  PeriodEditor,
  type PeriodFormValues,
} from "@/components/admin/PeriodEditor";

export type PeriodListItem = PeriodFormValues & {
  id: number;
  rangeLabel: string;
  isActive: boolean;
};

export function PeriodList({
  periods,
  suggestion,
}: {
  periods: PeriodListItem[];
  suggestion: PeriodFormValues;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(periods.length === 0);

  return (
    <div className="space-y-4">
      {creating ? (
        <PeriodEditor
          initial={suggestion}
          isNew
          onClose={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Ny periode
        </button>
      )}

      <ul className="space-y-3">
        {periods.map((period) =>
          editing === period.id ? (
            <li key={period.id}>
              <PeriodEditor
                initial={period}
                isNew={false}
                onClose={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={period.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {period.name}
                  {period.isActive && (
                    <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                      pågår
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {period.rangeLabel} · opp {period.pointsUp} · ned{" "}
                  {period.pointsDown} · tak {period.dailyPointsCap}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(period.id)}
                className="rounded-xl border border-line px-3 py-1.5 text-sm font-medium"
              >
                Rediger
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
