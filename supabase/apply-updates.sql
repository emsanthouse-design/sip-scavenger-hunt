-- ===========================================================================
-- ONE-TIME UPDATE — bring an ALREADY-SEEDED database in line with the FINAL
-- planning doc. Safe to run more than once (idempotent).
--
-- HOW TO USE: Supabase → SQL Editor → New query → paste this whole file → Run.
-- It only touches the `challenges` list — never teams, submissions, or config.
--
-- What it does:
--   1. Adds the new Quest 4 flag challenge.
--   2. Adds the LinkedIn Bonus challenge (Quest 6): individual, +1 per teammate
--      the City reposts, one post per person (cap 5), evidence = a screenshot.
--   3. Hides "Photo with a City Council member" (dropped in the final draft).
--   4. Drops the "bring back a brochure" requirement from the BCYF stop.
--   5. Sets the official riddle answers as facilitator-only hints.
--   6. Small wording fix on the 9th-floor map video.
-- ===========================================================================

-- 1. New Quest 4 challenge: identify the flag outside City Hall (enhanced).
insert into public.challenges
  (id, quest, title, points, max_claims, evidence_type, enhanced, hint, active, sort_order)
values
  ('cityhall-flag', 4,
   'Identify the flag (besides the US & Boston flags) flown outside City Hall today — and explain why it matters',
   2, 1, 'photo', true, null, true, 2)
on conflict (id) do update set
  title = excluded.title, enhanced = excluded.enhanced,
  sort_order = excluded.sort_order, active = excluded.active;

-- 2. New LinkedIn Bonus challenge (Quest 6 — a bonus section, not one of the 5
--    quests, so it doesn't inflate the Hero's Journey breadth bonus).
insert into public.challenges
  (id, quest, title, points, max_claims, evidence_type, enhanced, hint, active, sort_order)
values
  ('linkedin-repost', 6,
   'LinkedIn: post a challenge photo — "What is Boston to you?" Tag @CityofBoston + the packet hashtags, then submit a screenshot here. +1 for each teammate the City reposts (one post per person).',
   1, 5, 'photo', true,
   'Award (and repost) only if it clears the bar: says something real, professional first-person voice, tags @CityofBoston + teammates + a hashtag, clear photo with 2+ teammates, nothing political/unsafe, clean copy. One post per person; +1 each.',
   true, 1)
on conflict (id) do update set
  title = excluded.title, points = excluded.points, max_claims = excluded.max_claims,
  evidence_type = excluded.evidence_type, enhanced = excluded.enhanced,
  hint = excluded.hint, active = excluded.active, sort_order = excluded.sort_order;

-- 3. Hide the City Council member photo (dropped in the final draft). Kept as a
--    hidden row so any historical submission still shows a label.
update public.challenges set active = false where id = 'cityhall-councilor';

-- 4. BCYF: drop the brochure requirement to match the final draft.
update public.challenges
  set title = 'Visit a BCYF center inside the perimeter', enhanced = false
  where id = 'cityhall-bcyf';

-- 5. Re-space Quest 4 ordering so packet numbering stays clean.
update public.challenges set sort_order = 3 where id = 'cityhall-councilor';
update public.challenges set sort_order = 4 where id = 'cityhall-service';
update public.challenges set sort_order = 5 where id = 'cityhall-bcyf';
update public.challenges set sort_order = 6 where id = 'cityhall-mezzanine';
update public.challenges set sort_order = 7 where id = 'cityhall-common';
update public.challenges set sort_order = 8 where id = 'cityhall-slot';

-- 6. Official riddle answers (facilitator-only hints).
update public.challenges set hint = 'Answer: Granary Burying Ground (John Hancock''s grave).' where id = 'riddle-granary';
update public.challenges set hint = 'Answer: Boston Center for the Arts.'                      where id = 'riddle-art-venue';
update public.challenges set hint = 'Answer: Bova''s Bakery OR Mike''s Pastry (both accepted).' where id = 'riddle-mikes-pastry';

-- 7. Wording fix.
update public.challenges
  set title = '15-second video explaining what one of the 9th-floor maps in City Hall shows'
  where id = 'video-9th-map';
