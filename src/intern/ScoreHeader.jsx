import { nextHeroTier } from '../lib/scoring'

// Sticky score header: total = base + Hero's Journey + roaming, with a
// provisional "if all verified" number and the Hero's Journey breadth meter.
export default function ScoreHeader({ team, score, config, syncing }) {
  const tiers = config?.heroTiers || []
  const next = nextHeroTier(score.questsTouched, tiers)
  const maxQuests = 5

  return (
    <div className="score-header">
      <div className="row spread">
        <div>
          <div className="score-total">{score.total}</div>
          <div className="score-breakdown">
            {score.base} base
            {score.heroJourneyBonus > 0 && ` · +${score.heroJourneyBonus} journey`}
            {score.roamingBonus > 0 && ` · +${score.roamingBonus} roaming`}
          </div>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 6 }}>
          <span className="team">{team?.name}</span>
          {score.provisionalTotal > score.total && (
            <span className="score-provisional">
              {score.provisionalTotal} if all verified
            </span>
          )}
          {syncing > 0 && <span className="sync-badge">{syncing} uploading…</span>}
        </div>
      </div>

      <div className="hero-meter">
        <div className="hero-label">
          ★ Hero’s Journey — {score.questsTouched}/{maxQuests} quests touched
          {next
            ? ` · reach ${next.nextAt} for +${next.nextBonus}`
            : ' · max bonus reached!'}
        </div>
        <div className="hero-pips">
          {Array.from({ length: maxQuests }).map((_, i) => (
            <div key={i} className={'hero-pip' + (i < score.questsTouched ? ' on' : '')} />
          ))}
        </div>
        {score.pendingCount > 0 && (
          <div className="hero-label">
            {score.pendingCount} submission{score.pendingCount === 1 ? '' : 's'} awaiting
            verification
          </div>
        )}
      </div>
    </div>
  )
}
