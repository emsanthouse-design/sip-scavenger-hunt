-- ===========================================================================
-- SIP Scavenger Hunt — Supabase schema, security, storage, and seed data.
--
-- HOW TO USE: open your Supabase project -> SQL Editor -> New query, paste this
-- whole file, and click Run. It is safe to run more than once (idempotent).
--
-- Security model (deliberately lightweight — the brief says this is not
-- sensitive data):
--   * The browser uses the public ANON key. Row-level security lets anyone
--     READ the hunt and INSERT a submission, but NOBODY can change a
--     verification result with the anon key.
--   * Verifying / rejecting / editing config happens only through the Netlify
--     Functions, which use the secret service_role key (which bypasses RLS).
-- ===========================================================================

-- --- Extensions ------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- --- Tables ----------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id            text primary key,           -- stable slug, survives label tweaks
  quest         int  not null,              -- 1-5 are quests; 0 = roaming bonus
  title         text not null,
  points        int  not null default 0,
  max_claims    int  not null default 1,    -- per-team cap (e.g. sister city = 2)
  evidence_type text not null default 'photo', -- photo | video | text | recorded
  enhanced      boolean not null default false,
  hint          text,                       -- facilitator-only (riddle answers)
  active        boolean not null default true,
  sort_order    int not null default 0
);

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  client_id     text unique,                -- idempotency key from the device
  team_id       uuid not null references public.teams(id) on delete cascade,
  challenge_id  text not null references public.challenges(id),
  submitted_by  text,                       -- free-text member name (optional)
  evidence_type text not null default 'photo',
  evidence_path text,                       -- path in the 'evidence' storage bucket
  text_answer   text,
  status        text not null default 'pending', -- pending | verified | rejected
  awarded_points int,                       -- admin override; null = use default
  admin_note    text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index if not exists submissions_team_idx on public.submissions(team_id);
create index if not exists submissions_status_idx on public.submissions(status);

-- Singleton scoring config (hero tiers, roaming value, etc.) as JSON.
create table if not exists public.config (
  id    int primary key default 1,
  value jsonb not null
);

