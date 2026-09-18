import "./env";
import postgres from "postgres";

import { generateQrToken } from "../src/lib/tokens";
import { osloTimeToUtc, toOsloDateString } from "../src/lib/timezone";

/**
 * Legger inn etasjer og en aktivitetsperiode for inneværende måned.
 * Trygg å kjøre flere ganger: eksisterende rader røres ikke.
 *
 * `number` er det fysiske nivået (brukes til å regne etasjer mellom to punkter),
 * `label` er navnet folk ser. Kjeller = nivå 0, 1. etasje = nivå 1.
 */
const FLOORS: { number: number; label: string }[] = [
  { number: 0, label: "Kjeller" },
  { number: 1, label: "1. etasje" },
  { number: 2, label: "2. etasje" },
  { number: 3, label: "3. etasje" },
  { number: 4, label: "4. etasje" },
  { number: 5, label: "5. etasje" },
  { number: 6, label: "6. etasje" },
];

function currentMonthPeriod() {
  const [year, monthNumber] = toOsloDateString(new Date()).split("-").map(Number);
  const month = monthNumber - 1;
  const monthNames = [
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return {
    name: `${monthNames[month]} ${year}`,
    startsAt: osloTimeToUtc(year, month + 1, 1),
    endsAt: osloTimeToUtc(year, month + 2, 1),
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL mangler (se .env.example).");
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    // Alle etasjer hører til et bygg. Uten lokasjon finnes ingen etasjer.
    const [location] = await sql`
      insert into locations (name)
      select 'Hovedkontoret'
      where not exists (select 1 from locations)
      returning id, name
    `;
    if (location) {
      console.log(`✓ Lokasjon "${location.name}" opprettet`);
    }

    const [{ id: locationId }] = await sql`
      select id from locations order by id limit 1
    `;

    for (const floor of FLOORS) {
      const inserted = await sql`
        insert into floors (location_id, number, label, qr_token)
        values (${locationId}, ${floor.number}, ${floor.label}, ${generateQrToken()})
        on conflict (location_id, number) do nothing
        returning number, label, qr_token
      `;
      if (inserted.length > 0) {
        console.log(
          `✓ Etasje ${inserted[0].label} → /t/${inserted[0].qr_token}`,
        );
      } else {
        console.log(`· Etasje ${floor.label} finnes fra før`);
      }
    }

    const period = currentMonthPeriod();
    const existing = await sql`
      select id, name from activity_periods
      where starts_at = ${period.startsAt} and ends_at = ${period.endsAt}
    `;

    if (existing.length === 0) {
      await sql`
        insert into activity_periods (name, starts_at, ends_at)
        values (${period.name}, ${period.startsAt}, ${period.endsAt})
      `;
      console.log(`✓ Periode "${period.name}" opprettet`);
    } else {
      console.log(`· Periode "${existing[0].name}" finnes fra før`);
    }

    console.log("\nSeed ferdig. QR-plakater kan skrives ut fra /admin/plakater");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
