import { buildLeaderboard } from '../lib/scoring'

// Live leaderboard + per-team breakdown (base, bonuses, total; verified vs
// pending). Accurate enough to announce a winner at ~4:45.
export default function Leaderboard({ teams, submissions, challengeMap, questMap, config }) {
  const rows = buildLeaderboard(teams, submissions, { challengeMap, questMap, config })

  return (
    <div className="pad">
      {rows.length === 0 && <div className="card center muted">No teams yet.</div>}
      {rows.map((row, i) => (
        <div key={row.team.id} className="lb-row">
          <div className="lb-rank">{i + 1}</div>
          <div className="grow">
            <strong className="display">{row.team.name}</strong>
            <div className="muted small">
              {row.score.base} base
              {row.score.heroJourneyBonus > 0 && ` · +${row.score.heroJourneyBonus} journey`}
              {row.score.roamingBonus > 0 && ` · +${row.score.roamingBonus} roaming`}
              {' · '}
              {row.score.questsTouched}/5 quests
            </div>
            {row.score.pendingCount > 0 && (
              <div className="muted small">
                {row.score.pendingCount} pending ({row.score.provisionalTotal} if all verified)
              </div>
            )}
          </div>
          <div className="lb-total">{row.score.total}</div>
        </div>
      ))}
    </div>
  )
}
