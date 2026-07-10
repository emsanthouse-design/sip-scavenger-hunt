import { useState } from 'react'

// Lightweight "auth": pick your team (or type its join code) and your name.
// No accounts. Choice is remembered on the device so interns don't re-enter it.
export default function JoinTeam({ teams, onJoin }) {
  const join = onJoin
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const noTeams = !teams || teams.length === 0

  function submit(e) {
    e.preventDefault()
    const entered = code.trim().toUpperCase()
    const team =
      teams.find((t) => (t.join_code || '').toUpperCase() === entered) ||
      teams.find((t) => t.name.toUpperCase() === entered)
    if (!team) {
      setErr('Hmm, that team code didn’t match. Double-check with your facilitator.')
      return
    }
    join(team, name.trim())
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1>SIP Scavenger Hunt</h1>
      </div>
      <div className="pad stack">
        <div className="card stack">
          <h2>Welcome to the hunt</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Trade your desk for the streets. Join your team, knock out challenges,
            snap your proof, and rack up points across Boston. Most points wins.
          </p>
          <p className="muted small" style={{ margin: 0 }}>
            Your team code is in your printed packet. Use the packet to find and
            solve challenges — this app is where you check them off and upload proof.
          </p>
        </div>

        <form className="card stack" onSubmit={submit}>
          <label className="display small">Your team code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your team’s code"
            autoCapitalize="characters"
            autoCorrect="off"
            inputMode="text"
          />

          <label className="display small" style={{ marginTop: 6 }}>
            Your name (optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So the admin knows who submitted"
          />

          {noTeams && (
            <div className="banner err">
              Couldn’t reach the server. Check your connection, then reload.
            </div>
          )}
          {err && <div className="banner err">{err}</div>}
          {noTeams ? (
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          ) : (
            <button type="submit">Join team</button>
          )}
        </form>
      </div>
    </div>
  )
}
