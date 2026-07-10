import { useEffect, useMemo, useRef, useState } from 'react'
import { buildLeaderboard } from '../lib/scoring'
import { evidenceUrl } from '../lib/supabase'
import MapTab from './MapTab.jsx'
import './reveal.css'

// 🎉 The big-screen finale. A fullscreen, keynote-style sequence the admin
// clicks (or arrow-keys) through once the winner is confirmed:
//   intro stats → highlight reel → the map → 3rd → 2nd → WINNER + confetti.
// Read-only over data that's already loaded; exiting returns to the queue.

export default function RevealTab({
  teams,
  submissions,
  challengeMap,
  questMap,
  config,
  onExit,
}) {
  const [stage, setStage] = useState(0)

  const rows = useMemo(
    () => buildLeaderboard(teams, submissions, { challengeMap, questMap, config }),
    [teams, submissions, challengeMap, questMap, config],
  )

  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])

  // Verified photos for the highlight reel, shuffled once.
  const photos = useMemo(() => {
    const list = submissions
      .filter((s) => s.status === 'verified' && s.evidence_path && s.evidence_type === 'photo')
      .map((s) => ({
        url: evidenceUrl(s.evidence_path),
        team: teamName.get(s.team_id) || 'Team',
        title: challengeMap.get(s.challenge_id)?.title || '',
      }))
      .filter((p) => p.url)
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
  }, [submissions, challengeMap, teamName])

  const verifiedCount = submissions.filter((s) => s.status === 'verified').length
  const totalPoints = rows.reduce((a, r) => a + r.score.total, 0)

  // Stage list adapts to how many teams there are (podium places 3rd..2nd).
  const STAGES = ['intro', 'reel', 'map']
  if (rows.length >= 3) STAGES.push('third')
  if (rows.length >= 2) STAGES.push('second')
  STAGES.push('winner')
  const cur = STAGES[Math.min(stage, STAGES.length - 1)]
  const last = stage >= STAGES.length - 1

  const next = () => setStage((s) => Math.min(s + 1, STAGES.length - 1))
  const back = () => setStage((s) => Math.max(s - 1, 0))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') back()
      else if (e.key === 'Escape') onExit?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STAGES.length])

  // Winners (handles a tie for first).
  const topTotal = rows[0]?.score.total ?? 0
  const winners = rows.filter((r) => r.score.total === topTotal)
  const isTie = winners.length > 1

  return (
    <div className="reveal-overlay">
      <Confetti active={cur === 'winner'} />

      {cur === 'intro' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">City of Boston · Summer Internship Program</div>
          <h1 className="reveal-title">
            The Scavenger Hunt <span className="red">Results</span>
          </h1>
          <div className="reveal-stats">
            <div className="reveal-stat">
              <b>{verifiedCount}</b>
              <span>verified submissions</span>
            </div>
            <div className="reveal-stat">
              <b>{photos.length}</b>
              <span>photos captured</span>
            </div>
            <div className="reveal-stat">
              <b>{totalPoints}</b>
              <span>points scored</span>
            </div>
          </div>
          <div className="reveal-sub">You traded your desks for the streets. Here’s how it went.</div>
        </div>
      )}

      {cur === 'reel' && <Reel photos={photos} />}

      {cur === 'map' && (
        <div className="reveal-stage">
          <h1 className="reveal-title" style={{ fontSize: 'clamp(22px,4vw,44px)' }}>
            Where you went
          </h1>
          <div className="reveal-map-wrap">
            <MapTab teams={teams} submissions={submissions} challengeMap={challengeMap} />
          </div>
        </div>
      )}

      {cur === 'third' && rows[2] && (
        <Podium medal="🥉" label="Third place" row={rows[2]} />
      )}
      {cur === 'second' && rows[1] && (
        <Podium medal="🥈" label="Second place" row={rows[1]} />
      )}

      {cur === 'winner' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">{isTie ? 'It’s a tie — your champions' : 'Your champions'}</div>
          <div className="reveal-place reveal-winner">
            <div className="reveal-medal">🏆</div>
            <div className="name">{winners.map((w) => w.team.name).join(' & ')}</div>
            <div className="pts">
              {topTotal} points
              {winners[0] && (
                <>
                  {' — '}
                  {winners[0].score.base} base
                  {winners[0].score.heroJourneyBonus > 0 &&
                    ` · +${winners[0].score.heroJourneyBonus} journey`}
                  {winners[0].score.roamingBonus > 0 &&
                    ` · +${winners[0].score.roamingBonus} roaming`}
                </>
              )}
            </div>
          </div>
          <div className="reveal-bars">
            {rows.map((r, i) => {
              const max = Math.max(1, topTotal)
              return (
                <div key={r.team.id} className={'reveal-bar-row' + (i === 0 ? ' first' : '')}>
                  <div className="label">
                    <span>{r.team.name}</span>
                    <span>{r.score.total}</span>
                  </div>
                  <div className="reveal-bar-track">
                    <div
                      className="reveal-bar-fill"
                      style={{ width: (r.score.total / max) * 100 + '%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="reveal-controls">
        <button className="secondary small" onClick={onExit}>
          Exit
        </button>
        {stage > 0 && (
          <button className="secondary small" onClick={back}>
            ← Back
          </button>
        )}
        {!last && (
          <button className="small" onClick={next}>
            Next →
          </button>
        )}
        <span className="hint">arrow keys / space work too</span>
      </div>
    </div>
  )
}

function Podium({ medal, label, row }) {
  return (
    <div className="reveal-stage">
      <div className="reveal-kicker">{label}</div>
      <div className="reveal-place">
        <div className="reveal-medal">{medal}</div>
        <div className="name">{row.team.name}</div>
        <div className="pts">{row.score.total} points</div>
      </div>
    </div>
  )
}

function Reel({ photos }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => setI((x) => x + 1), 3500)
    return () => clearInterval(t)
  }, [photos.length])

  if (photos.length === 0) {
    return (
      <div className="reveal-stage">
        <div className="reveal-sub">No verified photos yet — verify some evidence first!</div>
      </div>
    )
  }
  const cur = photos[i % photos.length]
  const nxt = photos[(i + 1) % photos.length]
  return (
    <div className="reveal-stage">
      <img className="reveal-photo" src={cur.url} alt="" />
      {/* preload the next slide so transitions never flash */}
      <img src={nxt.url} alt="" style={{ display: 'none' }} />
      <div className="reveal-caption">
        <span className="team">{cur.team}</span> · {cur.title}
      </div>
      <div className="reveal-sub" style={{ fontSize: 14 }}>
        {(i % photos.length) + 1} / {photos.length}
      </div>
    </div>
  )
}

// Lightweight canvas confetti — no dependencies. Bursts on entry, then keeps
// gently re-firing while the winner stage is up. Skips entirely for
// prefers-reduced-motion.
function Confetti({ active }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let parts = []
    let raf
    let running = true
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const colors = ['#FB4D42', '#1871BD', '#FFD23F', '#4CC38A', '#FFFFFF']
    const burst = (fx) => {
      for (let k = 0; k < 130; k++) {
        parts.push({
          x: fx * canvas.width,
          y: canvas.height * 0.4,
          vx: (Math.random() - 0.5) * 16,
          vy: -Math.random() * 15 - 5,
          w: Math.random() * 8 + 4,
          h: Math.random() * 6 + 3,
          c: colors[k % colors.length],
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          life: 260,
        })
      }
    }
    burst(0.28)
    burst(0.72)
    const iv = setInterval(() => running && burst(0.15 + Math.random() * 0.7), 2600)
    const tick = () => {
      if (!running) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      parts = parts.filter((p) => p.life > 0 && p.y < canvas.height + 40)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.32
        p.vx *= 0.99
        p.r += p.vr
        p.life--
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.fillStyle = p.c
        ctx.globalAlpha = Math.min(1, p.life / 60)
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      running = false
      clearInterval(iv)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active])
  if (!active) return null
  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 120 }}
    />
  )
}
