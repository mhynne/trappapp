"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { registerTripAction } from "@/app/actions";
import { LoginCard } from "@/components/LoginCard";
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
  /** Byggets navn. Bare satt når det finnes flere lokasjoner. */
  locationName?: string | null;
};

export function ScanFlow(props: Props) {
  const [nickname, setNickname] = useState(props.nickname);
  const [result, setResult] = useState<RegisterSuccess | null>(null);

  if (!props.hasActivePeriod) {
    return (
      <KampanjeOverStep
        scannedFloor={props.scannedFloor}
        locationName={props.locationName}
      />
    );
  }

  if (!nickname) {
    return (
      <LoginStep
        scannedFloor={props.scannedFloor}
        locationName={props.locationName}
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

/* --------------------------------------------------------------- innlogging */

function LoginStep({
  scannedFloor,
  locationName,
  onDone,
}: {
  scannedFloor: FloorOption;
  locationName?: string | null;
  onDone: (nickname: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Velkommen til TrappApp"
        title="Logg inn"
        subtitle={`Du står i ${scannedFloor.label}${locationName ? `, ${locationName}` : ""}. Første gang må du logge inn – etterpå husker appen deg på denne enheten.`}
      />

      <LoginCard onDone={onDone} />

      <p className="text-xs text-muted">
        Vi lagrer e-postadressen din, kallenavnet og turene du registrerer.{" "}
        <Link href="/personvern" className="underline underline-offset-2">
          Slik behandler vi opplysningene
        </Link>
        .
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- kampanje over */

function KampanjeOverStep({
  scannedFloor,
  locationName,
}: {
  scannedFloor: FloorOption;
  locationName?: string | null;
}) {
  return (
    <div className="space-y-6">
      <Header
        eyebrow="Kampanjen er over"
        title="Ingen kampanje pågår"
        subtitle={`Du står i ${scannedFloor.label}${locationName ? `, ${locationName}` : ""}. Turer kan ikke registreres før en ny kampanje starter.`}
      />

      <Link
        href="/resultater"
        className="block w-full rounded-2xl bg-brand-600 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        Se hvordan det gikk
      </Link>

      <p className="text-sm text-muted">
        Plakatene tas vanligvis ned mellom kampanjene. Står denne fortsatt oppe,
        er det bare å la den henge – den virker igjen neste gang.
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
