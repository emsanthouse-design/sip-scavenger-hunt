# SIP Scavenger Hunt Tracker

A phone-first web app for the **City of Boston Summer Internship Program**
scavenger hunt (July 10, 2026). Interns join a team, check off challenges, and
upload photo/video evidence from their phones — even on spotty cell service. The
admin (Erin) watches submissions arrive live, verifies the evidence, and reads a
live leaderboard so a winner can be announced the same afternoon.

- **Front end** — phone-first, one-handed, works over a weak connection.
  Submissions are saved on the device and keep retrying until they upload, so
  nothing is lost if signal drops mid-upload.
- **Admin dashboard** (`/admin`) — live submission queue, inline evidence viewer,
  verify / reject / partial-credit controls, live leaderboard, and a Settings
  screen to edit challenges, points, caps, and teams **without touching code**.

Built with **Vite + React** (hosting on **Netlify**) and **Supabase** (database,
file storage, and realtime) — all on free tiers, $0 for an event this size.

---

## 🚀 Setup checklist (about 20 minutes, no coding)

You'll set up two free accounts — **Supabase** (data + photos) and **Netlify**
(the website) — and paste a few keys between them. Follow in order.

### 1. Create the Supabase project (the database + photo storage)

1. Go to **https://supabase.com** → sign up (free) → **New project**.
2. Give it a name (e.g. `sip-hunt`), set a database password (save it
   somewhere), pick a region near Boston (e.g. *East US*), and create it.
