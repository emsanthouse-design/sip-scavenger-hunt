import { buildLeaderboard } from '../lib/scoring'

// Visual leaderboard: one horizontal bar per team, animated as scores change.
// Solid blue = official (verified) points; striped segment stacked after it =
// pending points ("if all verified"). Ranked by official total, so the solid
// bars are the race and the stripes show what's still in the pipeline.
export default function Leaderboard({ teams, submissions, challengeMap, questMap, config }) {
  const rows = buildLeaderboard(teams, submissions, { challengeMap, questMap, config })
  const max = Math.max(
    1,
    ...rows.map((r) => Math.max(r.score.total, r.score.provisionalTotal)),
  )

  return (
    <div className="pad">
      <div className="lb-legend">
        <span>
          <span className="swatch" style={{ background: 'var(--optimistic-blue)' }} />
          Verified (official)
        </span>
        <span>
          <span
            className="swatch"
            style={{
              background: 'repeating-linear-gradient(-45deg,#a9c9e8 0 4px,#c2d9ef 4px 8px)',
            }}
          />
          Pending
        </span>
      </div>

      {rows.length === 0 && <div className="card center muted">No teams yet.</div>}

      {rows.map((row, i) => {
        const s = row.score
        const vPct = (s.total / max) * 100
        const pPct = (Math.max(0, s.provisionalTotal - s.total) / max) * 100
        return (
          <div key={row.team.id} className="lb-card">
            <div className="row spread">
              <div className="row" style={{ gap: 10 }}>
                <div className="lb-rank">{i + 1}</div>
                <div>
                  <strong className="display">{row.team.name}</strong>
                  <div className="muted small">
                    {s.base} base
                    {s.heroJourneyBonus > 0 && ` · +${s.heroJourneyBonus} journey`}
                    {s.roamingBonus > 0 && ` · +${s.roamingBonus} roaming`}
                    {' · '}
                    {s.questsTouched}/5 quests
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lb-total">{s.total}</div>
                {s.pendingCount > 0 && (
                  <div className="muted small">
                    {s.provisionalTotal} if all {s.pendingCount} pending verify
                  </div>
                )}
              </div>
            </div>
            <div className={'lb-bar-track' + (i === 0 && s.total > 0 ? ' leader' : '')}>
              <div className="lb-bar-v" style={{ width: vPct + '%' }} />
              <div className="lb-bar-p" style={{ width: pPct + '%' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
