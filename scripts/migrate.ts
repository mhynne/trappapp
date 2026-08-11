import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import "./env";
import postgres from "postgres";

/**
 * Kjører alle SQL-filene i db/migrations i alfabetisk rekkefølge, og hopper over
 * de som allerede er kjørt. Bevisst enkelt – vi trenger ikke rollback for en pilot.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL mangler (se .env.example).");
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  const dir = path.join(process.cwd(), "db", "migrations");

  try {
    await sql`
      create table if not exists _migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const applied = new Set(
      (await sql<{ name: string }[]>`select name from _migrations`).map(
        (row) => row.name,
      ),
    );

    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`· ${file} (allerede kjørt)`);
        continue;
      }
      const contents = await readFile(path.join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(contents);
        await tx`insert into _migrations (name) values (${file})`;
      });
      console.log(`✓ ${file}`);
    }

    console.log("Migrasjoner ferdig.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
