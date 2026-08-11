import Link from "next/link";

import { StairsMark } from "@/components/StairsMark";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <StairsMark className="h-10 w-10 text-muted" />
      <h1 className="text-2xl font-bold">Fant ikke siden</h1>
      <p className="text-muted">
        Lenken finnes ikke. Skann QR-plakaten i trappeoppgangen, eller gå til
        forsiden.
      </p>
      <Link
        href="/"
        className="rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white"
      >
        Til forsiden
      </Link>
    </div>
  );
}
