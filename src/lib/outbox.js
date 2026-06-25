// OUTBOX — the optimistic, retrying submission queue.
//
// Flow when an intern submits a challenge:
//   1. We immediately persist the submission (incl. the photo/video Blob) to
//      IndexedDB and surface it in the UI as "uploading" — zero perceived wait.
//   2. A background processor uploads the file to Supabase Storage, then inserts
//      the submission row in Postgres.
//   3. On success the local copy is dropped and the DB (via realtime/refetch)
//      becomes the source of truth. On failure it stays queued and retries with
//      exponential backoff, and again whenever the network comes back.
//
// A stable client_id makes inserts idempotent: if an insert succeeds but the
// response is lost and we retry, the unique constraint turns the retry into a
// no-op instead of double-counting points.

import { idb } from './idb'
import { supabase, isConfigured, EVIDENCE_BUCKET } from './supabase'

const listeners = new Set()
let items = [] // in-memory mirror of the outbox for fast rendering
let processing = false
let timer = null

const BACKOFF = [2000, 4000, 8000, 16000, 30000] // ms by attempt #

function emit() {
  const snapshot = [...items]
  listeners.forEach((fn) => fn(snapshot))
}

export function subscribeOutbox(fn) {
  listeners.add(fn)
  fn([...items])
  return () => listeners.delete(fn)
}

export async function initOutbox() {
  items = await idb.all()
  emit()
  kick()
  if (typeof window !== 'undefined') {
    window.addEventListener('online', kick)
    // Gentle periodic retry while the page is open.
    setInterval(kick, 15000)
  }
}

function uid() {
  // Time + randomness; good enough for a per-device unique id.
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

// Enqueue a new submission. `file` may be null for text-only answers.
export async function enqueueSubmission({
  teamId,
  teamName,
  challengeId,
  challengeTitle,
  submittedBy,
  evidenceType,
  textAnswer,
  file,
}) {
  const item = {
    id: uid(),
    teamId,
    teamName,
    challengeId,
    challengeTitle,
    submittedBy,
    evidenceType,
    textAnswer: textAnswer || null,
    blob: file || null,
    filename: file?.name || null,
    contentType: file?.type || null,
    status: 'queued',
    attempts: 0,
    error: null,
    createdAt: new Date().toISOString(),
  }
  await idb.put(item)
  items = [item, ...items]
  emit()
  kick()
  return item
}

function kick() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  process()
}

async function process() {
  if (processing || !isConfigured) return
  processing = true
  try {
    let scheduledRetry = false
    for (const item of items.filter((i) => i.status !== 'synced')) {
      try {
        await upload(item)
      } catch (err) {
        item.attempts += 1
        item.status = 'error'
        item.error = err?.message || String(err)
        await idb.put(item)
        emit()
        // Schedule a backoff retry for the soonest-failing item.
        if (!scheduledRetry) {
          scheduledRetry = true
          const delay = BACKOFF[Math.min(item.attempts - 1, BACKOFF.length - 1)]
          timer = setTimeout(kick, delay)
        }
      }
    }
  } finally {
    processing = false
  }
}

async function upload(item) {
  item.status = 'uploading'
  emit()

  let evidencePath = null
  if (item.blob) {
    const ext = (item.filename?.match(/\.\w+$/) || [''])[0] || ''
    evidencePath = `${item.teamId}/${item.challengeId}/${item.id}${ext}`
    const { error: upErr } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(evidencePath, item.blob, {
        contentType: item.contentType || 'application/octet-stream',
        upsert: true, // idempotent on retry
      })
    if (upErr) throw upErr
  }

  const row = {
    client_id: item.id,
    team_id: item.teamId,
    challenge_id: item.challengeId,
    submitted_by: item.submittedBy || null,
    evidence_type: item.evidenceType,
    evidence_path: evidencePath,
    text_answer: item.textAnswer,
    status: 'pending',
  }

  // Idempotent insert: on a duplicate client_id (a retry that already landed),
  // upsert leaves the existing row untouched.
  const { error: insErr } = await supabase
    .from('submissions')
    .upsert(row, { onConflict: 'client_id', ignoreDuplicates: true })
  if (insErr) throw insErr

  // Success: drop the local copy (and its blob) and let the DB be the truth.
  await idb.delete(item.id)
  items = items.filter((i) => i.id !== item.id)
  emit()
}

// How many submissions are still waiting to sync (for a header badge).
export function pendingSyncCount(snapshot = items) {
  return snapshot.filter((i) => i.status !== 'synced').length
}
