import { config } from "dotenv";

// Samme rekkefølge som Next.js bruker, slik at skriptene og appen ser like
// variabler. Første fil som setter en variabel vinner.
config({ path: ".env.local" });
config({ path: ".env" });
