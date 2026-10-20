"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markSupportHandled } from "@/app/admin/actions";

export type ReportItem = {
  id: number;
  message: string;
  avsender: string;
  kontekst: string[];
  mottatt: string;
  håndtert: boolean;
};

export function SupportReports({ reports }: { reports: ReportItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (reports.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-muted">
        Ingen meldinger ennå.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li
          key={report.id}
          className={`space-y-3 rounded-2xl border px-4 py-4 ${
            report.håndtert
              ? "border-line bg-surface-muted"
              : "border-brand-600 bg-surface"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{report.avsender}</p>
              <p className="text-sm text-muted">{report.mottatt}</p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await markSupportHandled(report.id, !report.håndtert);
                  router.refresh();
                })
              }
              className="rounded-xl border border-line px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {report.håndtert ? "Åpne igjen" : "Marker håndtert"}
            </button>
          </div>

          <p className="whitespace-pre-wrap">{report.message}</p>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {report.kontekst.map((linje) => (
              <li key={linje}>{linje}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
