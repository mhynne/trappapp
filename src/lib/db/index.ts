import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL mangler. Kopier .env.example til .env.local og fyll inn tilkoblingsstrengen.",
  );
}

// Next.js i utviklingsmodus laster moduler på nytt ved hver endring. Uten denne
// mellomlagringen ville hver reload åpne en ny tilkoblingspool mot databasen.
const globalForDb = globalThis as unknown as {
  trappappClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.trappappClient ??
  postgres(connectionString, {
    // Supabase sin transaksjons-pooler støtter ikke prepared statements.
    prepare: false,
    // Hver forespørsel kjører i sin egen serverinstans, så poolen trenger ikke
    // være stor – en høy verdi ganger bare opp tilkoblingsbehovet mot Supabase
    // når mange skanner samtidig. To gjør likevel at spørringene på samme side
    // kan gå parallelt, i stedet for å stå i kø bak hverandre og holde på
    // tilkoblingen lenger. Lokalt er en større pool nyttig ved omlasting.
    max: process.env.NODE_ENV === "production" ? 2 : 5,
    // Uten disse kan en spørring som henger holde på tilkoblingen i opptil
    // 300 sekunder – Vercels grense. Prøver noen da på nytt, legges en ny
    // femminutters-tilkobling oppå, og en treg database blir fort en
    // utilgjengelig database. Bedre å feile raskt og slippe tilkoblingen.
    connect_timeout: 10,
    idle_timeout: 20,
    connection: { statement_timeout: 8000 },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.trappappClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export const sqlClient = client;
