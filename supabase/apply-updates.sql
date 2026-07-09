-- ===========================================================================
-- ONE-TIME UPDATE — apply the content changes from Isabella's revised draft to
-- an ALREADY-SEEDED database. Safe to run more than once (idempotent upserts).
--
-- HOW TO USE: Supabase → SQL Editor → New query → paste this whole file → Run.
-- It does NOT touch teams, submissions, or scoring config — only challenges.
--
-- What it does:
--   1. Adds the new Quest 4 challenge (identify the flag outside City Hall).
--   2. Fixes the Quest 4 ordering so the packet numbers stay clean.
--   3. Updates the facilitator answer hints from the official answer key
--      (resolves Riddle 8 = Boston Center for the Arts, Riddle 12 = Bova's OR
--      Mike's, Riddle 2 = Granary / John Hancock's grave).
--   4. Small wording fix on the 9th-floor map video.
-- ===========================================================================

-- 1. New challenge: identify the flag outside City Hall (enhanced — needs a why).
insert into public.challenges
  (id, quest, title, points, max_claims, evidence_type, enhanced, hint, active, sort_order)
values
  ('cityhall-flag', 4,
   'Identify the flag (besides the US & Boston flags) flown outside City Hall today — and explain why it matters',
   2, 1, 'photo', true, null, true, 2)
on conflict (id) do update set
  title = excluded.title,
  enhanced = excluded.enhanced,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- 2. Re-space the rest of Quest 4 so ordering (and packet numbering) is clean.
update public.challenges set sort_order = 3 where id = 'cityhall-councilor';
update public.challenges set sort_order = 4 where id = 'cityhall-service';
update public.challenges set sort_order = 5 where id = 'cityhall-bcyf';
update public.challenges set sort_order = 6 where id = 'cityhall-mezzanine';
update public.challenges set sort_order = 7 where id = 'cityhall-common';
update public.challenges set sort_order = 8 where id = 'cityhall-slot';

-- 3. Official riddle answers (facilitator-only hints).
update public.challenges set hint = 'Answer: Granary Burying Ground (John Hancock''s grave).' where id = 'riddle-granary';
update public.challenges set hint = 'Answer: Boston Center for the Arts.'                      where id = 'riddle-art-venue';
update public.challenges set hint = 'Answer: Bova''s Bakery OR Mike''s Pastry (both accepted).' where id = 'riddle-mikes-pastry';

-- 4. Wording fix.
update public.challenges
  set title = '15-second video explaining what one of the 9th-floor maps in City Hall shows'
  where id = 'video-9th-map';
