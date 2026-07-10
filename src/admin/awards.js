// Honorable-mention math for the reveal. Pure functions over data the
// dashboard already has — nothing here touches the database.

import { CHALLENGE_LOCATIONS } from '../config/locations'

// Distance between two lat/lng points in miles (haversine).
function miles(a, b) {
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// "Boots made for walkin'": for each team, the two farthest-apart pinned spots
// they completed (verified); winner is the team with the biggest spread.
export function computeBoots(teams, submissions) {
  let best = null
  for (const team of teams) {
    const spots = []
    const seen = new Set()
    for (const s of submissions) {
      if (s.team_id !== team.id || s.status !== 'verified') continue
      const loc = CHALLENGE_LOCATIONS[s.challenge_id]
      if (!loc || seen.has(s.challenge_id)) continue
      seen.add(s.challenge_id)
      spots.push({ ...loc, challengeId: s.challenge_id })
    }
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const d = miles(spots[i], spots[j])
        if (!best || d > best.miles) {
          best = { team, a: spots[i], b: spots[j], miles: d }
        }
      }
    }
  }
  return best // null if no team has 2+ pinned completions
}

// Auto-computed superlatives. Any of these can be null if there's no data.
export function computeSuperlatives(teams, submissions) {
  const teamName = new Map(teams.map((t) => [t.id, t.name]))
  const byTime = [...submissions].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  )

  const fmt = (s) => ({
    team: teamName.get(s.team_id) || 'A team',
    who: s.submitted_by || null,
    time: new Date(s.created_at).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    }),
  })

  const earlyBird = byTime.length ? fmt(byTime[0]) : null
  const verifiedByTime = byTime.filter((s) => s.status === 'verified')
  const buzzer = verifiedByTime.length ? fmt(verifiedByTime[verifiedByTime.length - 1]) : null

  const counts = (list) => {
    const m = new Map()
    for (const s of list) m.set(s.team_id, (m.get(s.team_id) || 0) + 1)
    let top = null
    for (const [id, n] of m) if (!top || n > top.n) top = { id, n }
    return top ? { team: teamName.get(top.id) || 'A team', n: top.n } : null
  }
  const shutterbugs = counts(submissions)
  const rejected = submissions.filter((s) => s.status === 'rejected')
  const creative = rejected.length ? counts(rejected) : null

  // MVP: the person with the most verified submissions.
  const people = new Map()
  for (const s of verifiedByTime) {
    if (!s.submitted_by) continue
    const key = s.submitted_by.trim().toLowerCase()
    const cur = people.get(key) || { name: s.submitted_by, team: teamName.get(s.team_id), n: 0 }
    cur.n++
    people.set(key, cur)
  }
  let mvp = null
  for (const p of people.values()) if (!mvp || p.n > mvp.n) mvp = p

  return { earlyBird, buzzer, shutterbugs, creative, mvp }
}

