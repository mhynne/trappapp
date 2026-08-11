-- TrappApp – grunnskjema
-- Kjøres med `npm run db:migrate` (eller lim inn i Supabase SQL Editor).

create table if not exists participants (
  id            uuid primary key default gen_random_uuid(),
  device_token  uuid        not null unique,
  nickname      text        not null,
  is_banned     boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- Kallenavn er unike uavhengig av store/små bokstaver.
create unique index if not exists participants_nickname_lower_idx
  on participants (lower(nickname));

create table if not exists floors (
  id         serial primary key,
  number     integer not null unique,
  label      text    not null,
  qr_token   text    not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists activity_periods (
  id               serial primary key,
  name             text          not null,
  starts_at        timestamptz   not null,
  ends_at          timestamptz   not null,
  points_up        numeric(6, 2) not null default 1.0,
  points_down      numeric(6, 2) not null default 0.5,
  daily_points_cap numeric(6, 2) not null default 40,
  created_at       timestamptz   not null default now()
);

create table if not exists trips (
  id               bigserial primary key,
  participant_id   uuid    not null references participants (id) on delete cascade,
  period_id        integer references activity_periods (id) on delete set null,
  scanned_floor_id integer not null references floors (id),
  from_floor       integer not null,
  to_floor         integer not null,
  floors_up        integer not null,
  floors_down      integer not null,
  points           numeric(6, 2) not null,
  capped           boolean not null default false,
  flagged          boolean not null default false,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists trips_participant_created_idx
  on trips (participant_id, created_at desc);

create index if not exists trips_period_idx
  on trips (period_id, created_at desc)
  where deleted_at is null;
