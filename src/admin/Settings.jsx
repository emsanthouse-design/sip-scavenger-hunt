import { useState } from 'react'
import { saveConfig } from '../lib/adminApi'

// Config screen: edit challenge points/caps/visibility, Hero's Journey tiers,
// the roaming bonus, and teams — all without a redeploy. Saves to the database
// via the password-gated Netlify function.
export default function Settings({ challenges, config, teams, onSaved }) {
  const [rows, setRows] = useState(() => challenges.map((c) => ({ ...c })))
  const [tiers, setTiers] = useState(() =>
    (config?.heroTiers || []).map((t) => ({ ...t })),
  )
  const [roaming, setRoaming] = useState(config?.roamingBonus ?? 3)
  const [startTime, setStartTime] = useState(config?.startTime || '13:30')
  const [endTime, setEndTime] = useState(config?.endTime || '16:40')
  const [teamRows, setTeamRows] = useState(() => teams.map((t) => ({ ...t })))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  function setRow(id, patch) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const cfg = {
        ...config,
        heroTiers: tiers.map((t) => ({ quests: Number(t.quests), bonus: Number(t.bonus) })),
        roamingBonus: Number(roaming),
        startTime: startTime || '13:30',
        endTime: endTime || '16:40',
      }
      // Keep the roaming-bonus challenge's points in sync with the config value.
      const outRows = rows.map((r) =>
        r.id === 'roaming-bonus' ? { ...r, points: Number(roaming) } : r,
      )
      await saveConfig({
        challenges: outRows,
        config: cfg,
        teams: teamRows.filter((t) => t.name && t.join_code),
      })
      setMsg({ ok: true, text: 'Saved. Changes are live.' })
      onSaved?.()
    } catch (e) {
      setMsg({ ok: false, text: e?.message || 'Save failed' })
    } finally {
      setBusy(false)
    }
  }

  const byQuest = {}
  for (const r of rows) (byQuest[r.quest] ||= []).push(r)
  const questOrder = Object.keys(byQuest)
    .map(Number)
    .sort((a, b) => (a === 0 ? 99 : a) - (b === 0 ? 99 : b))

  return (
    <div className="pad stack">
      <div className="banner info">
        Edit point values, caps, and the challenge list here before the event.
        Hidden challenges (toggle off “Active”) stay out of the intern view but
        keep any past submissions intact.
      </div>

      {/* Scoring config */}
      <div className="card stack">
        <h3>Hero’s Journey tiers</h3>
        {tiers.map((t, i) => (
          <div className="row" key={i} style={{ gap: 8 }}>
            <span className="muted small" style={{ width: 70 }}>{t.quests} quests</span>
            <span className="muted small">→ +</span>
            <input
              style={{ maxWidth: 90 }}
              inputMode="numeric"
              value={t.bonus}
              onChange={(e) =>
                setTiers((ts) => ts.map((x, j) => (j === i ? { ...x, bonus: e.target.value.replace(/[^\d]/g,'') } : x)))
              }
            />
          </div>
        ))}
        <div className="row" style={{ gap: 8 }}>
          <span className="muted small" style={{ width: 70 }}>Roaming</span>
          <span className="muted small">bonus +</span>
          <input
            style={{ maxWidth: 90 }}
            inputMode="numeric"
            value={roaming}
            onChange={(e) => setRoaming(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </div>

      {/* Event window: drives the intern countdown + halfway/30-min alerts */}
      <div className="card stack">
        <h3>Event times</h3>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted small" style={{ width: 70 }}>Start</span>
          <input
            type="time"
            style={{ maxWidth: 140 }}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted small" style={{ width: 70 }}>Back by</span>
          <input
            type="time"
            style={{ maxWidth: 140 }}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Drives the countdown on intern phones and the automatic halfway /
          30-minutes-left alerts.
        </p>
      </div>

      {/* Teams */}
      <div className="card stack">
        <h3>Teams</h3>
        {teamRows.map((t, i) => (
          <div className="row" key={t.id || i} style={{ gap: 8 }}>
            <input
              value={t.name}
              placeholder="Team name"
              onChange={(e) =>
                setTeamRows((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
            />
            <input
              style={{ maxWidth: 110 }}
              value={t.join_code}
              placeholder="CODE"
              onChange={(e) =>
                setTeamRows((ts) => ts.map((x, j) => (j === i ? { ...x, join_code: e.target.value.toUpperCase() } : x)))
              }
            />
          </div>
        ))}
        <button
          className="secondary small"
          onClick={() => setTeamRows((ts) => [...ts, { name: '', join_code: '' }])}
        >
          + Add team
        </button>
      </div>

      {/* Challenges */}
      {questOrder.map((q) => (
        <div className="card stack" key={q}>
          <h3>{q === 0 ? 'Roaming bonus' : `Quest ${q}`}</h3>
          {byQuest[q].map((r) => (
            <div key={r.id} className="stack" style={{ gap: 6, borderTop: '1px solid #eee', paddingTop: 8 }}>
              <input
                value={r.title}
                onChange={(e) => setRow(r.id, { title: e.target.value })}
              />
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <label className="muted small">pts</label>
                <input
                  style={{ maxWidth: 70 }}
                  inputMode="numeric"
                  value={r.points}
                  onChange={(e) => setRow(r.id, { points: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })}
                />
                <label className="muted small">max ×</label>
                <input
                  style={{ maxWidth: 60 }}
                  inputMode="numeric"
                  value={r.maxClaims}
                  onChange={(e) => setRow(r.id, { maxClaims: Math.max(1, Number(e.target.value.replace(/[^\d]/g, '')) || 1) })}
                />
                <label className="row small" style={{ gap: 4 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={r.active !== false}
                    onChange={(e) => setRow(r.id, { active: e.target.checked })}
                  />
                  Active
                </label>
                <label className="row small" style={{ gap: 4 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={!!r.enhanced}
                    onChange={(e) => setRow(r.id, { enhanced: e.target.checked })}
                  />
                  Enhanced
                </label>
              </div>
            </div>
          ))}
        </div>
      ))}

      {msg && <div className={'banner ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
      <button onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save all changes'}
      </button>
      <div className="spacer" />
    </div>
  )
}
