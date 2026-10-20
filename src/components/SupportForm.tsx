"use client";

import { useEffect, useState, useTransition } from "react";

import { submitSupportReport } from "@/app/actions";
import { SUPPORT_MESSAGE_MAX } from "@/lib/format";

const FIELD =
  "w-full rounded-xl border border-line bg-background px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function SupportForm({
  innlogget,
  fraSide,
}: {
  innlogget: boolean;
  fraSide: string | null;
}) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sendt, setSendt] = useState(false);
  const [pending, startTransition] = useTransition();

  // Leses i nettleseren: om en service worker er aktiv, og hvilken side man
  // kom fra. Begge deler har løst feil i denne appen før.
  const [kontekst, setKontekst] = useState<{
    serviceWorker: boolean | null;
    fromPage: string;
  }>({ serviceWorker: null, fromPage: fraSide ?? "" });

  useEffect(() => {
    let side = fraSide ?? "";
    if (!side && document.referrer) {
      try {
        const url = new URL(document.referrer);
        if (url.origin === location.origin) side = url.pathname;
      } catch {
        // Ugyldig referrer – da står den tom.
      }
    }
    setKontekst({
      serviceWorker:
        "serviceWorker" in navigator
          ? !!navigator.serviceWorker.controller
          : null,
      fromPage: side,
    });
  }, [fraSide]);

  if (sendt) {
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Takk – meldingen er sendt</h2>
        <p className="text-sm text-muted">
          Vi tok med hvilken nettleser og side du var på, så vi slipper å spørre
          om det. Trenger vi mer, tar vi kontakt.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await submitSupportReport({
            message,
            contactEmail: email,
            fromPage: kontekst.fromPage,
            serviceWorker: kontekst.serviceWorker,
          });
          if (result.ok) setSendt(true);
          else setError(result.message);
        });
      }}
      className="space-y-3 rounded-2xl border border-line bg-surface p-5"
    >
      <label htmlFor="melding" className="block font-semibold">
        Hva skjedde?
      </label>
      <p className="text-sm text-muted">
        Skriv gjerne hva du prøvde å gjøre og hva som skjedde i stedet. Vi tar
        automatisk med nettleser og hvilken side du kom fra.
      </p>
      <textarea
        id="melding"
        rows={5}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={SUPPORT_MESSAGE_MAX}
        placeholder="F.eks. «Jeg skannet plakaten i 3. etasje, men fikk ingen kode på e-post.»"
        className={FIELD}
      />

      {!innlogget && (
        <>
          <label htmlFor="kontakt" className="block font-semibold">
            E-post, om du vil ha svar
          </label>
          <input
            id="kontakt"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="deg@eksempel.no"
            className={FIELD}
          />
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || message.trim().length < 5}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Sender …" : "Send melding"}
      </button>
    </form>
  );
}
