-- Table booking, timers and billing.
--   club_tables           the club's tables and their hourly rate
--   table_sessions        a table in use: players, timer start/stop, the bill
--   table_session_charges who pays what for a session (loser pays, split, custom) and how they paid
--   table_bookings        a player's reservation request, confirmed or rejected by staff
-- All reads and writes go through the server (service role).

create table if not exists public.club_tables (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  table_number integer not null check (table_number between 1 and 99),
  name text not null default '',
  -- Rupees per hour; sessions are billed by the minute.
  hourly_rate integer not null default 0 check (hourly_rate >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (club_id, table_number)
);

create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  table_id uuid not null references public.club_tables (id) on delete cascade,
  -- Everyone at the table, e.g. {Rohan, Sameer}. player_name is the display line ("Rohan v Sameer").
  players text[] not null default '{}',
  player_name text not null default '',
  player_id uuid references public.player_profiles (id) on delete set null,
  booking_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Rate at the moment the session started, so later rate changes don't alter old bills.
  hourly_rate integer not null default 0,
  minutes integer,
  amount integer,
  -- True once every charge for this session is paid.
  paid boolean not null default false,
  started_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A table can only have one running timer.
create unique index if not exists table_sessions_one_open_per_table
  on public.table_sessions (table_id) where ended_at is null;
create index if not exists table_sessions_club_started_idx on public.table_sessions (club_id, started_at desc);
create index if not exists table_sessions_unpaid_idx on public.table_sessions (club_id) where ended_at is not null and paid = false;

-- How a session's bill is shared: one row per payer.
create table if not exists public.table_session_charges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  session_id uuid not null references public.table_sessions (id) on delete cascade,
  payer_name text not null,
  amount integer not null check (amount >= 0),
  paid boolean not null default false,
  payment_method text check (payment_method in ('cash', 'upi', 'card')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists table_session_charges_session_idx on public.table_session_charges (session_id);
create index if not exists table_session_charges_unpaid_idx on public.table_session_charges (club_id) where paid = false;
create index if not exists table_session_charges_paid_at_idx on public.table_session_charges (club_id, paid_at);

create table if not exists public.table_bookings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  -- Null = "any free table"; staff pick one when confirming.
  table_id uuid references public.club_tables (id) on delete set null,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  start_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'rejected', 'cancelled', 'started', 'no_show')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists table_bookings_club_start_idx on public.table_bookings (club_id, start_at);
create index if not exists table_bookings_player_idx on public.table_bookings (player_id, start_at desc);

alter table public.table_sessions
  drop constraint if exists table_sessions_booking_fk;
alter table public.table_sessions
  add constraint table_sessions_booking_fk foreign key (booking_id) references public.table_bookings (id) on delete set null;

alter table public.club_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.table_session_charges enable row level security;
alter table public.table_bookings enable row level security;
