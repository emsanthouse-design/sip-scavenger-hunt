import { useState } from 'react'
import { saveConfig } from '../lib/adminApi'

// Who's joined what team. Names are editable inline (for the inevitable joke
// entry) — an admin rename sticks; the intern's phone won't overwrite it.
export default function TeamRoster({ teams, members, onChanged, readOnly = false }) {
  const byTeam = new Map(teams.map((t) => [t.id, []]))
  const orphans = []
  for (const m of members) {
    if (byTeam.has(m.team_id)) byTeam.get(m.team_id).push(m)
    else orphans.push(m)
  }

  return (
    <div className="pad stack">
      <div className="banner info">
        {members.length} joined so far.
        {!readOnly && ' Tap a name to fix it — your edit sticks.'}{' '}
        Updates every ~15s while people join.
      </div>

      {teams.map((t) => (
        <div key={t.id} className="card">
          <div className="row spread" style={{ marginBottom: 6 }}>
            <strong className="display">{t.name}</strong>
            <span className="roster-count">
              {byTeam.get(t.id).length} joined · code {t.join_code}
            </span>
          </div>
          {byTeam.get(t.id).length === 0 && (
            <div className="muted small">No one yet.</div>
          )}
          {byTeam.get(t.id).map((m) => (
            <MemberRow key={m.id} member={m} onChanged={onChanged} readOnly={readOnly} />
          ))}
        </div>
      ))}

      {orphans.length > 0 && (
        <div className="card">
          <strong className="display">Unassigned</strong>
          {orphans.map((m) => (
            <MemberRow key={m.id} member={m} onChanged={onChanged} readOnly={readOnly} />
          ))}
        </div>
      )}
    </div>
  )
}

function MemberRow({ member, onChanged, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(member.name)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    const name = val.trim()
    if (!name || name === member.name) {
      setEditing(false)
      setVal(member.name)
      return
    }
    setBusy(true)
    setErr('')
    try {
      await saveConfig({ members: [{ id: member.id, name }] })
      setEditing(false)
      onChanged?.()
    } catch (e) {
      setErr(e?.message || 'Rename failed')
    } finally {
      setBusy(false)
    }
  }

  const when = new Date(member.created_at)

  return (
    <div className="roster-member">
      {editing ? (
        <>
          <input
            value={val}
            autoFocus
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            style={{ flex: 1 }}
          />
          <button className="small ok" disabled={busy} onClick={save}>
            {busy ? '…' : 'Save'}
          </button>
          <button
            className="small secondary"
            disabled={busy}
            onClick={() => {
              setEditing(false)
              setVal(member.name)
            }}
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span
            className="grow"
            style={readOnly ? undefined : { cursor: 'pointer' }}
            onClick={readOnly ? undefined : () => setEditing(true)}
            title={readOnly ? undefined : 'Tap to rename'}
          >
            {member.name}
            {!readOnly && <span className="muted small"> ✎</span>}
          </span>
          <span className="muted small">{when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        </>
      )}
      {err && <span className="small" style={{ color: 'var(--freedom-red)' }}>{err}</span>}
    </div>
  )
}
