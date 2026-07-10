import { useEffect, useState } from 'react'

// Calm countdown strip + two scheduled in-app alerts (halfway, 30-min warning).
// Times come from config (startTime/endTime, "HH:MM" local) so the admin can
// adjust them in Settings without a redeploy. Deliberately not stressful: a
// slim progress track that only turns red inside the final 30 minutes.

const ALERT_KEY = 'sip-alerts-dismissed'

function todayAt(hhmm) {
  const [h, m] = String(hhmm || '')
    .split(':')
    .map(Number)
  const d = new Date()
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
  return d
}

function fmtClock(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = ((h + 11) % 12) + 1
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

function fmtLeft(ms) {
  const mins = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function loadDismissed() {
  try {
    return JSON.parse(localStorage.getItem(ALERT_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function Countdown({ config }) {
  const [now, setNow] = useState(() => Date.now())
  const [dismissed, setDismissed] = useState(loadDismissed)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  const startStr = config?.startTime || '13:30'
  const endStr = config?.endTime || '16:40'
  const start = todayAt(startStr).getTime()
  const end = todayAt(endStr).getTime()
  if (!(end > start)) return null

  const half = start + (end - start) / 2
  const warnAt = end - 30 * 60 * 1000
  const left = end - now
  const elapsedPct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  const inWarn = now >= warnAt && now < end

  // Which alert (if any) should be showing right now.
  let alert = null
  if (now >= half && now < warnAt && !dismissed.half) {
    alert = {
      key: 'half',
      tone: 'info',
      text: `⏳ Halfway there! ${fmtLeft(left)} to go — good time to check your Hero's Journey meter.`,
    }
  } else if (inWarn && !dismissed.warn) {
    alert = {
      key: 'warn',
      tone: 'warn',
      text: `🕒 30 minutes left — wrap up and start heading back to 26 Court St. Be back by ${fmtClock(endStr)}.`,
    }
  }

  function dismiss(key) {
    const next = { ...dismissed, [key]: true }
    setDismissed(next)
    try {
      localStorage.setItem(ALERT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {alert && (
        <div className={'banner ' + alert.tone} style={{ marginBottom: 12 }}>
          <span className="grow">{alert.text}</span>
          <button
            className="ghost small"
            style={{ padding: '2px 8px', flexShrink: 0 }}
            onClick={() => dismiss(alert.key)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className={'countdown' + (inWarn ? ' warn' : '')}>
        {now < start ? (
          <span>Hunt starts {fmtClock(startStr)} · back by {fmtClock(endStr)}</span>
        ) : now >= end ? (
          <span>⏰ Time! Head back to 26 Court St.</span>
        ) : (
          <>
            <span style={{ whiteSpace: 'nowrap' }}>⏱ {fmtLeft(left)} left</span>
            <div className="track">
              <div className="fill" style={{ width: elapsedPct + '%' }} />
            </div>
            <span style={{ whiteSpace: 'nowrap' }}>back by {fmtClock(endStr)}</span>
          </>
        )}
      </div>
    </>
  )
}
