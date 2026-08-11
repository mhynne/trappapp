# TrappApp

Webapp som premierer ansatte for å ta trappa i stedet for heisen. Man skanner en
QR-plakat i etasjen man kommer fram til, trykker på etasjen man gikk fra, og
samler poeng. Resultatlisten viser hvem som har gått mest i en aktivitetsperiode.

Bygget for **én bedrift i ett bygg**, uten pålogging: identiteten er et
selvvalgt kallenavn knyttet til en tilfeldig ID i nettleseren.

## Teknologi

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS 4
- **Postgres** via Drizzle ORM (kjører på Supabase i produksjon)
- Deployes på **Vercel**; ingen egen server å drifte
- PWA: kan installeres på hjemskjermen, viser en vennlig side uten nett

## Kom i gang lokalt

Krever Node 18.18+ og Docker (for den lokale databasen).

```bash
docker run -d --name trappapp-pg -e POSTGRES_PASSWORD=trappapp -e POSTGRES_USER=trappapp -e POSTGRES_DB=trappapp -p 55432:5432 postgres:16-alpine
```

```bash
cp .env.example .env.local && npm install && npm run db:migrate && npm run db:seed && npm run dev
```

Appen kjører på http://localhost:3000. Seed-scriptet skriver ut QR-lenkene for
hver etasje, så du kan åpne f.eks. `/t/<token>` direkte uten å skanne noe.

Vil du se en fylt resultatliste: `npx tsx scripts/demo-data.ts` (kun localhost).

### Skript

| Kommando | Hva den gjør |
| --- | --- |
| `npm run dev` | Utviklingsserver |
| `npm run build` | Produksjonsbygg (typesjekker også `scripts/`) |
| `npm run db:migrate` | Kjører SQL-filene i `db/migrations` som ikke er kjørt før |
| `npm run db:seed` | Legger inn etasjer og en periode for inneværende måned |
| `npm run db:reset` | Sletter alle tabeller (nekter mot annet enn localhost) |

> **Merk:** Ikke kjør `npm run build` mens `npm run dev` kjører – begge skriver
> til `.next`, og dev-serveren begynner å feile med `Cannot find module`.

## Slik henger det sammen

```
QR-plakat i 4. etasje  →  /t/<token>  →  velg startetasje  →  poeng + plassering
```

- `src/app/t/[qrToken]/page.tsx` – skanne-siden, den viktigste skjermen. Nye
  brukere velger kallenavn her; QR-skanningen *er* onboardingen.
- `src/lib/trips.ts` – all registreringslogikk: poengberegning, nedkjøling,
  fartssjekk, kontinuitetsflagg og dagstak.
- `src/lib/periods.ts` – aktiv periode og resultatlisten (én SQL-spørring).
- `src/middleware.ts` – gir hver enhet en tilfeldig anonym ID i en
  httpOnly-informasjonskapsel.
- `src/app/admin/` – passordbeskyttet administrasjon.

### Poeng

Standard: **1 poeng per etasje opp**, **0,5 per etasje ned**, maks **40 poeng per
dag**. Alt tre kan endres per periode under `/admin/perioder` uten at historikken
regnes om – hver tur lagrer sine egne poeng.

Etasjer måles i *nivåer*: Kjeller = 0, 1. etasje = 1, og så videre. Navnet på
plakaten settes fritt.

### Hvordan juks bremses

Alt håndheves på serveren når en tur registreres:

1. **Nedkjøling** – minst 30 sekunder mellom to registreringer.
2. **Fartssjekk** – minst 10 sekunder per etasje siden forrige tur.
3. **Kontinuitetsflagg** – startet du et annet sted enn du sist endte, og det er
   under 5 minutter siden? Turen godkjennes, men flagges for gjennomgang. Folk
   tar heisen imellom, så dette er et signal, ikke en dom.
4. **Dagstak** – poeng utover dagsgrensen gir 0, men turen lagres.
5. **Ugjettbare QR-tokens** – man må ha sett plakaten for å registrere.

Den reelle sikkerhetsventilen er `/admin/moderasjon`, der enkeltturer kan
slettes og deltakere utestenges. Vi gjør bevisst *ikke* geolokasjon,
sensoravlesning eller IP-sperrer: dette er kolleger, ikke motstandere.

### Personvern

Vi lagrer kallenavn, en tilfeldig enhets-ID og turene. Ingen navn, e-post,
posisjon eller kobling til jobbkonto. Brukeren kan slette alt selv fra
`/meg` eller `/personvern`. Se `/personvern` for teksten som vises til ansatte.

Merk at et kallenavn kan være indirekte identifiserende på en liten
arbeidsplass. Det bør stå i personvernvurderingen før lansering.

## Sette i drift

1. **Database:** opprett et Supabase-prosjekt. Kopier tilkoblingsstrengen under
   *Project Settings → Database → Connection string → Transaction pooler*.
2. **Migrer:** kjør `DATABASE_URL=<strengen> npm run db:migrate` lokalt, eller
   lim innholdet i `db/migrations/0001_init.sql` inn i Supabase SQL Editor.
   Kjør `npm run db:seed` for å få inn etasjer og en første periode.
3. **Vercel:** importer repoet og sett miljøvariablene:

   | Variabel | Verdi |
   | --- | --- |
   | `DATABASE_URL` | Tilkoblingsstrengen fra Supabase |
   | `ADMIN_PASSWORD` | Langt, tilfeldig passord til `/admin` |
   | `ADMIN_SECRET` | `openssl rand -hex 32` |
   | `NEXT_PUBLIC_APP_URL` | Den offentlige adressen, f.eks. `https://trappapp.bedrift.no` |

   `NEXT_PUBLIC_APP_URL` er viktig: den bestemmer hva QR-kodene peker på.
   Plakatsiden advarer hvis adressen er `localhost`.

4. **Plakater:** logg inn på `/admin`, gå til *Plakater*, trykk «Skriv ut» og
   velg skriver eller «Lagre som PDF». Én A4-side per aktiv etasje.

Databasen nås bare fra serversiden. Slå på row level security med «deny all» i
Supabase, så er den offentlige anon-nøkkelen verdiløs selv om den lekker.

## Kjent begrensning

Identiteten ligger i nettleseren. Bytter noen telefon eller nettleser, starter de
på nytt – appen kan ikke koble de to sammen uten pålogging. For en pilot er det
et bevisst valg: null friksjon og minimalt med persondata. Trenger dere at folk
beholder poengene på tvers av enheter, må det inn ekte innlogging (f.eks.
Microsoft-konto), og da bør personvernvurderingen tas opp igjen.
