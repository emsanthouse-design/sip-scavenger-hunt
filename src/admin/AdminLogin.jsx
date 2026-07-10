import { useState } from 'react'
import { verifyPassword, setAdminPassword } from '../lib/adminApi'

export default function AdminLogin({ onOk }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const role = await verifyPassword(pw)
      if (role !== 'admin') {
        setErr(
          role === 'viewer'
            ? 'That’s the view-only password — use the /watch page instead.'
            : 'Wrong password.',
        )
        setBusy(false)
        return
      }
      setAdminPassword(pw)
      onOk()
    } catch {
      setErr('Could not reach the server. Check your connection.')
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1>Admin · Verification</h1>
      </div>
      <div className="pad">
        <form className="card stack" onSubmit={submit}>
          <h2>Admin sign-in</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Enter the admin password to review submissions and see live scores.
          </p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          {err && <div className="banner err">{err}</div>}
          <button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <a className="adminlink" href="/" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>
            ← Back to the hunt
          </a>
        </form>
      </div>
    </div>
  )
}
