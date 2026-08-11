"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMyData } from "@/app/actions";

export function DeleteMyData() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-muted underline underline-offset-2"
      >
        Slett kallenavnet og alle turene mine
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <p className="text-sm text-red-800 dark:text-red-200">
        Dette sletter kallenavnet ditt og alle registrerte turer. Poengene
        forsvinner fra resultatlisten og kan ikke hentes tilbake.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteMyData();
              router.replace("/");
              router.refresh();
            })
          }
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Sletter …" : "Ja, slett alt"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
