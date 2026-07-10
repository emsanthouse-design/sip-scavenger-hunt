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
