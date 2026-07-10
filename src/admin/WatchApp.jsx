import { useMemo, useState } from 'react'
import { verifyPassword, getViewerPassword, setViewerPassword } from '../lib/adminApi'
import { useHuntData } from '../lib/useHuntData'
import { useAllSubmissions } from '../lib/useAllSubmissions'
import { useMembers } from '../lib/useMembers'
import { buildMaps } from '../lib/scoring'
import ActivityTab from './ActivityTab.jsx'

// /watch — the spectator view for the roamers (Isabella & Avis): the Activity
// tab (Strategy / Map / Roster) and nothing else. Unlocked by VIEWER_PASSWORD
// (the admin password works here too). Strictly view-only: no queue, no
// verification, no settings, no roster renames.
export default function WatchApp() {
  const [authed, setAuthed] = useState(() => Boolean(getViewerPassword()))

  if (!authed) return <WatchLogin onOk={() => setAuthed(true)} />
  return <WatchDashboard />
}

function WatchDashboard() {
  const { loading, challenges, quests, teams } = useHuntData()
  const { subs, loadedAt } = useAllSubmissions()
  const { members } = useMembers()

  const { challengeMap, questMap } = useMemo(
    () => buildMaps(challenges, quests),
    [challenges, quests],
  )

  return (
    <div className="app">
      <div className="topbar">
        <h1>Hunt · Live View</h1>
        <span className="team">spectator</span>
      </div>

      {loading ? (
        <div className="pad center muted">Loading…</div>
      ) : (
        <ActivityTab
          teams={teams}
          submissions={subs}
          challengeMap={challengeMap}
          questMap={questMap}
          members={members}
          readOnly
        />
      )}

      {loadedAt && (
        <div className="pad center muted small">
          Live · updated {loadedAt.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

function WatchLogin({ onOk }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const role = await verifyPassword(pw)
      if (!role) {
        setErr('Wrong password.')
        setBusy(false)
        return
      }
      setViewerPassword(pw)
      onOk()
    } catch {
      setErr('Could not reach the server. Check your connection.')
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1>Hunt · Live View</h1>
      </div>
      <div className="pad">
        <form className="card stack" onSubmit={submit}>
          <h2>Spectator sign-in</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Watch the teams’ strategies, the live map, and the rosters as the
            hunt unfolds. View-only.
          </p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Spectator password"
            autoFocus
          />
          {err && <div className="banner err">{err}</div>}
          <button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Watch the hunt'}
          </button>
        </form>
      </div>
    </div>
  )
}
