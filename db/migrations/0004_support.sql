-- TrappApp – meldinger om problemer fra brukerne
--
-- Skjemaet skal virke uten innlogging, siden den vanligste meldingen er at man
-- ikke kommer inn. Derfor er både participant_id og contact_email valgfrie.
--
-- participant_id er ON DELETE SET NULL, ikke CASCADE: sletter noen alle sine
-- data, skal e-postadressen forsvinne, men rapporten kan bli stående anonymt
-- så dere ikke mister en feilbeskrivelse dere holder på å undersøke.

create table if not exists support_reports (
  id             bigserial primary key,
  message        text not null,
  /** Bare satt når avsenderen ikke var logget inn. */
  contact_email  text,
  participant_id uuid references participants (id) on delete set null,

  -- Kontekst fanget automatisk. Dette er som regel det som løser saken.
  from_page      text,
  user_agent     text,
  service_worker boolean,
  app_version    text,

  handled_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- Admin ser uhåndterte først, deretter nyeste.
create index if not exists support_reports_handled_created_idx
  on support_reports (handled_at, created_at desc);
