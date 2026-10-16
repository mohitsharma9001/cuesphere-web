-- Dues and income reports for table billing.
--   table_sessions.lineup            who played, linked to their CueSphere account when known
--   table_session_charges.payer_player_id  the account a share belongs to, so players can see their own dues
--   table_session_charges.split_mode loser / split / custom — how the share came about
--   table_session_charges.reminded_at last time the club sent a reminder for it

alter table public.table_sessions
  add column if not exists lineup jsonb not null default '[]'::jsonb;

alter table public.table_session_charges
  add column if not exists payer_player_id uuid references public.player_profiles (id) on delete set null;
alter table public.table_session_charges
  add column if not exists split_mode text;
alter table public.table_session_charges
  drop constraint if exists table_session_charges_split_mode_check;
alter table public.table_session_charges
  add constraint table_session_charges_split_mode_check check (split_mode is null or split_mode in ('loser', 'split', 'custom'));
alter table public.table_session_charges
  add column if not exists reminded_at timestamptz;

-- A player's dues at a club, and a club's dues by player.
create index if not exists table_session_charges_payer_idx
  on public.table_session_charges (club_id, payer_player_id) where paid = false;
create index if not exists table_session_charges_player_history_idx
  on public.table_session_charges (payer_player_id, created_at desc);