// ESPN-style play-by-play recap: replays verified submissions chronologically,
// tracking running scores (caps + hero tiers included) to surface kickoff,
// first blood, big plays, lead changes, tier unlocks, the bounty, and the
// admin's 🎞 highlight picks. The tape CUTS OFF ~25 minutes before the end and
// lands on a cliffhanger so it can never spoil the winner reveal.
export function computeRecap(teams, submissions, { challengeMap, questMap, config }) {
  const heroTiers = (config?.heroTiers?.length
    ? config.heroTiers
    : [{ quests: 3, bonus: 5 }, { quests: 4, bonus: 10 }, { quests: 5, bonus: 15 }]
  ).slice().sort((a, b) => a.quests - b.quests)
  const teamName = new Map(teams.map((t) => [t.id, t.name]))
  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const [eh, em] = String(config?.endTime || '16:40').split(':').map(Number)
  const end = new Date()
  end.setHours(Number.isFinite(eh) ? eh : 16, Number.isFinite(em) ? em : 40, 0, 0)
  const cutoff = new Date(end.getTime() - 25 * 60000)

  const chrono = submissions
    .filter((s) => teamName.has(s.team_id))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const verified = chrono.filter(
    (s) =>
      s.status === 'verified' &&
      challengeMap.get(s.challenge_id) &&
      new Date(s.created_at) <= cutoff,
  )

  const moments = []
  if (chrono.length) {
    const f = chrono[0]
    moments.push({
      ts: +new Date(f.created_at), time: fmt(f.created_at), type: 'kickoff',
      head: "AND THEY'RE OFF",
      sub: `${teamName.get(f.team_id)} fires the first submission of the day`,
    })
  }

  const state = new Map(teams.map((t) => [t.id, { pts: 0, hero: 0, claims: new Map(), quests: new Set() }]))
  const total = (st) => st.pts + st.hero
  let leader = null
  let bigCount = 0
  // Running-score snapshots so every moment can carry a live scoreboard.
  const snapshots = []

  verified.forEach((s, idx) => {
    const c = challengeMap.get(s.challenge_id)
    const st = state.get(s.team_id)
    if (!c || !st) return
    const cap = Math.max(1, Number(c.maxClaims ?? c.max_claims ?? 1))
    const claimed = st.claims.get(c.id) || 0
    if (claimed >= cap) return
    st.claims.set(c.id, claimed + 1)
    const pts = s.awarded_points != null ? Number(s.awarded_points) || 0 : Number(c.points) || 0
    st.pts += pts
    const quest = questMap.get(c.quest)
    const heroEligible = quest ? quest.heroEligible !== false : c.quest >= 1 && c.quest <= 5
    if (heroEligible && pts > 0) st.quests.add(c.quest)
    const prevHero = st.hero
    st.hero = 0
    for (const t of heroTiers) if (st.quests.size >= t.quests) st.hero = t.bonus

    const name = teamName.get(s.team_id)
    const ts = +new Date(s.created_at)
    const photo = s.evidence_type === 'photo' && s.evidence_path ? s.evidence_path : null
    if (idx === 0) {
      moments.push({ ts, time: fmt(s.created_at), type: 'first', head: 'FIRST POINTS ON THE BOARD', sub: `${name} draws first blood (+${pts})`, photo })
    } else if (c.quest === 0 && pts > (Number(c.points) || 0)) {
      moments.push({ ts, time: fmt(s.created_at), type: 'bounty', head: '💰 THE BOUNTY IS CLAIMED', sub: `${name} corners the roamers — +${pts}, and the complexion of this hunt just changed`, photo })
    } else if (pts >= 5 && bigCount < 4) {
      bigCount++
      moments.push({ ts, time: fmt(s.created_at), type: 'big', head: `BIG PLAY: +${pts}`, sub: `${name} banks “${c.title}”`, photo })
    }
    if (st.hero > prevHero) {
      moments.push({ ts, time: fmt(s.created_at), type: 'tier', head: `JOURNEY BONUS UNLOCKED: +${st.hero}`, sub: `${name} has now scored in ${st.quests.size} quests — the breadth pays off` })
    }
    const standing = [...state.entries()].map(([id, v]) => ({ id, tot: total(v) })).sort((a, b) => b.tot - a.tot)
    if (standing.length >= 2) {
      const now = standing[0].tot === standing[1].tot ? 'tie' : standing[0].id
      if (now !== leader && leader !== null) {
        // Attach the photo of the very submission that flipped the game.
        moments.push(
          now === 'tie'
            ? { ts, time: fmt(s.created_at), type: 'lead', head: 'ALL SQUARE', sub: `“${c.title}” levels it at ${standing[0].tot} apiece`, photo }
            : { ts, time: fmt(s.created_at), type: 'lead', head: 'LEAD CHANGE', sub: `${teamName.get(now)} snatches the lead, ${standing[0].tot}–${standing[1].tot} — “${c.title}” did it`, photo },
        )
      }
      leader = now
    }
    snapshots.push({ ts, scores: teams.map((t) => ({ id: t.id, tot: total(state.get(t.id)) })) })
  })

  // HIGHLIGHT moments (photo + caption only — no scores, so nothing spoils):
  // the admin's 🎞 picks come first, then seeded-random verified photos fill
  // up to the target so the tape is rich with pictures either way.
  const HIGHLIGHT_TARGET = 8
  const usedPhotos = new Set(moments.map((m) => m.photo).filter(Boolean))
  const pickIds = new Set(config?.reelIds || [])
  let highlights = 0
  const addHighlight = (s) => {
    const c = challengeMap.get(s.challenge_id)
    moments.push({
      ts: +new Date(s.created_at), time: fmt(s.created_at), type: 'photo',
      head: 'ONE FOR THE HIGHLIGHT REEL',
      sub: `${teamName.get(s.team_id)}${c ? ` — “${c.title}”` : ''}`,
      photo: s.evidence_path,
    })
    usedPhotos.add(s.evidence_path)
    highlights++
  }
  const isUsablePhoto = (s) =>
    s.status === 'verified' && s.evidence_type === 'photo' && s.evidence_path &&
    !usedPhotos.has(s.evidence_path)
  for (const s of chrono) {
    if (highlights >= HIGHLIGHT_TARGET) break
    if (pickIds.has(s.id) && isUsablePhoto(s)) addHighlight(s)
  }
  if (highlights < HIGHLIGHT_TARGET) {
    const pool = chrono.filter((s) => !pickIds.has(s.id) && isUsablePhoto(s))
    let seed = 987654321 >>> 0
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    for (const s of pool) {
      if (highlights >= HIGHLIGHT_TARGET) break
      addHighlight(s)
    }
  }

  moments.sort((a, b) => a.ts - b.ts)

  // Attach a running-scoreboard snapshot to every moment — but the board
  // "goes dark" (scores: null → the UI shows ??) for the final stretch of the
  // tape, so the late-game numbers can’t give away the ending.
  const darkFrom = end.getTime() - 35 * 60000
  const zero = teams.map((t) => ({ id: t.id, tot: 0 }))
  for (const m of moments) {
    if (m.ts >= darkFrom) {
      m.scores = null
      continue
    }
    let sc = zero
    for (const snap of snapshots) {
      if (snap.ts <= m.ts) sc = snap.scores
      else break
    }
    m.scores = sc
  }

  // Cliffhanger: deliberately cryptic — no standings, just the last accepted
  // play of the day, then the tape cuts out.
  const lastV = [...chrono]
    .reverse()
    .find((s) => s.status === 'verified' && challengeMap.get(s.challenge_id))
  if (lastV) {
    const lc = challengeMap.get(lastV.challenge_id)
    const lpts =
      lastV.awarded_points != null
        ? Number(lastV.awarded_points) || 0
        : Number(lc?.points) || 0
    moments.push({
      ts: Number.MAX_SAFE_INTEGER,
      time: fmt(lastV.created_at),
      type: 'cliff',
      head: 'THE TAPE CUTS OUT',
      sub: `The final submission of the day was accepted at ${fmt(lastV.created_at)}, worth ${lpts} point${lpts === 1 ? '' : 's'}… and that’s where we leave it 🍿`,
      scores: null,
    })
  }

  // Keep the tape tight: shed extra big plays, then extra highlights.
  let out = moments
  for (const shedType of ['big', 'photo']) {
    while (out.length > 20 && out.some((m) => m.type === shedType)) {
      const i = out.findIndex((m) => m.type === shedType)
      out = [...out.slice(0, i), ...out.slice(i + 1)]
    }
  }
  return out
}

// Bonus round: Hero's Journey tiers reached, roaming claims, LinkedIn reposts.
export function computeBonuses(rows, submissions, challengeMap) {
  const hero = rows
    .filter((r) => r.score.heroJourneyBonus > 0)
    .map((r) => ({
      team: r.team.name,
      bonus: r.score.heroJourneyBonus,
      quests: r.score.questsTouched,
    }))

  const roaming = []
  const linkedin = new Map()
  for (const s of submissions) {
    if (s.status !== 'verified') continue
    const c = challengeMap.get(s.challenge_id)
    if (!c) continue
    if (c.quest === 0) {
      roaming.push({
        teamId: s.team_id,
        who: s.submitted_by,
        time: new Date(s.created_at).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
      })
    }
    if (c.quest === 6) linkedin.set(s.team_id, (linkedin.get(s.team_id) || 0) + 1)
  }
  return { hero, roaming, linkedin }
}
