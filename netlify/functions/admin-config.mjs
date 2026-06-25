// Netlify Function (v2): admin config editor.
// Lets the program manager edit the challenge list, point values/caps, scoring
// config, and teams BEFORE the event — no redeploy, no code change. Gated by the
// admin password; writes with the Supabase service_role key.

import { createClient } from '@supabase/supabase-js'

export const config = { path: '/api/admin-config' }

function admin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Coerce an incoming challenge into the DB column shape, defensively.
function cleanChallenge(c, i) {
  return {
    id: String(c.id),
    quest: Number(c.quest),
    title: String(c.title || '').slice(0, 300),
    points: Number(c.points) || 0,
    max_claims: Math.max(1, Number(c.maxClaims ?? c.max_claims ?? 1)),
    evidence_type: String(c.evidence ?? c.evidence_type ?? 'photo'),
    enhanced: Boolean(c.enhanced),
    hint: c.hint ? String(c.hint) : null,
    active: c.active === false ? false : true,
    sort_order: Number(c.sort_order ?? i),
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const expected = process.env.ADMIN_PASSWORD || ''
  const given = req.headers.get('x-admin-password') || ''
  if (!expected || given !== expected) return json({ error: 'Unauthorized' }, 401)

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }

  const db = admin()
  if (!db) return json({ error: 'Server not configured (missing Supabase keys)' }, 500)

  // Upsert challenges (does not delete removed ones automatically — set
  // active:false to hide instead, so historical submissions keep their labels).
  if (Array.isArray(payload.challenges)) {
    const rows = payload.challenges.map(cleanChallenge)
    const { error } = await db.from('challenges').upsert(rows, { onConflict: 'id' })
    if (error) return json({ error: 'challenges: ' + error.message }, 500)
  }

  // Upsert scoring config into the singleton row id=1.
  if (payload.config && typeof payload.config === 'object') {
    const { error } = await db
      .from('config')
      .upsert({ id: 1, value: payload.config }, { onConflict: 'id' })
    if (error) return json({ error: 'config: ' + error.message }, 500)
  }

  // Upsert teams (name + join_code), keyed by id when present.
  if (Array.isArray(payload.teams)) {
    const rows = payload.teams
      .filter((t) => t.name && t.join_code)
      .map((t) => ({
        ...(t.id ? { id: t.id } : {}),
        name: String(t.name).slice(0, 80),
        join_code: String(t.join_code).toUpperCase().slice(0, 16),
      }))
    if (rows.length) {
      const { error } = await db.from('teams').upsert(rows, { onConflict: 'join_code' })
      if (error) return json({ error: 'teams: ' + error.message }, 500)
    }
  }

  return json({ ok: true })
}
