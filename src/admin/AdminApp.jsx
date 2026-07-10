import { useMemo, useState } from 'react'
import { getAdminPassword, clearAdminPassword, saveConfig } from '../lib/adminApi'
import { useHuntData } from '../lib/useHuntData'
import { useAllSubmissions } from '../lib/useAllSubmissions'
import { buildMaps } from '../lib/scoring'
import { useRoute } from '../lib/useRoute'
import AdminLogin from './AdminLogin.jsx'
import SubmissionQueue from './SubmissionQueue.jsx'
import Leaderboard from './Leaderboard.jsx'
import ActivityTab from './ActivityTab.jsx'
import RevealTab from './RevealTab.jsx'
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

  // Toggle a reveal-show pick on a submission. All pick keys are multi-select
  // lists. Legacy single-value keys (erinsChoiceId / funniestFailId, from
  // before these went multi) are folded into the list on first touch.
  async function awardPick(key, id) {
    const LEGACY = { erinsChoiceIds: 'erinsChoiceId', funniestFailIds: 'funniestFailId' }
    const legacyKey = LEGACY[key]
    const legacyVal = legacyKey ? config?.[legacyKey] : null
    const cur = [...(config?.[key] || []), ...(legacyVal ? [legacyVal] : [])].filter(
      (v, i, a) => a.indexOf(v) === i,
    )
    const next = {
      ...config,
      ...(legacyKey ? { [legacyKey]: null } : {}),
      [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    }
    try {
      await saveConfig({ config: next })
      refresh()
    } catch (e) {
      alert(e?.message || 'Could not save the pick')
    }
  }

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
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          Activity
        </button>
        <button className={tab === 'reveal' ? 'active' : ''} onClick={() => setTab('reveal')}>
          🎉 Reveal
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
          config={config}
          onAward={awardPick}
        />
      ) : tab === 'board' ? (
        <Leaderboard
          teams={teams}
          submissions={subs}
          challengeMap={challengeMap}
          questMap={questMap}
          config={config}
        />
      ) : tab === 'activity' ? (
        <ActivityTab
          teams={teams}
          submissions={subs}
          challengeMap={challengeMap}
          questMap={questMap}
          members={members}
          onMembersChanged={refreshMembers}
        />
      ) : tab === 'reveal' ? (
        <RevealTab
          teams={teams}
          submissions={subs}
          challengeMap={challengeMap}
          questMap={questMap}
          config={config}
          onExit={() => setTab('queue')}
        />
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
