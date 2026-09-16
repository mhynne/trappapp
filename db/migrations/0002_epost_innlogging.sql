-- TrappApp – e-post som identitet i stedet for enhets-ID
--
-- Pilotens deltakerdata beholdes ikke, så tabellen tømmes framfor å migreres.
-- Turene følger med via ON DELETE CASCADE. Etasjer og perioder står urørt:
-- QR-tokenene i floors ligger på plakater som allerede er hengt opp.

delete from participants;

-- Enhets-IDen erstattes av e-post. Én person kan nå bruke flere enheter, siden
-- hver enhet bare har en signert sesjonskapsel som peker på samme deltaker.
alter table participants drop column if exists device_token;
alter table participants add column if not exists email text not null;

create unique index if not exists participants_email_lower_idx
  on participants (lower(email));

-- Engangskoder for innlogging. Koden lagres aldri i klartekst.
create table if not exists login_codes (
  id          bigserial primary key,
  email       text        not null,
  code_hash   text        not null,
  expires_at  timestamptz not null,
  attempts    integer     not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Brukes både til å finne nyeste kode og til å telle forespørsler per time.
create index if not exists login_codes_email_created_idx
  on login_codes (lower(email), created_at desc);
