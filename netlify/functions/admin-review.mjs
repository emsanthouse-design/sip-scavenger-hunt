// Netlify Function (v2): admin verification endpoint.
// Holds the Supabase service_role key (bypasses RLS) and gates every write on
// the ADMIN_PASSWORD. Interns can never reach this; the public anon key has no
// update permission on submissions.

import { createClient } from '@supabase/supabase-js'

export const config = { path: '/api/admin-review' }

const VALID_STATUS = new Set(['pending', 'verified', 'rejected'])

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

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Auth. Two tiers: ADMIN_PASSWORD unlocks everything; VIEWER_PASSWORD (the
  // spectator link for the roamers) can only ping — every write still requires
  // the admin password.
  const adminPw = process.env.ADMIN_PASSWORD || ''
  const viewerPw = process.env.VIEWER_PASSWORD || ''
  const given = req.headers.get('x-admin-password') || ''
  const isAdmin = Boolean(adminPw) && given === adminPw
  const isViewer = Boolean(viewerPw) && given === viewerPw
  if (!isAdmin && !isViewer) return json({ error: 'Unauthorized' }, 401)

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }

  // Login ping confirms the password and reports which tier it belongs to.
  if (payload.action === 'ping') return json({ ok: true, role: isAdmin ? 'admin' : 'viewer' })

  if (!isAdmin) return json({ error: 'View-only password' }, 401)
  if (payload.action !== 'review') return json({ error: 'Unknown action' }, 400)

  const { id, status, awardedPoints, note } = payload
  if (!id || !VALID_STATUS.has(status)) return json({ error: 'Invalid review' }, 400)

  const db = admin()
  if (!db) return json({ error: 'Server not configured (missing Supabase keys)' }, 500)

  const update = {
    status,
    admin_note: note ?? null,
    awarded_points:
      awardedPoints === null || awardedPoints === undefined ? null : Number(awardedPoints),
    reviewed_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('submissions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return json({ error: error.message }, 500)
  return json({ ok: true, submission: data })
}
