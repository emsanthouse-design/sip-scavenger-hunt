import { useState } from 'react'
import { pointsByQuest } from '../lib/scoring'

// Strategy view: a per-quest "fingerprint" bar for every team (deep vs. wide at
// a glance), then a per-team drill-down of what they've completed, who
// submitted it, and what it was worth.

export const QUEST_COLORS = {
  1: '#E8A33D', // Bingo — amber
  2: '#1871BD', // Riddles — optimistic blue
  3: '#8E5BC0', // Video — purple
  4: '#2A9D8F', // City Hall — teal
  5: '#FB4D42', // Culture — freedom red
  6: '#0A66C2', // LinkedIn
  0: '#58585B', // Roaming
}

export default function StrategyTab({ teams, submissions, challengeMap, questMap }) {
  const [teamId, setTeamId] = useState(teams[0]?.id || '')

  const byTeam = new Map(teams.map((t) => [t.id, []]))
  for (const s of submissions) {
    if (byTeam.has(s.team_id)) byTeam.get(s.team_id).push(s)
  }

  // Fingerprints: verified points per quest, caps enforced.
  const fingerprints = teams.map((t) => {
    const pts = pointsByQuest(byTeam.get(t.id) || [], { challengeMap })
    const total = [...pts.values()].reduce((a, b) => a + b, 0)
    return { team: t, pts, total }
  })
  const maxTotal = Math.max(1, ...fingerprints.map((f) => f.total))
  const questIds = [1, 2, 3, 4, 5, 6, 0]

  const selected = teams.find((t) => t.id === teamId) || teams[0]
  const detailSubs = (byTeam.get(selected?.id) || []).filter((s) => s.status !== 'rejected')
  const rejected = (byTeam.get(selected?.id) || []).filter((s) => s.status === 'rejected')

  // Group the selected team's submissions by quest.
  const grouped = new Map()
  for (const s of detailSubs) {
    const q = challengeMap.get(s.challenge_id)?.quest ?? -1
    if (!grouped.has(q)) grouped.set(q, [])
    grouped.get(q).push(s)
  }
  const questOrder = [...grouped.keys()].sort((a, b) => (a === 0 ? 99 : a) - (b === 0 ? 99 : b))

  return (
    <div className="pad stack">
      {/* Fingerprints */}
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Strategy fingerprints</h3>
        <p className="muted small" style={{ marginTop: 0 }}>
          Verified points by quest — a long single-color bar is a “go deep” team,
          a rainbow is a “go wide” team.
        </p>
        <div className="lb-legend" style={{ flexWrap: 'wrap', margin: '0 0 10px' }}>
          {questIds.map((q) => (
            <span key={q}>
              <span className="swatch" style={{ background: QUEST_COLORS[q] }} />
              {questMap.get(q)?.name || 'Quest ' + q}
            </span>
          ))}
        </div>
        {fingerprints.map(({ team, pts, total }) => (
          <div key={team.id} style={{ marginBottom: 12 }}>
            <div className="row spread">
              <strong className="display" style={{ fontSize: 14 }}>{team.name}</strong>
              <span className="muted small">{total} verified pts</span>
            </div>
            <div className="lb-bar-track" style={{ height: 18 }}>
              {questIds.map((q) => {
                const v = pts.get(q) || 0
                if (!v) return null
                return (
                  <div
                    key={q}
                    title={`${questMap.get(q)?.name || 'Quest ' + q}: ${v} pts`}
                    style={{
                      width: (v / maxTotal) * 100 + '%',
                      background: QUEST_COLORS[q],
                      transition: 'width .8s cubic-bezier(.22,1,.36,1)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Per-team drill-down */}
      <div className="card stack">
        <div className="row spread">
          <h3>Team detail</h3>
          <select
            style={{ maxWidth: 180 }}
            value={selected?.id || ''}
            onChange={(e) => setTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {detailSubs.length === 0 && (
          <div className="muted small">Nothing submitted yet.</div>
        )}

        {questOrder.map((q) => (
          <div key={q}>
            <div className="quest-head" style={{ margin: '10px 0 6px' }}>
              <h2 style={{ fontSize: 14 }}>
                <span
                  className="swatch"
                  style={{
                    display: 'inline-block', width: 12, height: 12,
                    borderRadius: 3, marginRight: 6,
                    background: QUEST_COLORS[q] || '#999',
                  }}
                />
                {questMap.get(q)?.name || 'Other'}
              </h2>
            </div>
            {grouped.get(q).map((s) => {
              const c = challengeMap.get(s.challenge_id)
              const pts = s.awarded_points != null ? s.awarded_points : c?.points ?? 0
              return (
                <div key={s.id} className="roster-member" style={{ gap: 10 }}>
                  <div className={'statusdot ' + s.status} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="small" style={{ lineHeight: 1.3 }}>{c?.title || s.challenge_id}</div>
                    <div className="muted small">
                      {s.submitted_by || 'unknown'} ·{' '}
                      {new Date(s.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={'tag ' + s.status}>
                    {s.status === 'verified' ? `+${pts}` : `${pts} pending`}
                  </span>
                </div>
              )
            })}
          </div>
        ))}

        {rejected.length > 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            + {rejected.length} rejected submission{rejected.length === 1 ? '' : 's'} not shown
          </p>
        )}
      </div>
    </div>
  )
}
