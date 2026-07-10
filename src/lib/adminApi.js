// Admin write API. Verification, partial credit, and config/challenge edits are
// the only things that must be tamper-resistant, so they do NOT go through the
// public anon key. Instead they POST to Netlify Functions that hold the Supabase
// service_role key server-side and check the admin password on every call.
//
// The password is kept in sessionStorage after a successful login and sent as a
// bearer-ish header. This is deliberately lightweight — the brief says this is
// not sensitive data and an admin password is fine.

const PW_KEY = 'sip-admin-pw'

export function getAdminPassword() {
  try {
    return sessionStorage.getItem(PW_KEY) || ''
  } catch {
    return ''
  }
}
export function setAdminPassword(pw) {
  try {
    sessionStorage.setItem(PW_KEY, pw)
  } catch {
    /* ignore */
  }
}
export function clearAdminPassword() {
  try {
    sessionStorage.removeItem(PW_KEY)
  } catch {
    /* ignore */
  }
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': getAdminPassword(),
    },
    body: JSON.stringify(body || {}),
  })
  if (res.status === 401) {
    clearAdminPassword()
    throw new Error('Wrong admin password.')
  }
  if (!res.ok) {
    let msg = 'Request failed (' + res.status + ')'
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

// Verify a password by hitting the review endpoint in "ping" mode.
// Returns 'admin', 'viewer', or null.
export async function verifyPassword(pw) {
  const res = await fetch('/api/admin-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
    body: JSON.stringify({ action: 'ping' }),
  })
  if (!res.ok) return null
  try {
    const j = await res.json()
    return j.role || 'admin'
  } catch {
    return 'admin'
  }
}

// Spectator (/watch) session, stored separately from the admin password so a
// viewer login never unlocks the real admin dashboard.
const VIEWER_KEY = 'sip-viewer-pw'
export function getViewerPassword() {
  try {
    return sessionStorage.getItem(VIEWER_KEY) || ''
  } catch {
    return ''
  }
}
export function setViewerPassword(pw) {
  try {
    sessionStorage.setItem(VIEWER_KEY, pw)
  } catch {
    /* ignore */
  }
}

// Set a submission's status. points override is optional (partial credit).
export function reviewSubmission({ id, status, awardedPoints, note }) {
  return post('/api/admin-review', {
    action: 'review',
    id,
    status,
    awardedPoints: awardedPoints ?? null,
    note: note ?? null,
  })
}

// Save the full challenge list and/or scoring config from the Settings screen.
export function saveConfig({ challenges, config, teams }) {
  return post('/api/admin-config', { challenges, config, teams })
}
