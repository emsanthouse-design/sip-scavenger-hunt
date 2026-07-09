// One challenge row. Shows points, evidence/enhanced tags, and the team's
// current status for this challenge (derived from their submissions).

const STATUS_LABEL = {
  verified: 'Verified',
  pending: 'Pending',
  uploading: 'Uploading…',
  rejected: 'Rejected',
}

export default function ChallengeCard({ challenge, subs, onOpen, number }) {
  // Best status across this challenge's submissions for the team.
  const statuses = subs.map((s) =>
    s._local && s.status === 'pending' ? 'uploading' : s.status,
  )
  let status = null
  if (statuses.includes('verified')) status = 'verified'
  else if (statuses.includes('uploading')) status = 'uploading'
  else if (statuses.includes('pending')) status = 'pending'
  else if (statuses.includes('rejected')) status = 'rejected'

  const cap = challenge.maxClaims || 1
  const verifiedCount = statuses.filter((s) => s === 'verified').length
  const dotClass = status === 'uploading' ? 'pending' : status

  return (
    <div className="challenge" onClick={() => onOpen(challenge)}>
      <div className={'statusdot ' + (dotClass || '')} />
      <div className="body">
        <div className="title">
          {number != null && <span className="itemno">{number}.</span>}
          {challenge.title}
        </div>
        <div className="meta">
          <span className="pts-badge">
            {challenge.points} pt{challenge.points === 1 ? '' : 's'}
            {cap > 1 ? ` ·×${cap}` : ''}
          </span>
          {challenge.enhanced && <span className="tag enhanced">Enhanced proof</span>}
          {challenge.evidence === 'video' && <span className="tag">Video</span>}
          {challenge.evidence === 'recorded' && <span className="tag">Recorded answer</span>}
          {status && (
            <span className={'tag ' + status}>
              {STATUS_LABEL[status]}
              {cap > 1 && verifiedCount > 0 ? ` ${verifiedCount}/${cap}` : ''}
            </span>
          )}
        </div>
      </div>
      <button className="ghost small" onClick={(e) => { e.stopPropagation(); onOpen(challenge) }}>
        {status ? 'Add' : 'Submit'}
      </button>
    </div>
  )
}
