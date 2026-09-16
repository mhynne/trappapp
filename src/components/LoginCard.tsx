"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { completeSignup, requestLoginCode, submitLoginCode } from "@/app/actions";

const INPUT =
  "w-full rounded-xl border border-line bg-background px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
const BUTTON =
  "w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-40";

type Step = "epost" | "kode" | "kallenavn";

/**
 * Innlogging i tre steg: e-post, engangskode, og kallenavn for nye deltakere.
 * Brukes både på forsiden og inne i skanne-flyten – derfor onDone.
 */
export function LoginCard({
  onDone,
  intro,
}: {
  onDone?: (nickname: string) => void;
  intro?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("epost");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function done(name: string) {
    if (onDone) onDone(name);
    else router.refresh();
  }

  function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await requestLoginCode(email);
      if (result.ok) {
        setStep("kode");
        setNotice(`Vi sendte en kode til ${email.trim().toLowerCase()}.`);
      } else {
        setError(result.message);
      }
    });
  }

  function checkCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitLoginCode(email, code);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.needsNickname) {
        setNotice(null);
        setStep("kallenavn");
      } else {
        done(result.nickname);
      }
    });
  }

  function saveNickname(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeSignup(nickname);
      if (result.ok) done(result.nickname);
      else setError(result.message);
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      {step === "epost" && (
        <form onSubmit={sendCode} className="space-y-3">
          <label htmlFor="epost" className="block font-semibold">
            Logg inn med e-post
          </label>
          <p className="text-sm text-muted">
            {intro ??
              "Du får en engangskode. Jobbadresse eller privat adresse – du velger selv. Poengene følger deg mellom mobil og PC."}
          </p>
          <input
            id="epost"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="deg@eksempel.no"
            className={INPUT}
          />
          <Feil melding={error} />
          <button type="submit" disabled={pending || email.trim().length < 5} className={BUTTON}>
            {pending ? "Sender …" : "Send kode"}
          </button>
        </form>
      )}

      {step === "kode" && (
        <form onSubmit={checkCode} className="space-y-3">
          <label htmlFor="kode" className="block font-semibold">
            Skriv inn koden
          </label>
          {notice && <p className="text-sm text-muted">{notice}</p>}
          <input
            id="kode"
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${INPUT} text-center text-2xl tracking-[0.4em]`}
          />
          <Feil melding={error} />
          <button type="submit" disabled={pending || code.length < 6} className={BUTTON}>
            {pending ? "Sjekker …" : "Logg inn"}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep("epost"); setError(null); setNotice(null); }}
              className="text-muted underline"
            >
              Bytt adresse
            </button>
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={pending}
              className="text-muted underline disabled:opacity-40"
            >
              Send ny kode
            </button>
          </div>
        </form>
      )}

      {step === "kallenavn" && (
        <form onSubmit={saveNickname} className="space-y-3">
          <label htmlFor="kallenavn" className="block font-semibold">
            Velg et kallenavn
          </label>
          <p className="text-sm text-muted">
            Dette er navnet andre ser på resultatlisten. E-posten din vises aldri.
          </p>
          <input
            id="kallenavn"
            autoFocus
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="F.eks. Trappetroll"
            maxLength={20}
            className={INPUT}
          />
          <Feil melding={error} />
          <button
            type="submit"
            disabled={pending || nickname.trim().length < 2}
            className={BUTTON}
          >
            {pending ? "Lagrer …" : "Kom i gang"}
          </button>
        </form>
      )}
    </div>
  );
}

function Feil({ melding }: { melding: string | null }) {
  if (!melding) return null;
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {melding}
    </p>
  );
}
