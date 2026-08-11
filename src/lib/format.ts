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
