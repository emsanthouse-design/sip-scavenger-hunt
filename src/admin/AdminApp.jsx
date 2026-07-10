import { useMemo, useState } from 'react'
import { getAdminPassword, clearAdminPassword } from '../lib/adminApi'
import { useHuntData } from '../lib/useHuntData'
import { useAllSubmissions } from '../lib/useAllSubmissions'
import { buildMaps } from '../lib/scoring'
import { useRoute } from '../lib/useRoute'
import AdminLogin from './AdminLogin.jsx'
import SubmissionQueue from './SubmissionQueue.jsx'
import Leaderboard from './Leaderboard.jsx'
import TeamRoster from './TeamRoster.jsx'
import StrategyTab from './StrategyTab.jsx'
import MapTab from './MapTab.jsx'
import Settings from './Settings.jsx'
import { useMembers } from '../lib/useMembers'

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => Boolean(getAdminPassword()))
  const [tab, setTab] = useState('queue')
  const [, navigate] = useRoute()
  const { loading, challenges, quests, config, teams, refresh } = useHuntData()
  const { subs, loadedAt } = useAllSubmissions()
  const { members, refresh: refreshMembers } = useMembers()

  const { challengeMap, questMap } = useMemo(
    () => buildMaps(challenges, quests),
    [challenges, quests],
  )
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  if (!authed) return <AdminLogin onOk={() => setAuthed(true)} />

  const pendingCount = subs.filter((s) => s.status === 'pending').length

  return (
    <div className="app">
      <div className="topbar">
        <h1>Admin · Verification</h1>
        <button
          className="ghost small"
          style={{ color: '#fff' }}
          onClick={() => {
            clearAdminPassword()
            setAuthed(false)
          }}
        >
          Sign out
        </button>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>
          Queue{pendingCount ? ` (${pendingCount})` : ''}
        </button>
        <button className={tab === 'board' ? 'active' : ''} onClick={() => setTab('board')}>
          Leaderboard
        </button>
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>
          Teams{members.length ? ` (${members.length})` : ''}
        </button>
        <button className={tab === 'strategy' ? 'active' : ''} onClick={() => setTab('strategy')}>
          Strategy
        </button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
          Map
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          Settings
        </button>
        <button className="" onClick={() => navigate('/')}>
          Exit
        </button>
      </div>

      {loading ? (
        <div className="pad center muted">Loading…</div>
      ) : tab === 'queue' ? (
        <SubmissionQueue
          submissions={subs}
          challengeMap={challengeMap}
          teamMap={teamMap}
          onChanged={() => {}}
        />
      ) : tab === 'board' ? (
        <Leaderboard
          teams={teams}
          submissions={subs}
          challengeMap={challengeMap}
          questMap={questMap}
          config={config}
        />
      ) : tab === 'teams' ? (
        <TeamRoster teams={teams} members={members} onChanged={refreshMembers} />
      ) : tab === 'strategy' ? (
        <StrategyTab
          teams={teams}
          submissions={subs}
          challengeMap={challengeMap}
          questMap={questMap}
        />
      ) : tab === 'map' ? (
        <MapTab teams={teams} submissions={subs} challengeMap={challengeMap} />
      ) : (
        <Settings
          challenges={challenges}
          config={config}
          teams={teams}
          onSaved={refresh}
        />
      )}

      {loadedAt && tab !== 'settings' && (
        <div className="pad center muted small">
          Live · last updated {loadedAt.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
