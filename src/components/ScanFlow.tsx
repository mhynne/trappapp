"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { chooseNickname, registerTripAction } from "@/app/actions";
import { StairsMark } from "@/components/StairsMark";
import { formatPoints, plural } from "@/lib/format";
import type { RegisterFailure, RegisterSuccess } from "@/lib/trips";

export type FloorOption = { number: number; label: string };

type Props = {
  qrToken: string;
  scannedFloor: FloorOption;
  floors: FloorOption[];
  nickname: string | null;
  suggestedFrom: number | null;
  hasActivePeriod: boolean;
};

export function ScanFlow(props: Props) {
  const [nickname, setNickname] = useState(props.nickname);
  const [result, setResult] = useState<RegisterSuccess | null>(null);

  if (!nickname) {
    return (
      <NicknameStep
        scannedFloor={props.scannedFloor}
        onDone={(name) => setNickname(name)}
      />
    );
  }

  if (result) {
    return (
      <ResultStep
        result={result}
        scannedFloor={props.scannedFloor}
        onAgain={() => setResult(null)}
      />
    );
  }

  return (
    <RegisterStep
      {...props}
      onSuccess={(success) => setResult(success)}
    />
  );
}

/* ---------------------------------------------------------------- kallenavn */

function NicknameStep({
  scannedFloor,
  onDone,
}: {
  scannedFloor: FloorOption;
  onDone: (nickname: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await chooseNickname(value);
      if (result.ok) {
        onDone(result.nickname);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Header
        eyebrow="Velkommen til TrappApp"
        title="Velg et kallenavn"
        subtitle={`Du står i ${scannedFloor.label}. Kallenavnet er det andre ser på resultatlisten – du trenger ikke bruke ditt eget navn.`}
      />

      <form onSubmit={submit} className="space-y-4">
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="F.eks. Trappetroll"
          maxLength={20}
          enterKeyHint="done"
          aria-label="Kallenavn"
          className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || value.trim().length < 2}
          className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-lg font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {pending ? "Lagrer …" : "Kom i gang"}
        </button>
      </form>

      <p className="text-xs text-muted">
        Vi lagrer bare kallenavnet og turene du registrerer – ingen e-post eller
        pålogging.{" "}
        <Link href="/personvern" className="underline underline-offset-2">
          Slik behandler vi opplysningene
        </Link>
        .
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- registrer */

function RegisterStep({
  qrToken,
  scannedFloor,
  floors,
  suggestedFrom,
  hasActivePeriod,
  onSuccess,
}: Props & { onSuccess: (result: RegisterSuccess) => void }) {
  const options = floors.filter((f) => f.number !== scannedFloor.number);
  const [from, setFrom] = useState<number | null>(suggestedFrom);
  const [error, setError] = useState<RegisterFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function register() {
    if (from === null) return;
    setError(null);
    startTransition(async () => {
      const result = await registerTripAction(qrToken, from);
      if (result.ok) {
        onSuccess(result);
      } else {
        setError(result);
      }
    });
  }

  const direction =
    from === null
      ? null
      : from < scannedFloor.number
        ? { word: "opp", count: scannedFloor.number - from }
        : { word: "ned", count: from - scannedFloor.number };

  return (
    <div className="space-y-6">
      <Header
        eyebrow="Du står i"
        title={scannedFloor.label}
        subtitle="Hvilken etasje gikk du fra?"
      />

      {!hasActivePeriod && (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Ingen konkurranse pågår akkurat nå. Turen blir registrert, men gir ikke
          poeng.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {options.map((floor) => {
          const selected = floor.number === from;
          return (
            <button
              key={floor.number}
              type="button"
              onClick={() => setFrom(floor.number)}
              aria-pressed={selected}
              className={`rounded-2xl border px-2 py-4 text-center transition-colors ${
                selected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line bg-surface hover:border-brand-400"
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">
                {floor.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error.message}
          {error.retryAfterSeconds ? (
            <> Prøv igjen om {error.retryAfterSeconds} sekunder.</>
          ) : null}
        </p>
      )}

      <div className="sticky bottom-4 space-y-2">
        <button
          type="button"
          onClick={register}
          disabled={pending || from === null}
          className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-600/20 transition-opacity disabled:opacity-40"
        >
          {pending
            ? "Registrerer …"
            : direction
              ? `Registrer ${direction.count} ${plural(direction.count, "etasje", "etasjer")} ${direction.word}`
              : "Velg startetasje"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ kvittering */

function ResultStep({
  result,
  scannedFloor,
  onAgain,
}: {
  result: RegisterSuccess;
  scannedFloor: FloorOption;
  onAgain: () => void;
}) {
  const moved = result.floorsUp + result.floorsDown;
  const direction = result.floorsUp > 0 ? "opp" : "ned";

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          <StairsMark className="h-10 w-10 text-brand-600 dark:text-brand-200" />
        </div>
      </div>

      <div>
        <p className="text-sm text-muted">
          {moved} {plural(moved, "etasje", "etasjer")} {direction} til{" "}
          {scannedFloor.label}
        </p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-brand-600">
          +{formatPoints(result.pointsEarned)}
        </p>
        <p className="text-sm text-muted">
          {plural(result.pointsEarned, "poeng", "poeng")}
        </p>
      </div>

      {result.capped && (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Du har nådd dagsgrensen for poeng. Turen er registrert, men gir ikke
          flere poeng i dag.
        </p>
      )}

      {result.rank !== null && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-5">
          <p className="text-sm text-muted">
            {result.periodName ? `${result.periodName} – ` : ""}totalt{" "}
            {formatPoints(result.totalPoints)} poeng
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {result.rank}. plass{" "}
            <span className="text-base font-normal text-muted">
              av {result.participantCount}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Link
          href="/resultater"
          className="block w-full rounded-2xl bg-brand-600 px-4 py-4 text-lg font-semibold text-white"
        >
          Se resultatlisten
        </Link>
        <button
          type="button"
          onClick={onAgain}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium"
        >
          Registrer en tur til
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- felles */

function Header({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
    </div>
  );
}
