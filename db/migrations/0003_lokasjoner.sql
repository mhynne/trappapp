-- TrappApp – flere lokasjoner
--
-- Hver lokasjon er et bygg med sitt eget sett etasjer. Det som til nå har vært
-- «etasjenummer må være unikt» blir «unikt per lokasjon», slik at to bygg kan
-- ha hver sin 3. etasje.
--
-- qr_token forblir globalt unikt, og etasjene beholder sine. Plakatene som
-- allerede henger fortsetter derfor å virke.

create table if not exists locations (
  id         serial primary key,
  name       text        not null,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists locations_name_lower_idx
  on locations (lower(name));

-- Dagens bygg. Navnet kan endres i admin.
insert into locations (name)
select 'Hovedkontoret'
where not exists (select 1 from locations);

alter table floors
  add column if not exists location_id integer references locations (id) on delete cascade;

update floors
   set location_id = (select min(id) from locations)
 where location_id is null;

alter table floors alter column location_id set not null;

alter table floors drop constraint if exists floors_number_key;

create unique index if not exists floors_location_number_idx
  on floors (location_id, number);

-- Lagres på turen selv. Kan utledes via etasjen, men direkte kolonne gjør
-- resultatlisten enkel å filtrere – samme grep som floors_up og floors_down.
alter table trips
  add column if not exists location_id integer references locations (id) on delete set null;

update trips
   set location_id = (select f.location_id from floors f where f.id = trips.scanned_floor_id)
 where location_id is null;

create index if not exists trips_location_period_idx
  on trips (location_id, period_id);