-- Roster: who joined which team. One row per device (client_id) so a rejoin
-- moves the row instead of duplicating. Admin can rename via admin-config.
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  client_id  text unique,
  team_id    uuid not null references public.teams(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- --- Realtime --------------------------------------------------------------
-- Let the admin dashboard receive live submission inserts/updates.
alter publication supabase_realtime add table public.submissions;

-- --- Row-level security ----------------------------------------------------
alter table public.teams       enable row level security;
alter table public.challenges  enable row level security;
alter table public.submissions enable row level security;
alter table public.config      enable row level security;

-- Public read of the hunt content.
drop policy if exists "read teams" on public.teams;
create policy "read teams" on public.teams for select using (true);

drop policy if exists "read challenges" on public.challenges;
create policy "read challenges" on public.challenges for select using (true);

drop policy if exists "read config" on public.config;
create policy "read config" on public.config for select using (true);

-- Submissions: anyone can read (teams see their status) and INSERT a new one.
-- No anon UPDATE/DELETE policy exists, so verification can't be tampered with;
-- the service_role key used by the Netlify Functions bypasses RLS entirely.
drop policy if exists "read submissions" on public.submissions;
create policy "read submissions" on public.submissions for select using (true);

drop policy if exists "insert submissions" on public.submissions;
create policy "insert submissions" on public.submissions
  for insert with check (status = 'pending');

-- Roster: readable + writable by anyone (it's just names for the join list —
-- scores never depend on it; verification stays service-role-only).
alter table public.team_members enable row level security;
drop policy if exists "read members" on public.team_members;
create policy "read members" on public.team_members for select using (true);
drop policy if exists "insert members" on public.team_members;
create policy "insert members" on public.team_members for insert with check (true);
drop policy if exists "update members" on public.team_members;
create policy "update members" on public.team_members for update using (true);

-- --- Storage: evidence bucket (public read, anon upload) --------------------
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "evidence read" on storage.objects;
create policy "evidence read" on storage.objects
  for select using (bucket_id = 'evidence');

drop policy if exists "evidence upload" on storage.objects;
create policy "evidence upload" on storage.objects
  for insert with check (bucket_id = 'evidence');

-- Allow upsert-on-retry (the outbox uses upsert:true for idempotent uploads).
drop policy if exists "evidence update" on storage.objects;
create policy "evidence update" on storage.objects
  for update using (bucket_id = 'evidence');

-- ===========================================================================
-- SEED DATA  (mirrors src/config/seed.js — edit later in the admin Settings UI)
-- ===========================================================================

-- Teams (three teams of five; change codes/names in Settings if you like).
insert into public.teams (name, join_code) values
  ('Team 1', 'HUB'),
  ('Team 2', 'BAY'),
  ('Team 3', 'FEN')
on conflict (join_code) do nothing;

-- Scoring config.
insert into public.config (id, value) values (1, '{
  "heroTiers": [
    { "quests": 3, "bonus": 5 },
    { "quests": 4, "bonus": 10 },
    { "quests": 5, "bonus": 15 }
  ],
  "roamingBonus": 3,
  "minTeammatesInShot": 2
}'::jsonb)
on conflict (id) do nothing;

-- Challenges. (quest, id, title, points, max_claims, evidence, enhanced, hint, active)
insert into public.challenges
  (id, quest, title, points, max_claims, evidence_type, enhanced, hint, active, sort_order)
values
  -- Quest 1 — Boston Bingo
  ('bingo-flag',        1, 'Photo with a Boston city flag', 1, 1, 'photo', false, null, true, 1),
  ('bingo-lobster',     1, 'Photo with something shaped like a lobster', 1, 1, 'photo', false, null, true, 2),
  ('bingo-penny',       1, 'Throw a penny in a fountain & make a wish', 1, 1, 'photo', false, null, true, 3),
  ('bingo-wicked',      1, 'Find a "wicked" Boston sign or slogan', 1, 1, 'photo', false, null, true, 4),
  ('bingo-small-biz',   1, 'Small independent business open 20+ years', 1, 1, 'photo', false, null, true, 5),
  ('bingo-street-sign', 1, 'Street sign in a language other than English', 1, 1, 'photo', false, null, true, 6),
  ('bingo-performer',   1, 'A live street performer or musician', 1, 1, 'photo', false, null, true, 7),
  ('bingo-public-art',  1, 'A public art project funded by the City (max 2)', 1, 2, 'photo', false, null, true, 8),
  ('bingo-old-building',1, 'A building older than 1850 (team photo)', 1, 1, 'photo', false, null, true, 9),
  ('bingo-ducklings',   1, 'Strike a pose with the "Make Way for Ducklings" statues', 1, 1, 'photo', false, null, true, 10),
  ('bingo-statue-pose', 1, 'Recreate a historical statue''s pose (in the shot with the statue)', 2, 1, 'photo', false, null, true, 11),

  -- Quest 2 — Solve the Riddle (hints are facilitator-only)
  ('riddle-state-house',   2, 'Riddle 1 — the golden-domed lawmakers'' home', 2, 1, 'photo', false, 'Answer: Massachusetts State House (Beacon Hill).', true, 1),
  ('riddle-granary',       2, 'Riddle 2 — a signer rests among old stones', 2, 1, 'photo', false, 'Answer: Granary Burying Ground (John Hancock''s grave).', true, 2),
  ('riddle-swan-boats',    2, 'Riddle 3 — shaped like birds, glide on water', 2, 1, 'photo', false, 'Answer: Swan Boats (Public Garden).', true, 3),
  ('riddle-faneuil',       2, 'Riddle 4 — the "cradle" where voices rose', 2, 1, 'photo', false, 'Answer: Faneuil Hall.', true, 4),
  ('riddle-quincy-market', 2, 'Riddle 5 — food-filled favorite beside historic halls', 2, 1, 'photo', false, 'Answer: Quincy Market.', true, 5),
  ('riddle-dunkin',        2, 'Riddle 6 — the orange-and-pink morning stop', 2, 1, 'photo', false, 'Answer: Dunkin''.', true, 6),
  ('riddle-bell-in-hand',  2, 'Riddle 7 — a town crier''s famous tavern', 2, 1, 'photo', false, 'Answer: Bell in Hand Tavern.', true, 7),
  ('riddle-art-venue',     2, 'Riddle 8 — Boston''s home for art', 2, 1, 'photo', false, 'Answer: Boston Center for the Arts.', true, 8),
  ('riddle-old-south',     2, 'Riddle 9 — where crowds met before tea hit the bay', 2, 1, 'photo', false, 'Answer: Old South Meeting House.', true, 9),
  ('riddle-revere-house',  2, 'Riddle 10 — a midnight rider''s North End home', 2, 1, 'photo', false, 'Answer: Paul Revere House.', true, 10),
  ('riddle-union-oyster',  2, 'Riddle 11 — America''s oldest restaurant, oysters its fame', 2, 1, 'photo', false, 'Answer: Union Oyster House.', true, 11),
  ('riddle-mikes-pastry',  2, 'Riddle 12 — North End bakery known for cannoli', 2, 1, 'photo', false, 'Answer: Bova''s Bakery OR Mike''s Pastry (both accepted).', true, 12),

  -- Quest 3 — Lights, Camera, Boston
  ('video-music',   3, '30-second music video — World Cup theme', 3, 1, 'video', false, null, true, 1),
  ('video-tourism', 3, '30-second "Boston Tourism Commercial" (full team on camera)', 3, 1, 'video', false, null, true, 2),
  ('video-plaque',  3, '15-second dramatic reading from a public historical plaque', 3, 1, 'video', false, null, true, 3),
  ('video-9th-map', 3, '15-second video explaining what one of the 9th-floor maps in City Hall shows', 3, 1, 'video', false, null, true, 4),

  -- Quest 4 — City Hall Insider
  ('cityhall-model-room', 4, 'Visit the model room', 2, 1, 'photo', false, null, true, 1),
  ('cityhall-flag',       4, 'Identify the flag (besides the US & Boston flags) flown outside City Hall today — and explain why it matters', 2, 1, 'photo', true, null, true, 2),
  ('cityhall-councilor',  4, 'Photo with a City Council member', 2, 1, 'photo', false, null, false, 3),
  ('cityhall-service',    4, 'Photo that represents "public service" — explain how', 2, 1, 'photo', true, null, true, 4),
  ('cityhall-bcyf',       4, 'Visit a BCYF center inside the perimeter', 2, 1, 'photo', false, null, true, 5),
  ('cityhall-mezzanine',  4, '15-second video explaining the mezzanine art exhibit', 2, 1, 'video', false, null, true, 6),
  ('cityhall-common',     4, 'Team video: one thing all your departments have in common', 2, 1, 'video', false, null, true, 7),
  ('cityhall-slot',       4, '(Configurable slot — edit or hide in Settings)', 2, 1, 'photo', false, null, false, 8),

  -- Quest 5 — Culture & Community
  ('culture-pao',         5, 'Pao Arts Center — team photo + name an exhibit + bring back a brochure', 5, 1, 'photo', true, null, true, 1),
  ('culture-maahm',       5, 'Museum of African American History — team photo + exhibit + bring back a brochure', 5, 1, 'photo', true, null, true, 2),
  ('culture-toussaint',   5, 'Toussaint Louverture Cultural Center — team photo + highlight a hallway artwork', 5, 1, 'photo', true, null, true, 3),
  ('culture-bpl',         5, 'Get a BPL library card + check out a book', 5, 1, 'photo', true, null, true, 4),
  ('culture-sister-city', 5, 'Find representation of one of Boston''s Sister Cities (max 2)', 2, 2, 'photo', false, null, true, 5),
  ('culture-fav-thing',   5, 'Ask someone their favorite thing about Boston + tell us (max 2 people)', 2, 2, 'recorded', true, null, true, 6),
  ('culture-theater',     5, 'Theater District photo recreating an upcoming opera/theater performance', 5, 1, 'photo', false, null, true, 7),
  ('culture-famine',      5, 'Irish Famine Memorial on School Street — photo + explain its importance', 5, 1, 'photo', true, null, true, 8),

  -- Quest 6 — LinkedIn Bonus (individual; +1 per teammate reposted)
  ('linkedin-repost', 6, 'LinkedIn: post a challenge photo — "What is Boston to you?" Tag @CityofBoston + the packet hashtags, then submit a screenshot here. +1 for each teammate the City reposts (one post per person).',
   1, 5, 'photo', true,
   'Award (and repost) only if it clears the bar: says something real, professional first-person voice, tags @CityofBoston + teammates + a hashtag, clear photo with 2+ teammates, nothing political/unsafe, clean copy. One post per person; +1 each.', true, 1),

  -- Quest 0 — Roaming Bonus (one-time per team)
  ('roaming-bonus', 0, 'Spot BOTH roamers (Isabella & Avis) in one photo with 2+ teammates', 3, 1, 'photo', true,
   'Both roamers in frame together, plus at least two of the team''s own members. Once per team.', true, 1)
on conflict (id) do nothing;
