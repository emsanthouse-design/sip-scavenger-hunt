// Read-side data access. Everything an intern needs is world-readable (anon key
// + permissive RLS). If the network is down or Supabase isn't configured yet,
// we fall back to the bundled seed so interns never see a blank challenge list.

import { supabase, isConfigured } from './supabase'
import { CHALLENGES, QUESTS, CONFIG } from '../config/seed'

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
    if (!error) return data || []
  }
  // IMPORTANT: no offline fallback for teams. A submission is filed under the
  // team's real UUID, so inventing a placeholder id (the old behavior) produced
  // rows the database rejects with "invalid input syntax for type uuid". If the
  // DB can't be reached we return no teams and the join screen asks to reload,
  // which is far safer than letting someone "join" with an id that can't submit.
  return []
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
  // Filter interns to their own team's changes server-side. Without this every
  // client re-fetched on every other team's submission — an O(n^2) query storm
  // across ~20 phones that helped exhaust the DB connection pool (429s).
  const changeSpec = { event: '*', schema: 'public', table: 'submissions' }
  if (teamId) changeSpec.filter = `team_id=eq.${teamId}`
  const channel = supabase
    .channel('submissions-' + (teamId || 'all'))
    .on('postgres_changes', changeSpec, (payload) => onChange(payload))
    .subscribe()
  return () => supabase.removeChannel(channel)
}
