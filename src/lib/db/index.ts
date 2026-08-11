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
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.trappappClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export const sqlClient = client;
