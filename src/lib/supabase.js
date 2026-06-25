import { createClient } from '@supabase/supabase-js'

// Public Supabase client used by the front end. The anon key is safe to ship to
// the browser; what protects the data is row-level security (see schema.sql):
// anyone can read the hunt and insert a submission, but nobody can change a
// verification result without the service_role key, which lives only in the
// Netlify Functions (server side).

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If the keys are missing (e.g. running before setup), expose a clear flag so
// the UI can show a friendly "not configured yet" message instead of crashing.
export const isConfigured = Boolean(url && anonKey)

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

export const EVIDENCE_BUCKET = 'evidence'

// Public URL for an uploaded evidence file (the bucket is public-read).
export function evidenceUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase?.storage.from(EVIDENCE_BUCKET).getPublicUrl(path).data.publicUrl || null
}
