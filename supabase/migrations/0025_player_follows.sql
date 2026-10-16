-- One-way follows: follow any player (no request/acceptance) to see their
-- live matches on your Friends page and get a push when they start playing.
create table if not exists public.player_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, player_id)
);

create index if not exists player_follows_player_idx on public.player_follows (player_id);

-- Only the server (service role) reads or writes follows.
alter table public.player_follows enable row level security;
