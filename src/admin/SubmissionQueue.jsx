import { useState } from 'react'
import EvidenceViewer from './EvidenceViewer.jsx'
import { reviewSubmission } from '../lib/adminApi'

// The live verification queue. Each card shows team, challenge, evidence,
// timestamp, and verify / reject / partial-credit controls.
export default function SubmissionQueue({
  submissions,
  challengeMap,
  teamMap,
  onChanged,
  config,
  onAward,
}) {
  const [filter, setFilter] = useState('pending')

  const counts = {
    pending: submissions.filter((s) => s.status === 'pending').length,
    verified: submissions.filter((s) => s.status === 'verified').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }
  const filtered = submissions
    .filter((s) => (filter === 'all' ? true : s.status === filter))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="pad">
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['pending', 'verified', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            className={'small ' + (filter === f ? '' : 'secondary')}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
            {f !== 'all' ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card center muted">
          {filter === 'pending'
            ? 'No submissions waiting. New ones appear here automatically.'
            : 'Nothing here.'}
        </div>
      )}

      {filtered.map((s) => (
        <ReviewCard
          key={s.id}
          submission={s}
          challenge={challengeMap.get(s.challenge_id)}
          team={teamMap.get(s.team_id)}
          onChanged={onChanged}
          config={config}
          onAward={onAward}
        />
      ))}
    </div>
  )
}

function ReviewCard({ submission, challenge, team, onChanged, config, onAward }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(submission.admin_note || '')
  const [partial, setPartial] = useState(
    submission.awarded_points != null ? String(submission.awarded_points) : '',
  )
  const [err, setErr] = useState('')

  const defaultPts = challenge?.points ?? 0
  const cap = challenge?.maxClaims ?? challenge?.max_claims ?? 1

  async function act(status, awardedPoints) {
    setBusy(true)
    setErr('')
    try {
      await reviewSubmission({ id: submission.id, status, awardedPoints, note: note || null })
      onChanged?.()
    } catch (e) {
      setErr(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const when = new Date(submission.created_at)

  return (
    <div className="queue-item stack">
      <div className="row spread">
        <div>
          <strong className="display" style={{ fontSize: 14 }}>
            {team?.name || 'Unknown team'}
          </strong>
          <div className="muted small">
            {challenge?.title || submission.challenge_id}
          </div>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
          <span className={'tag ' + submission.status}>{submission.status}</span>
          <span className="muted small">{when.toLocaleTimeString()}</span>
        </div>
      </div>

      {submission.submitted_by && (
        <div className="muted small">by {submission.submitted_by}</div>
      )}
      {challenge?.enhanced && (
        <div className="banner warn small">
          Enhanced proof: check the extra requirement (brochure / named exhibit /
          recorded answer).
        </div>
      )}
      {challenge?.hint && (
        <div className="banner info small">Facilitator note: {challenge.hint}</div>
      )}

      <EvidenceViewer submission={submission} />

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="ok grow small" disabled={busy} onClick={() => act('verified', null)}>
          ✓ Verify (+{defaultPts}{cap > 1 ? ` ·×${cap}` : ''})
        </button>
        <button className="danger grow small" disabled={busy} onClick={() => act('rejected', null)}>
          ✕ Reject
        </button>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <input
          style={{ maxWidth: 110 }}
          inputMode="numeric"
          placeholder="pts"
          value={partial}
          onChange={(e) => setPartial(e.target.value.replace(/[^\d]/g, ''))}
        />
        <button
          className="secondary small grow"
          disabled={busy || partial === ''}
          onClick={() => act('verified', Number(partial))}
        >
          Verify with partial credit
        </button>
      </div>

      <input
        placeholder="Optional note to the team (shown on rejection)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {/* Reveal-show award picks: tag favorites the moment you see them.
          All are multi-select; legacy single picks still light up. */}
      {onAward && (() => {
        const inList = (key, legacyKey) =>
          (config?.[key] || []).includes(submission.id) || config?.[legacyKey] === submission.id
        const isChoice = inList('erinsChoiceIds', 'erinsChoiceId')
        const isFail = inList('funniestFailIds', 'funniestFailId')
        return (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className={'small ' + (isChoice ? 'ok' : 'secondary')}
            disabled={busy}
            onClick={() => onAward('erinsChoiceIds', submission.id)}
          >
            🏅 {isChoice ? "Erin's pick ✓" : "Erin's pick"}
          </button>
          <button
            className={'small ' + (isFail ? 'danger' : 'secondary')}
            disabled={busy}
            onClick={() => onAward('funniestFailIds', submission.id)}
          >
            🤣 {isFail ? 'Funniest fail ✓' : 'Funniest fail'}
          </button>
          {submission.evidence_type === 'photo' && submission.evidence_path && (
            <button
              className={'small ' + ((config?.reelIds || []).includes(submission.id) ? '' : 'secondary')}
              disabled={busy}
              onClick={() => onAward('reelIds', submission.id)}
            >
              🎞 {(config?.reelIds || []).includes(submission.id) ? 'In slideshow ✓' : 'Slideshow'}
            </button>
          )}
        </div>
        )
      })()}
      {err && <div className="banner err small">{err}</div>}
    </div>
  )
}
