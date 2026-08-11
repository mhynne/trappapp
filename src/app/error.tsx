"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-bold">Noe gikk galt</h1>
      <p className="text-muted">
        Appen klarte ikke å laste siden. Prøv igjen – hvis det fortsetter, si fra
        til den som drifter TrappApp.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white"
        >
          Prøv igjen
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-line px-5 py-3 font-medium"
        >
          Til forsiden
        </Link>
      </div>
    </div>
  );
}
