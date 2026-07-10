// ---------------------------------------------------------------------------
// SCORING ENGINE — the heart of the app. Pure functions, no I/O, so the exact
// same math runs in the intern score header and the admin leaderboard.
//
// total = base + hero's journey bonus + roaming bonus
//
//   base   = sum of awarded points of a team's VERIFIED submissions, with
//            per-challenge caps (maxClaims) enforced and per-submission point
//            overrides honored.
//   hero   = breadth bonus for touching distinct quests (highest tier only).
//   roaming= one-time bonus if the team has a verified roaming submission.
//
// Pending submissions are shown but never counted toward the official total.
// We also compute a "provisional" number (if everything pending were verified)
// so the front end can show interns where they'd stand.
// ---------------------------------------------------------------------------

export const STATUS = { PENDING: 'pending', VERIFIED: 'verified', REJECTED: 'rejected' }

// Points a single submission is worth: an explicit admin override wins,
// otherwise the challenge's default points. Null/undefined override => default.
function submissionPoints(sub, challenge) {
  if (sub.awarded_points !== null && sub.awarded_points !== undefined) {
    return Number(sub.awarded_points) || 0
  }
  return Number(challenge?.points) || 0
}

// Apply a per-challenge cap: keep at most `maxClaims` submissions for each
// challenge, choosing the highest-value ones. Returns the kept submissions and
// the points they contribute. Operates on submissions already filtered to one
// team + one status.
function applyCaps(subs, challengeMap) {
  const byChallenge = new Map()
  for (const s of subs) {
    if (!byChallenge.has(s.challenge_id)) byChallenge.set(s.challenge_id, [])
    byChallenge.get(s.challenge_id).push(s)
  }
  let points = 0
  const kept = []
  for (const [challengeId, list] of byChallenge) {
    const challenge = challengeMap.get(challengeId)
    if (!challenge) continue
    const cap = Math.max(1, Number(challenge.max_claims ?? challenge.maxClaims ?? 1))
    // Highest-value submissions first, then keep up to the cap.
    const ranked = [...list].sort(
      (a, b) => submissionPoints(b, challenge) - submissionPoints(a, challenge),
    )
    for (const s of ranked.slice(0, cap)) {
      points += submissionPoints(s, challenge)
      kept.push(s)
    }
  }
  return { points, kept }
}

// Hero's Journey bonus: count distinct hero-eligible quests in which the team
// has at least one verified, point-bearing (>0) submission. Award the single
// highest tier reached.
function heroBonus(verifiedKept, challengeMap, questMap, heroTiers) {
  const touched = new Set()
  for (const s of verifiedKept) {
    const challenge = challengeMap.get(s.challenge_id)
    if (!challenge) continue
    const quest = questMap.get(challenge.quest)
    const eligible = quest ? quest.heroEligible !== false : challenge.quest >= 1 && challenge.quest <= 5
    if (eligible && submissionPoints(s, challenge) > 0) touched.add(challenge.quest)
  }
  const count = touched.size
  const tiers = [...(heroTiers || [])].sort((a, b) => a.quests - b.quests)
  let bonus = 0
  for (const t of tiers) if (count >= t.quests) bonus = t.bonus
  return { bonus, questsTouched: count }
}

// Build fast lookup maps from arrays of challenges / quests.
export function buildMaps(challenges, quests) {
  const challengeMap = new Map(challenges.map((c) => [c.id, c]))
  const questMap = new Map((quests || []).map((q) => [q.id, q]))
  return { challengeMap, questMap }
}

// Score one team given that team's submissions.
//   submissions: array for THIS team only
//   returns { base, heroJourneyBonus, roamingBonus, total,
//             questsTouched, provisionalTotal, pendingCount, verifiedCount }
export function scoreTeam(submissions, { challengeMap, questMap, config }) {
  const heroTiers = config?.heroTiers || []

  const verified = submissions.filter((s) => s.status === STATUS.VERIFIED)
  const pending = submissions.filter((s) => s.status === STATUS.PENDING)

  // Roaming is a special challenge (quest 0); pull it out of base scoring so the
  // cap logic treats it as the one-time bonus it is.
  const isRoaming = (s) => {
    const c = challengeMap.get(s.challenge_id)
    return c && c.quest === 0
  }

  const verifiedBaseSubs = verified.filter((s) => !isRoaming(s))
  const { points: base, kept: verifiedKept } = applyCaps(verifiedBaseSubs, challengeMap)

  const { bonus: heroJourneyBonus, questsTouched } = heroBonus(
    verifiedKept, challengeMap, questMap, heroTiers,
  )

  // Roaming bonus: one-time, value comes from the roaming challenge's points.
  const roamingVerified = verified.find(isRoaming)
  let roamingBonus = 0
  if (roamingVerified) {
    const c = challengeMap.get(roamingVerified.challenge_id)
    roamingBonus = submissionPoints(roamingVerified, c)
  }

  const total = base + heroJourneyBonus + roamingBonus

  // Provisional: what the total would be if every pending submission were
  // verified at its default/override points. Useful "if all verified" hint.
  const provisionalBaseSubs = [...verifiedBaseSubs, ...pending.filter((s) => !isRoaming(s))]
  const { points: provBase, kept: provKept } = applyCaps(provisionalBaseSubs, challengeMap)
  const { bonus: provHero } = heroBonus(provKept, challengeMap, questMap, heroTiers)
  const anyRoaming = roamingVerified || pending.find(isRoaming)
  let provRoaming = roamingBonus
  if (!roamingVerified && anyRoaming) {
    const c = challengeMap.get(anyRoaming.challenge_id)
    provRoaming = submissionPoints(anyRoaming, c)
  }
  const provisionalTotal = provBase + provHero + provRoaming

  return {
    base,
    heroJourneyBonus,
    roamingBonus,
    total,
    questsTouched,
    provisionalTotal,
    pendingCount: pending.length,
    verifiedCount: verified.length,
  }
}

// Verified points per quest for one team, caps enforced — powers the admin
// "strategy fingerprint" view. Returns Map<questId, points>.
export function pointsByQuest(submissions, { challengeMap }) {
  const verified = submissions.filter((s) => s.status === STATUS.VERIFIED)
  const { kept } = applyCaps(verified, challengeMap)
  const by = new Map()
  for (const s of kept) {
    const c = challengeMap.get(s.challenge_id)
    if (!c) continue
    by.set(c.quest, (by.get(c.quest) || 0) + submissionPoints(s, c))
  }
  return by
}

// Next Hero's Journey tier a team is reaching for (for the meter UI).
// Returns { current, nextAt, nextBonus } or null if maxed out.
export function nextHeroTier(questsTouched, heroTiers) {
  const tiers = [...(heroTiers || [])].sort((a, b) => a.quests - b.quests)
  for (const t of tiers) {
    if (questsTouched < t.quests) return { nextAt: t.quests, nextBonus: t.bonus }
  }
  return null
}

// Score every team at once; returns a leaderboard sorted high-to-low.
//   submissionsByTeam: Map<teamId, submissions[]>  OR  flat array of submissions
export function buildLeaderboard(teams, submissions, ctx) {
  const byTeam = new Map(teams.map((t) => [t.id, []]))
  for (const s of submissions) {
    if (byTeam.has(s.team_id)) byTeam.get(s.team_id).push(s)
  }
  const rows = teams.map((t) => ({
    team: t,
    score: scoreTeam(byTeam.get(t.id) || [], ctx),
  }))
  rows.sort((a, b) => b.score.total - a.score.total || b.score.base - a.score.base)
  return rows
}
