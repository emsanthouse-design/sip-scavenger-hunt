# 🛠 Admin Runbook — SIP Scavenger Hunt

Everything you (Erin) need to run the app on event day, plus a troubleshooting
playbook for anything that goes sideways. Keep this open on your laptop.

---

## 1. The 60-second mental model

Three free services work together:

| Piece | What it does | Where you manage it |
|------|---------------|---------------------|
| **Netlify** | Hosts the website (the app itself) | app.netlify.com → project `sip-scavenger-hunt` |
| **Supabase** | The database, photo/video storage, and live updates | supabase.com → project `sip-hunt` |
| **The app** | Intern view + your `/admin` dashboard | `sip-scavenger-hunt.netlify.app` |

The interns' browsers talk **directly** to Supabase to read challenges, upload
evidence, and file submissions. Your verify/reject actions go through a secure
server function so scores can't be faked.

**Key facts to have handy:**
- **App URL:** `https://sip-scavenger-hunt.netlify.app`
- **Admin URL:** `https://sip-scavenger-hunt.netlify.app/admin`
- **Admin password:** the `ADMIN_PASSWORD` you set in Netlify (Site
  configuration → Environment variables).
- **Team codes:** default `HUB`, `BAY`, `FEN` — change in **Admin → Settings**.
- **Health check (is the DB awake?):**
  `https://ynvqhwiccxztkgcljkfc.supabase.co/auth/v1/health` — should show a
  little blob of text, not an error.

---

## 2. ✅ Pre-event go/no-go checklist (do this ~1 hour before)

Run top to bottom. If all pass, you're go.

1. **Database awake?** Open the health-check URL above → shows text (not "can't
   be reached"). *(You're on the paid Supabase plan now, so it won't auto-pause.)*
2. **Site loads?** Open the app URL → you see the **Welcome/Join** screen (not
   "not connected to its database").
3. **Full round-trip works?** Join a test team → submit a photo → it appears in
   **/admin → Queue** → **Verify** it → it lands on the **Leaderboard**.
4. **Teams & codes right?** Admin → Settings → team names and codes match what's
   printed in the packets.
5. **Content matches the packet?** Spot-check a couple of challenge numbers/points
   against the printed packet.
6. **Admin password works** and you (and any co-verifier) know it.
7. **Wipe test data** (last step before players start): run in Supabase SQL
   Editor → `delete from public.submissions;`

---

## 3. Running verification (your main job during the hunt)

Go to **`/admin`**, sign in.

**Queue tab** — submissions appear here **automatically** (no refresh needed).
For each one:
- It shows the **team, challenge, who submitted, time,** and the **photo/video**
  inline (tap to enlarge / play).
- Reminders show automatically for **enhanced-proof** challenges (brochure,
  named exhibit, recorded answer) and the **facilitator answer** for riddles.
- **What to check:** at least **2 teammates in the shot**, and any enhanced
  requirement is met.
- Then choose:
  - **✓ Verify** — awards the full points.
  - **✕ Reject** — optionally add a note; the team sees it and can retry.
  - **Verify with partial credit** — type a number for partial points.

Use the **Pending / Verified / Rejected / All** filters to stay organized. Verify
steadily through the afternoon so there's no scramble at 4:45.

**Leaderboard tab** — live standings: each team's base + Hero's Journey + roaming,
total, and how many are still pending. This is what you read the winner from.

**Settings tab** — edit challenge text, points, caps, active/hidden, teams, the
Hero's Journey tiers, and the roaming bonus. **Saves instantly, no redeploy.**

---

## 4. 🚑 Troubleshooting playbook

Find the symptom, apply the fix.

### "The app isn't connected to its database yet"
- **Cause:** the Supabase keys aren't reaching the site.
- **Fix:** Netlify → Site configuration → Environment variables → confirm
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` each have a value (the anon one
  must not be empty). Then **Deploys → Trigger deploy → Deploy site** and reload.

### "This site can't be reached" / "Load failed" / uploads fail everywhere
- **Cause:** the Supabase project is **paused/asleep** (its web address stops
  resolving). *This was the big one the night before.*
- **Check:** open the health-check URL — if it won't load, the project is down.
- **Fix:** supabase.com → project `sip-hunt` → click **Restore/Resume**. Wait
  2–5 min, re-check the health URL. *(On the paid plan this shouldn't happen; if
  it ever does, resume it.)*

### An intern's uploads fail with "invalid input syntax for type uuid"
- **Cause:** they joined while the DB was briefly unreachable and got a bad team
  ID. *(This is now auto-fixed in the app.)*
- **Fix:** have them **fully close the tab, reopen the app, and rejoin** their
  team. The app auto-clears the bad ID and grabs the real one.

### "429 / too many connections"
- **Cause:** too much load at once — usually a pile of failed submissions all
  retrying. *(Largely fixed now.)*
- **Fix:** it typically clears on its own within a minute. If it persists under
  real load, in Supabase you can temporarily **scale up the project's compute**
  (Project Settings → Compute/Infrastructure) — the paid plan allows this.

### A video is stuck "Uploading…" forever
- **Cause:** the file is large and slow over cell, or over the size limit.
- **Fix:** tell the team to keep clips **15–30s at 1080p (not 4K)**. The cap is
  **100 MB** in the app; if you need bigger, raise it in **Supabase → Storage →
  Settings → Upload file size limit** to match, and tell me to bump the app cap.

### Evidence won't load / shows blank in the admin queue
- **Cause:** the intern's upload hasn't finished landing yet (weak signal).
- **Fix:** wait — it'll appear when their phone finishes uploading. Not lost.

### An intern joined the wrong team
- **Fix:** they scroll to the bottom of the app and tap **"Joined the wrong
  team?"** then rejoin with the correct code.

### You forgot / need to change the admin password
- **Fix:** Netlify → Environment variables → edit `ADMIN_PASSWORD` → **redeploy**.

### You need to wipe everything and start clean
- Supabase → SQL Editor → `delete from public.submissions;` (clears queue +
  leaderboard; keeps teams, challenges, settings).

---

## 5. Editing content on the fly

Anything about the **challenges, points, caps, teams, or bonuses** → **Admin →
Settings** (instant, no code). Anything about the **look, wording of copy, or
new features** → message me and I'll push it (live in ~2 minutes).

---

## 6. Announcing the winner

At ~4:45, open **Leaderboard**. Verify any last stragglers in the Queue first so
the numbers are final, then read the top team. The board already includes base
points + Hero's Journey + roaming bonuses.

---

## 7. After the event

- **💳 Cancel Supabase Pro** so you're not billed next month (Supabase → project
  → Settings → Billing → downgrade to Free). *Do this once you've exported
  anything you want to keep.*
- **Export the results** (optional keepsake): Supabase → Table Editor →
  `submissions` → export to CSV, or ask me to pull a summary.

---

## 8. If it all goes wrong (break-glass)

- The app's code lives at **github.com/emsanthouse-design/sip-scavenger-hunt**.
- The full project context is in `CLAUDE.md`; setup is in `README.md`.
- Worst case, scores can be tracked on paper for the afternoon and the app
  becomes a photo archive — the hunt still runs. But with the fixes in place,
  you shouldn't need this.

**You've got this. 🎉**