3. Wait ~2 minutes for it to finish provisioning.
4. In the left sidebar, open **SQL Editor → New query**. Open the file
   [`supabase/schema.sql`](./supabase/schema.sql) from this repo, copy its
   **entire** contents, paste into the query box, and click **Run**.
   This creates all the tables, security rules, the photo storage bucket, and
   seeds the challenges/teams. (It's safe to run again later if needed.)
5. In the sidebar, open **Project Settings → API Keys**. You'll copy three values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon / publishable** key (a long string — safe to expose)
   - **service_role / secret** key (a long string — **keep secret**)

### 2. Deploy to Netlify (the actual website)

1. Go to **https://netlify.com** → sign up (free, use GitHub) → **Add new
   project → Import an existing project** → connect GitHub → pick this repo.
2. Netlify reads the build settings automatically from `netlify.toml`
   (build command `npm run build`, publish directory `dist`). Just click
   **Deploy**.
3. After the first deploy, open **Site configuration → Environment variables** and
   add these four (use the values you copied from Supabase). Leave each one on the
   defaults — secret box **unchecked**, **All scopes**, **Same value for all
   deploy contexts**:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | your Supabase **Project URL** |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase **anon / publishable** key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **service_role / secret** key |
   | `ADMIN_PASSWORD` | any password you choose for the admin dashboard |

4. Trigger a fresh deploy so the new variables take effect:
   **Deploys → Trigger deploy → Deploy site**.

> Note: `netlify.toml` tells Netlify's secret scanner that the two `VITE_`
> Supabase values are public by design (they're embedded in the browser bundle
> and protected by row-level security), so the build won't fail on finding them.

### 3. You're live 🎉

- **Interns** open the site's main URL (e.g. `https://your-site.netlify.app`).
- **You** open `https://your-site.netlify.app/admin` and sign in with the
  `ADMIN_PASSWORD` you set.

Tip: make a QR code of the main URL for the day-of handout. Team join codes are
**HUB**, **BAY**, **FEN** by default — change them in **Admin → Settings**.

---

## 📱 How it works on the day

**Interns**

1. Open the site, type their **team code** (and optionally their name), tap
   **Join team**. The choice is remembered on their phone.
2. They see all challenges grouped into the 5 quests, each with its point value.
3. Tap a challenge → take/choose a photo or video (or type an answer) → **Submit
   evidence**. It uploads in the background and retries if signal is weak.
4. The score header shows their live total (verified points), a provisional
   "if all verified" number, and the **Hero's Journey** breadth meter.

**You (admin)**

1. Open `/admin`, sign in.
2. **Queue** tab: new submissions appear automatically. Tap **Verify** (awards
   the points), **Reject** (optionally with a note the team sees), or type a
   number and **Verify with partial credit**.
3. **Leaderboard** tab: live standings with each team's base + bonuses + total,
   and how many are still pending.
4. **Settings** tab: edit point values, caps, the challenge list, teams, the
   Hero's Journey tiers, and the roaming bonus — saved instantly, no redeploy.

---

## 🏆 Scoring (config-driven)

`total = base + Hero's Journey bonus + roaming bonus`

- **Base** — sum of the points of a team's **verified** challenges. Pending
  submissions are shown but never counted until you verify them. Per-challenge
  **caps** are enforced (e.g. "public art (max 2)", "sister city ×2"), and you
  can override the points on any single submission (partial credit).
- **Hero's Journey** — breadth bonus for touching distinct quests: 3 quests
  `+5`, 4 quests `+10`, all 5 `+15` (only the highest tier, not cumulative).
- **Roaming bonus** — one-time per team for photographing both roamers
  (Isabella & Avis) together with 2+ teammates. Default `+3`, editable.

Every photo/video must include at least **2 teammates** — a verification check
you eyeball in the admin view.

All point values, caps, bonus tiers, and the challenge list are **editable in
Admin → Settings** (stored in the database). The bundled
[`src/config/seed.js`](./src/config/seed.js) is the human-readable mirror of what
gets seeded, and also a safety fallback the front end renders if the database is
ever briefly unreachable.

---

## 🔒 Security model (deliberately lightweight)

The brief notes this is not sensitive data, so the design stays simple but is not
tamperable where it matters:

- The browser uses the **public anon key**. Database row-level security lets
  anyone read the hunt and submit, but **nobody can change a verification result**
  with that key.
- Verifying / rejecting / editing config goes through **Netlify Functions** that
  hold the secret `service_role` key server-side and check `ADMIN_PASSWORD` on
  every request. So a curious intern can't award themselves points.

---

## 💻 Local development (optional)

```bash
npm install
cp .env.example .env     # fill in your Supabase URL + anon key (+ admin keys)
npm run dev              # front end only, at http://localhost:5173

# To test the admin verify/config endpoints locally too, use the Netlify CLI:
npm install -g netlify-cli
netlify dev             # serves the app AND the /api/* functions together
```

`npm run build` produces the production bundle in `dist/`.

---

## 🛠 Open questions from the brief — how this build resolved them

These were flagged as "decide during the build." The defaults below are all
editable in Settings, so nothing is locked in:

- **Video over cellular** — videos are kept as short clips with a **40 MB cap**
  (configurable in `src/lib/image.js`); photos are auto-compressed client-side
  before upload. Over a weak signal, short clips upload far more reliably.
- **Partial credit** — implemented as a per-submission **points override**
  (verify with any number), which the brief named as the simplest sufficient
  model.
- **Everyone submits** — any team member on any phone can submit; it syncs to the
  shared team total, and duplicate submissions of the same challenge respect the
  cap so they don't double-count.
- **Pending vs verified** — verified points are the official total; pending is
  shown separately, plus a provisional "if all verified" figure.
- **Roaming bonus** — one-time per team, value editable in Settings (default +3).
- **"Accessibility office" slot** — left as an editable, hidden-by-default
  challenge in Quest 4 (turn it on / rename it in Settings).

---

## 🔁 Iterating from here (how to change things)

Deploys are automatic: anything that lands on the `main` branch rebuilds and goes
live in ~1–2 minutes, no clicking. So "iterating" just means making changes —
publishing takes care of itself. There are two lanes depending on the change.

### Lane 1 — Change it yourself, instantly, no code
Everything in **Admin → Settings** writes straight to the database and is live
immediately. Use it for last-minute and day-of tweaks:
- Challenge **titles**, **point values**, **caps** (×2 etc.), show/hide a
  challenge (the **Active** toggle), the **enhanced-proof** flag
- **Teams** (names + join codes)
- **Hero's Journey** tier bonuses and the **roaming** bonus value

### Lane 2 — Needs a code change (ask Claude)
Describe what you want in plain English; the change is edited, pushed, and live
in ~2 minutes. This covers:
- **Aesthetic / thematic** changes — colors, fonts, renaming "Hero's Journey"
  (e.g. "Paul Revere's Midnight Ride"), the historic look, copy, icons
- **Structure** — new evidence types, new fields, in-app riddle text, a new quest
- **New features** and any intern-facing copy that isn't a challenge title

### Finalizing the content (the working-draft → final pass)
The challenge content is seeded from a draft. Important: re-running
`supabase/schema.sql` will **not** overwrite challenges that already exist (it
skips them on purpose, so the script stays safe to re-run). So when the final
draft is ready:
- **Small/scattered edits** → do them in **Settings** (self-serve).
- **Big or structural changes** (many challenges reworded, new evidence
  requirements, reordering, new items) → hand the finalized draft to Claude and
  it'll bulk-update the seed and push an overwrite in one shot — far less tedious
  than retyping everything into Settings.

### Testing the experience from both sides
- **Intern side:** the main URL → join with a team code → submit a real photo
  (do this on an actual phone — it's built phone-first).
- **Admin side:** `/admin` → password → verify / reject / partial credit → watch
  the leaderboard move.

Keep a running list of "this should feel different" notes and hand them over in
whatever form is easiest (a list, screenshots). Each gets triaged into a quick
tweak or a bigger lift.

---

## Project structure

```
index.html                   App shell + fonts
netlify.toml                 Build + SPA routing config
supabase/schema.sql          Run this once in Supabase to set everything up
src/
  config/seed.js             Challenges + scoring config (mirror of the DB seed)
  lib/
    scoring.js               The scoring engine (pure, unit-tested)
    supabase.js  data.js     Read-side data access (+ seed fallback)
    outbox.js  idb.js        Offline-resilient submission queue (IndexedDB)
    image.js                 Client-side photo compression + video size cap
    adminApi.js              Calls to the password-gated admin functions
  intern/                    Phone-first intern experience
  admin/                     Verification dashboard
netlify/functions/
  admin-review.mjs           Verify / reject / partial credit (server-side)
  admin-config.mjs           Edit challenges / config / teams (server-side)
```
