-- Indexes for the lookups the app runs on almost every page (and that table
-- TVs, overlays and live viewers run every few seconds). Without them Postgres
-- reads whole tables, which gets slower as clubs add matches and members.
-- Safe to re-run; changes no data.

-- Matches: club live/scheduled lists, tournament fixtures, a player's matches.
create index if not exists matches_club_status_idx on public.matches (club_id, status);
create index if not exists matches_tournament_idx on public.matches (tournament_id);
create index if not exists matches_player1_idx on public.matches (player1_id);
create index if not exists matches_player2_idx on public.matches (player2_id);

-- Memberships by user ("my clubs", every signed-in page); (club_id, user_id) is already unique.
create index if not exists club_memberships_user_idx on public.club_memberships (user_id);

-- Tournaments listed per club; (club_id, slug) is already unique.
create index if not exists tournament_registrations_tournament_idx on public.tournament_registrations (tournament_id);
create index if not exists tournament_registrations_player_idx on public.tournament_registrations (player_id);
create index if not exists payments_registration_idx on public.payments (registration_id);

-- Unread notification count in the header on every club page.
create index if not exists notifications_user_club_idx on public.notifications (user_id, club_id, read);

-- Player stats, achievements and results on profiles.
create index if not exists player_statistics_player_club_idx on public.player_statistics (player_id, club_id);
create index if not exists achievements_player_idx on public.achievements (player_id);
create index if not exists tournament_results_player_idx on public.tournament_results (player_id);

-- Gallery, scorekeeper logins and push delivery.
create index if not exists club_gallery_images_club_idx on public.club_gallery_images (club_id);
create index if not exists tournament_scorekeepers_user_idx on public.tournament_scorekeepers (user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
