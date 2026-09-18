import "./env";
import postgres from "postgres";

/**
 * Sletter alle tabeller. Kun ment for lokal utvikling – nekter å kjøre mot
 * en tilkobling som ikke peker på localhost.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL mangler.");
  }
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
    throw new Error(
      "db:reset kjører kun mot localhost. Avbryter for å unngå tap av data.",
    );
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    await sql`drop table if exists trips, activity_periods, floors, locations, participants, login_codes, _migrations cascade`;
    console.log("Alle tabeller slettet. Kjør npm run db:migrate && npm run db:seed");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
