-- ===========================================================================
-- ONE-TIME UPDATE #2 — adds the team roster ("who joined what team").
-- Run AFTER apply-updates.sql. Safe to run more than once.
--
-- HOW TO USE: Supabase → SQL Editor → New query → paste this file → Run.
-- ===========================================================================

create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  client_id  text unique,
  team_id    uuid not null references public.teams(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "read members" on public.team_members;
create policy "read members" on public.team_members for select using (true);

drop policy if exists "insert members" on public.team_members;
create policy "insert members" on public.team_members for insert with check (true);

drop policy if exists "update members" on public.team_members;
create policy "update members" on public.team_members for update using (true);
