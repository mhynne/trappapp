export const TIME_ZONE = "Europe/Oslo";

/** Hvor mange millisekunder norsk tid ligger foran UTC på et gitt tidspunkt. */
function offsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );

  return asIfUtc - at.getTime();
}

/**
 * Gjør en dato/tid oppgitt i norsk lokaltid om til riktig UTC-tidspunkt.
 * Konkurranseperioder må starte ved norsk midnatt – ikke UTC-midnatt – ellers
 * havner turer registrert mellom 00:00 og 02:00 den første i måneden utenfor
 * perioden.
 */
export function osloTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  // To runder gjør at vi lander riktig også rundt sommertidsskiftet.
  let result = new Date(naive - offsetMs(new Date(naive)));
  result = new Date(naive - offsetMs(result));
  return result;
}

/** Tolker "2026-08-01" (norsk dato) som norsk midnatt. */
export function osloDateStringToUtc(value: string, endOfDay = false): Date {
  const [year, month, day] = value.split("-").map(Number);
  return endOfDay
    ? // Perioden slutter ved midnatt inn til dagen etter, slik at hele
      // sluttdatoen teller med.
      osloTimeToUtc(year, month, day + 1, 0, 0)
    : osloTimeToUtc(year, month, day, 0, 0);
}

/** Formatterer et tidspunkt som "2026-08-01" i norsk tid (til <input type="date">). */
export function toOsloDateString(at: Date, subtractOneDay = false): string {
  const value = subtractOneDay ? new Date(at.getTime() - 1) : at;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
