/** Formatteringshjelpere som er trygge å bruke både på server og klient. */

/** 12 → "12", 12.5 → "12,5" */
export function formatPoints(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function formatDateRange(startsAt: Date, endsAt: Date): string {
  const fmt = new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Oslo",
  });
  // Perioden slutter ved midnatt inn til neste dag; vis siste hele dag.
  const lastDay = new Date(endsAt.getTime() - 1);
  return `${fmt.format(startsAt)} – ${fmt.format(lastDay)}`;
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(value);
}

/** Antall hele dager igjen, aldri negativt. */
export function daysLeft(endsAt: Date): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000));
}

/** Lengdegrense for supportmeldinger. Ligger her, ikke i @/lib/support, slik
 * at skjemaet kan bruke den uten å dra med seg databasetilkoblingen. */
export const SUPPORT_MESSAGE_MAX = 2000;

/** Omtrentlig etasjehøyde. En uttalt forutsetning, ikke en målt verdi. */
export const METER_PER_ETASJE = 3;

export function formatAntall(n: number): string {
  return n.toLocaleString("nb-NO");
}

/** Gjør etasjer håndfast: «14 000 etasjer» sier lite, «42 km rett opp» fester seg. */
export function formatHøyde(floors: number): string {
  const meter = floors * METER_PER_ETASJE;
  if (meter >= 1000) {
    return `${(meter / 1000).toFixed(1).replace(".", ",")} km`;
  }
  return `${formatAntall(meter)} m`;
}

/**
 * Etasjer per deltaker per dag – det eneste tallet som kan sammenlignes
 * mellom kampanjer av ulik lengde og størrelse. En rå totalsum rangerer
 * kampanjene etter varighet og deltakerantall, ikke etter innsats.
 *
 * En kampanje som fortsatt pågår måles mot dagene som har gått, ikke mot
 * hele lengden – ellers ser den kunstig svak ut mens den varer.
 */
export function etasjerPerDeltakerPerDag(
  floors: number,
  participants: number,
  startsAt: Date,
  endsAt: Date,
  now: Date = new Date(),
): number | null {
  if (participants === 0 || floors === 0) return null;

  const slutt = now < endsAt ? now : endsAt;
  const dager = Math.max(
    1,
    Math.ceil((slutt.getTime() - startsAt.getTime()) / 86_400_000),
  );

  return floors / participants / dager;
}

/** 1.8 → "1,8" */
export function formatSnitt(value: number): string {
  return value.toFixed(1).replace(".", ",");
}
