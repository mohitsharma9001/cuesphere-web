-- States & cities (clubs are placed in one; rankings are per state / city of the club)
-- and friendly matches between registered players.

-- ── Locations ───────────────────────────────────────────────────────────────

create table if not exists states (
  code text primary key,
  name text not null,
  -- Only active states are offered to clubs and shown on the rankings page.
  active boolean not null default false
);

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  state_code text not null references states(code) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists cities_state_name_key on cities (state_code, lower(name));

alter table states enable row level security;
alter table cities enable row level security;
drop policy if exists states_select_all on states;
create policy states_select_all on states for select using (true);
drop policy if exists cities_select_all on cities;
create policy cities_select_all on cities for select using (true);

insert into states (code, name, active) values
  ('AN', 'Andaman and Nicobar Islands', false),
  ('AP', 'Andhra Pradesh', false),
  ('AR', 'Arunachal Pradesh', false),
  ('AS', 'Assam', false),
  ('BR', 'Bihar', false),
  ('CH', 'Chandigarh', false),
  ('CG', 'Chhattisgarh', false),
  ('DH', 'Dadra and Nagar Haveli and Daman and Diu', false),
  ('DL', 'Delhi', false),
  ('GA', 'Goa', false),
  ('GJ', 'Gujarat', false),
  ('HR', 'Haryana', false),
  ('HP', 'Himachal Pradesh', false),
  ('JK', 'Jammu and Kashmir', false),
  ('JH', 'Jharkhand', false),
  ('KA', 'Karnataka', true),
  ('KL', 'Kerala', false),
  ('LA', 'Ladakh', false),
  ('LD', 'Lakshadweep', false),
  ('MP', 'Madhya Pradesh', false),
  ('MH', 'Maharashtra', false),
  ('MN', 'Manipur', false),
  ('ML', 'Meghalaya', false),
  ('MZ', 'Mizoram', false),
  ('NL', 'Nagaland', false),
  ('OD', 'Odisha', false),
  ('PY', 'Puducherry', false),
  ('PB', 'Punjab', false),
  ('RJ', 'Rajasthan', false),
  ('SK', 'Sikkim', true),
  ('TN', 'Tamil Nadu', false),
  ('TS', 'Telangana', false),
  ('TR', 'Tripura', false),
  ('UP', 'Uttar Pradesh', false),
  ('UK', 'Uttarakhand', false),
  ('WB', 'West Bengal', true)
on conflict (code) do nothing;

insert into cities (state_code, name) values
  ('KA', 'Bengaluru'), ('KA', 'Mysuru'), ('KA', 'Mangaluru'), ('KA', 'Hubballi'), ('KA', 'Dharwad'),
  ('KA', 'Belagavi'), ('KA', 'Kalaburagi'), ('KA', 'Udupi'), ('KA', 'Davanagere'), ('KA', 'Shivamogga'),
  ('KA', 'Ballari'), ('KA', 'Tumakuru'),
  ('WB', 'Kolkata'), ('WB', 'Howrah'), ('WB', 'Siliguri'), ('WB', 'Durgapur'), ('WB', 'Asansol'),
  ('WB', 'Darjeeling'), ('WB', 'Kharagpur'), ('WB', 'Bardhaman'), ('WB', 'Haldia'),
  ('SK', 'Gangtok'), ('SK', 'Namchi'), ('SK', 'Gyalshing'), ('SK', 'Mangan'), ('SK', 'Rangpo'), ('SK', 'Singtam')
on conflict do nothing;

alter table clubs add column if not exists state_code text references states(code);
alter table clubs add column if not exists city_id uuid references cities(id) on delete set null;
create index if not exists clubs_state_city_idx on clubs (state_code, city_id);

-- ── Friendly matches ────────────────────────────────────────────────────────
-- Friendlies live in `matches` so scoring, live pages and realtime work as-is.
-- They have no tournament and no club_id (so club TVs, admin lists and club
-- stats never pick them up); venue_club_id optionally records where they played.

alter table matches add column if not exists kind text not null default 'tournament';
alter table matches drop constraint if exists matches_kind_check;
alter table matches add constraint matches_kind_check check (kind in ('tournament', 'friendly'));

alter table matches alter column tournament_id drop not null;
alter table matches alter column club_id drop not null;
alter table matches drop constraint if exists matches_tournament_has_club;
alter table matches add constraint matches_tournament_has_club
  check (kind = 'friendly' or (tournament_id is not null and club_id is not null));

alter table matches add column if not exists venue_club_id uuid references clubs(id) on delete set null;
alter table matches add column if not exists best_of integer;
-- auth user who sent the challenge
alter table matches add column if not exists created_by uuid references auth.users(id) on delete set null;
-- invited → accepted → pending_confirmation → confirmed  (or declined / cancelled / disputed)
alter table matches add column if not exists friendly_state text;
alter table matches drop constraint if exists matches_friendly_state_check;
alter table matches add constraint matches_friendly_state_check check (
  friendly_state is null or friendly_state in
    ('invited', 'declined', 'cancelled', 'accepted', 'pending_confirmation', 'confirmed', 'disputed')
);
-- player profile id that submitted the final score; the other player confirms
alter table matches add column if not exists result_submitted_by uuid references player_profiles(id) on delete set null;

create index if not exists matches_friendly_player1_idx on matches (player1_id) where kind = 'friendly';
create index if not exists matches_friendly_player2_idx on matches (player2_id) where kind = 'friendly';

-- Friendly results never touch tournament stats or ranking points.
create table if not exists player_friendly_stats (
  player_id uuid primary key references player_profiles(id) on delete cascade,
  matches_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  frames_won integer not null default 0,
  frames_lost integer not null default 0,
  highest_break integer not null default 0,
  recent_form text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table player_friendly_stats enable row level security;
