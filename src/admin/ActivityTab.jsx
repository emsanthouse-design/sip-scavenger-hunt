import { useState } from 'react'
import StrategyTab from './StrategyTab.jsx'
import MapTab from './MapTab.jsx'
import TeamRoster from './TeamRoster.jsx'

// One "Activity" home for everything about the teams themselves: strategy
// fingerprints + drill-down, the live map, and the roster. A slim pill
// switcher keeps the top-level tab bar short.
export default function ActivityTab({
  teams,
  submissions,
  challengeMap,
  questMap,
  members,
  onMembersChanged,
}) {
  const [view, setView] = useState('strategy')

  const pills = [
    { key: 'strategy', label: 'Strategy' },
    { key: 'map', label: 'Map' },
    { key: 'roster', label: `Roster${members.length ? ` (${members.length})` : ''}` },
  ]

  return (
    <>
      <div className="row" style={{ gap: 6, padding: '12px 16px 0' }}>
        {pills.map((p) => (
          <button
            key={p.key}
            className={'small ' + (view === p.key ? '' : 'secondary')}
            onClick={() => setView(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {view === 'strategy' ? (
        <StrategyTab
          teams={teams}
          submissions={submissions}
          challengeMap={challengeMap}
          questMap={questMap}
        />
      ) : view === 'map' ? (
        <MapTab teams={teams} submissions={submissions} challengeMap={challengeMap} />
      ) : (
        <TeamRoster teams={teams} members={members} onChanged={onMembersChanged} />
      )}
    </>
  )
}
