import { useEffect, useState } from 'react'
import { loadSubmissions, subscribeSubmissions } from './data'
import { subscribeOutbox } from './outbox'

// Merges the source-of-truth submissions from the database with the device's
// local outbox (items still uploading / retrying), so the intern sees their
// action reflected instantly even before it reaches the server.
//
// Dedupe is by client_id: once an outbox item syncs, the DB row (same client_id)
// takes over and the optimistic copy drops out of the outbox automatically.
export function useTeamSubmissions(teamId) {
  const [dbSubs, setDbSubs] = useState([])
  const [outbox, setOutbox] = useState([])

  // Live DB submissions for this team.
  useEffect(() => {
    if (!teamId) return
    let alive = true
    loadSubmissions({ teamId }).then((rows) => alive && setDbSubs(rows))
    const unsub = subscribeSubmissions(
      () => loadSubmissions({ teamId }).then((rows) => alive && setDbSubs(rows)),
      { teamId },
    )
    return () => {
      alive = false
      unsub()
    }
  }, [teamId])

  // Local outbox (all teams on this device — filter to current team).
  useEffect(() => subscribeOutbox(setOutbox), [])

  const dbClientIds = new Set(dbSubs.map((s) => s.client_id).filter(Boolean))
  const optimistic = outbox
    .filter((i) => i.teamId === teamId && !dbClientIds.has(i.id))
    .map((i) => ({
      id: i.id,
      client_id: i.id,
      team_id: i.teamId,
      challenge_id: i.challengeId,
      submitted_by: i.submittedBy,
      evidence_type: i.evidenceType,
      text_answer: i.textAnswer,
      status: 'pending', // counts as pending for scoring
      awarded_points: null,
      _local: true,
      _syncState: i.status, // queued | uploading | error
      _error: i.error,
      created_at: i.createdAt,
    }))

  return [...optimistic, ...dbSubs]
}
