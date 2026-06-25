// Read-side data access. Everything an intern needs is world-readable (anon key
// + permissive RLS). If the network is down or Supabase isn't configured yet,
// we fall back to the bundled seed so interns never see a blank challenge list.

import { supabase, isConfigured } from './supabase'
import { CHALLENGES, QUESTS, CONFIG, TEAMS } from '../config/seed'

// Normalize a DB challenge row (snake_case) into the shape the UI expects,
// tolerating either source so seed + DB are interchangeable.
function normChallenge(c) {
  return {
    id: c.id,
    quest: c.quest,
    title: c.title,
    points: c.points,
    maxClaims: c.max_claims ?? c.maxClaims ?? 1,
    evidence: c.evidence ?? c.evidence_type ?? 'photo',
    enhanced: c.enhanced ?? false,
    hint: c.hint ?? null,
    active: c.active ?? true,
    sort_order: c.sort_order ?? 0,
  }
}

export async function loadChallenges() {
  if (isConfigured) {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('quest', { ascending: true })
      .order('sort_order', { ascending: true })
    if (!error && data?.length) return data.map(normChallenge)
  }
  return CHALLENGES.map(normChallenge)
}

export async function loadTeams() {
  if (isConfigured) {
    const { data, error } = await supabase.from('teams').select('*').order('name')
    if (!error && data?.length) return data
  }
  // Seed fallback: synthesize stable-ish ids from the join code.
  return TEAMS.map((t) => ({ id: t.join_code, name: t.name, join_code: t.join_code }))
}

export async function loadConfig() {
  if (isConfigured) {
    const { data, error } = await supabase.from('config').select('*').eq('id', 1).single()
    if (!error && data?.value) return data.value
  }
  return CONFIG
}

export async function loadQuests() {
  // Quests are static metadata; keep them in code (they don't change per event).
  return QUESTS
}

// All submissions (admin) or one team's submissions (intern view).
export async function loadSubmissions({ teamId } = {}) {
  if (!isConfigured) return []
  let q = supabase.from('submissions').select('*').order('created_at', { ascending: false })
  if (teamId) q = q.eq('team_id', teamId)
  const { data, error } = await q
  if (error) return []
  return data || []
}

// Subscribe to live submission changes. Returns an unsubscribe function.
// Falls back to a no-op if Supabase isn't configured.
export function subscribeSubmissions(onChange, { teamId } = {}) {
  if (!isConfigured) return () => {}
  const channel = supabase
    .channel('submissions-' + (teamId || 'all'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions' },
      (payload) => onChange(payload),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
