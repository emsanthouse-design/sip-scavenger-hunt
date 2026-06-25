# Project context — SIP Scavenger Hunt Tracker

Context for anyone (including Claude) picking this up later. The full
requirements live in the original build brief + planning doc; this is the
working summary and the decisions baked into the code.

## What it is
A phone-first web app for the City of Boston SIP scavenger hunt (July 10, 2026,
~2:00–4:45 PM, ~15–20 interns in 3 teams of 5, one admin). Interns check off
challenges and upload photo/video evidence; the admin verifies live and watches a
leaderboard to announce a winner the same day. Single event, $0 budget. Priority:
reliability over flaky cellular + a frictionless intern experience, NOT scale.

## Stack
- Vite + React SPA. One build serves both the intern app and the admin dashboard
  (`/admin` is a client-side route guarded by a password).
- Supabase: Postgres (data), Storage (evidence files), Realtime (live admin
  queue). Public **anon** key in the browser.
- Netlify: static hosting + two v2 Functions that hold the **service_role** key
  for tamper-resistant admin writes.

## Non-negotiables (from the brief)
- Mobile-first, one-handed, used while walking the city.
- Resilient to dropped signal: optimistic UI, retries, **no lost submissions**.
  → Implemented via an IndexedDB-backed outbox (`src/lib/outbox.js` + `idb.js`)
  that persists the actual photo/video Blob and retries with backoff + on
  reconnect. Inserts are idempotent (unique `client_id`).
- Real-time-ish admin verification (Supabase realtime + a 12s polling fallback).
- Config-driven challenges + scoring, editable without a redeploy (Admin →
  Settings, stored in DB; `src/config/seed.js` mirrors the seed + is a fallback).
- On-brand: City of Boston OHR tokens (Charles Blue #091F2F, Optimistic Blue
  #1871BD, Freedom Trail Red #FB4D42; Montserrat display + Lora body).

## Scoring (the heart — `src/lib/scoring.js`, unit-tested)
`total = base + Hero's Journey bonus + roaming bonus`
- base = verified challenges' points, caps enforced (`max_claims`), per-submission
  override allowed (partial credit). Pending shown but not counted; a provisional
  "if all verified" total is also computed.
- Hero's Journey: distinct quests (1–5) with ≥1 verified point-bearing sub →
  3:+5, 4:+10, 5:+15 (highest tier only).
- Roaming: one-time per team, value = the `roaming-bonus` challenge's points
  (quest 0, excluded from Hero's Journey). Default +3.

## Security model (intentionally light — not sensitive data)
- Interns: anon key. RLS allows read + insert(pending) only; no anon update/delete
  → verification can't be faked.
- Admin: `/api/admin-review` + `/api/admin-config` Netlify Functions, gated by
  `ADMIN_PASSWORD`, writing with `service_role`.

## Env vars
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (front end);
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` (server / Netlify only).

## Decisions on the brief's open questions
- Video: short clips + 40 MB cap (`src/lib/image.js`); photos auto-compressed.
- Partial credit: per-submission points override.
- Everyone submits, syncs to shared team total, caps prevent double-counting.
- Pending vs verified: verified is official; pending shown separately + provisional.
- "Accessibility office" item: editable, inactive-by-default challenge in Quest 4.

## Content source of truth
Challenges/points seeded from the planning doc's "Working Draft" (the most current
values), reconciled with the brief's scoring rules. Riddle answers are stored as
admin-only `hint`s on Quest 2 challenges (never shown to interns). Confirm the
Quest 2 "art venue" site and the exact Haitian-center name before the event.

## Tests
`node` against `src/lib/scoring.js` covers tiers, caps, roaming, pending vs
provisional, partial credit, rejections. Build verified with `npm run build`;
intern + admin flows smoke-tested in a real browser.
