import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { buildLeaderboard } from '../lib/scoring'
import { evidenceUrl } from '../lib/supabase'
import MapTab from './MapTab.jsx'
import { MusicEngine } from './revealMusic'
import { computeBoots, computeSuperlatives, computeBonuses } from './awards'
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

  // Highlight reel: hand-picked photos (🎞 on Queue cards) are always in;
  // random verified photos fill up to the cap; the mix is shuffled together.
  const REEL_CAP = 20
  const { photos, totalPhotos } = useMemo(() => {
    const shuffle = (list) => {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
      }
      return list
    }
    const all = submissions
      .filter((s) => s.status === 'verified' && s.evidence_path && s.evidence_type === 'photo')
      .map((s) => ({
        id: s.id,
        url: evidenceUrl(s.evidence_path),
        team: teamName.get(s.team_id) || 'Team',
        title: challengeMap.get(s.challenge_id)?.title || '',
      }))
      .filter((p) => p.url)
    const pickedIds = new Set(config?.reelIds || [])
    const picked = all.filter((p) => pickedIds.has(p.id))
    const fill = shuffle(all.filter((p) => !pickedIds.has(p.id))).slice(
      0,
      Math.max(0, REEL_CAP - picked.length),
    )
    return { photos: shuffle([...picked, ...fill]), totalPhotos: all.length }
  }, [submissions, challengeMap, teamName, config?.reelIds])

  const verifiedCount = submissions.filter((s) => s.status === 'verified').length
  const totalPoints = rows.reduce((a, r) => a + r.score.total, 0)

  // Honorable mentions (computed) + Erin's hand-picked awards (from config,
  // tagged on Queue cards).
  const boots = useMemo(() => computeBoots(teams, submissions), [teams, submissions])
  const sup = useMemo(() => computeSuperlatives(teams, submissions), [teams, submissions])
  const bonuses = useMemo(
    () => computeBonuses(rows, submissions, challengeMap),
    [rows, submissions, challengeMap],
  )
  const erinsSub = submissions.find((s) => s.id === config?.erinsChoiceId) || null
  const failSub = submissions.find((s) => s.id === config?.funniestFailId) || null

  // Stage list adapts to team count and which extras exist.
  const STAGES = ['intro', 'reel', 'map']
  if (rows.length >= 3) STAGES.push('third')
  if (rows.length >= 2) STAGES.push('second')
  STAGES.push('winner', 'bonus')
  if (boots) STAGES.push('boots')
  STAGES.push('supers')
  if (erinsSub) STAGES.push('erins')
  if (failSub) STAGES.push('fail')
  const cur = STAGES[Math.min(stage, STAGES.length - 1)]
  const last = stage >= STAGES.length - 1

  const next = () => setStage((s) => Math.min(s + 1, STAGES.length - 1))
  const back = () => setStage((s) => Math.max(s - 1, 0))

  // --- music ----------------------------------------------------------------
  const [music, setMusic] = useState(false)
  const engineRef = useRef(null)
  const moodFor = (k) =>
    k === 'third' || k === 'second'
      ? 'tension'
      : k === 'winner'
        ? 'fanfare'
        : ['bonus', 'boots', 'supers', 'erins', 'fail'].includes(k)
          ? 'party'
          : 'groove'
  useEffect(() => {
    if (music && engineRef.current) engineRef.current.setMood(moodFor(cur))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, music])
  useEffect(() => () => engineRef.current?.stop(), [])
  function toggleMusic() {
    if (!music) {
      if (!engineRef.current) engineRef.current = new MusicEngine()
      engineRef.current.start(moodFor(cur))
      setMusic(true)
    } else {
      engineRef.current?.stop()
      setMusic(false)
    }
  }

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
              <b>{totalPhotos}</b>
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
          {!last && <div className="reveal-sub" style={{ fontSize: 15 }}>…and we’re not done yet →</div>}
        </div>
      )}

      {cur === 'bonus' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">Honorable mentions</div>
          <h1 className="reveal-title" style={{ fontSize: 'clamp(24px,4.5vw,52px)' }}>
            The Bonus Round
          </h1>
          <div className="reveal-lines">
            {bonuses.hero.map((h) => (
              <div className="reveal-line" key={'h' + h.team}>
                ★ Hero’s Journey — <b>{h.team}</b>: +{h.bonus} ({h.quests}/5 quests)
              </div>
            ))}
            {bonuses.roaming.map((r, i) => (
              <div className="reveal-line" key={'r' + i}>
                ✨ Roaming Bonus — <b>{teamName.get(r.teamId) || 'A team'}</b> spotted the
                roamers at {r.time}
                {r.who ? ` (nice eyes, ${r.who})` : ''}
              </div>
            ))}
            {[...bonuses.linkedin].map(([id, n]) => (
              <div className="reveal-line" key={'l' + id}>
                💼 LinkedIn — <b>{teamName.get(id) || 'A team'}</b>: {n} repost
                {n === 1 ? '' : 's'} on the City’s feed
              </div>
            ))}
            {bonuses.hero.length + bonuses.roaming.length + bonuses.linkedin.size === 0 && (
              <div className="reveal-line">No bonus points were claimed… this time. 👀</div>
            )}
          </div>
        </div>
      )}

      {cur === 'boots' && boots && (
        <div className="reveal-stage">
          <div className="reveal-kicker">Honorable mentions</div>
          <h1 className="reveal-title" style={{ fontSize: 'clamp(24px,4.5vw,52px)' }}>
            👢 These Boots Are Made for Walkin’
          </h1>
          <div className="reveal-sub">
            <b style={{ color: '#ffd23f' }}>{boots.team.name}</b> covered the most ground —{' '}
            <b>~{boots.miles.toFixed(1)} miles</b> between “{boots.a.label}” and “
            {boots.b.label}.”
          </div>
          <BootsMap boots={boots} />
        </div>
      )}

      {cur === 'supers' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">Honorable mentions</div>
          <h1 className="reveal-title" style={{ fontSize: 'clamp(24px,4.5vw,52px)' }}>
            Superlatives
          </h1>
          <div className="reveal-grid">
            {sup.earlyBird && (
              <Superlative e="🐦" t="Early Bird" n={sup.earlyBird.team}
                d={`first submission of the day${sup.earlyBird.who ? ' — ' + sup.earlyBird.who : ''} · ${sup.earlyBird.time}`} />
            )}
            {sup.buzzer && (
              <Superlative e="⏰" t="Buzzer Beater" n={sup.buzzer.team}
                d={`last points of the day${sup.buzzer.who ? ' — ' + sup.buzzer.who : ''} · ${sup.buzzer.time}`} />
            )}
            {sup.shutterbugs && (
              <Superlative e="📸" t="Shutterbugs" n={sup.shutterbugs.team}
                d={`${sup.shutterbugs.n} total submissions`} />
            )}
            {sup.creative && (
              <Superlative e="🎭" t="Most Creative Interpretations" n={sup.creative.team}
                d={`${sup.creative.n} rejected attempt${sup.creative.n === 1 ? '' : 's'} — A for effort`} />
            )}
            {sup.mvp && (
              <Superlative e="🌟" t="MVP" n={sup.mvp.name}
                d={`${sup.mvp.n} verified submissions${sup.mvp.team ? ' · ' + sup.mvp.team : ''}`} />
            )}
          </div>
        </div>
      )}

      {cur === 'erins' && erinsSub && (
        <PickStage
          kicker="A very prestigious jury of one"
          title="🏅 Erin’s Choice Award"
          sub={teamName.get(erinsSub.team_id)}
          submission={erinsSub}
          challengeMap={challengeMap}
        />
      )}
      {cur === 'fail' && failSub && (
        <PickStage
          kicker="We salute the attempt"
          title="🤣 Funniest Fail"
          sub={teamName.get(failSub.team_id)}
          submission={failSub}
          challengeMap={challengeMap}
        />
      )}

      <div className="reveal-controls">
        <button className="secondary small" onClick={onExit}>
          Exit
        </button>
        <button className="secondary small" onClick={toggleMusic}>
          {music ? '🔊 Music on' : '🔇 Music off'}
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

function Superlative({ e, t, n, d }) {
  return (
    <div className="reveal-mini">
      <div style={{ fontSize: 'clamp(28px,4vw,52px)' }}>{e}</div>
      <div className="reveal-kicker" style={{ letterSpacing: '0.1em' }}>{t}</div>
      <div className="name" style={{
        fontFamily: 'var(--display)', fontWeight: 800, textTransform: 'uppercase',
        fontSize: 'clamp(18px,2.6vw,30px)',
      }}>{n}</div>
      <div style={{ color: '#c6d4e0', fontSize: 'clamp(12px,1.5vw,16px)' }}>{d}</div>
    </div>
  )
}

// Erin's hand-picked awards: show the actual evidence, big.
function PickStage({ kicker, title, sub, submission, challengeMap }) {
  const url = evidenceUrl(submission.evidence_path)
  const isVideo =
    submission.evidence_type === 'video' || submission.evidence_type === 'recorded'
  const challenge = challengeMap.get(submission.challenge_id)
  return (
    <div className="reveal-stage">
      <div className="reveal-kicker">{kicker}</div>
      <h1 className="reveal-title" style={{ fontSize: 'clamp(24px,4.5vw,52px)' }}>{title}</h1>
      {url &&
        (isVideo ? (
          <video className="reveal-photo" src={url} controls autoPlay playsInline />
        ) : (
          <img className="reveal-photo" src={url} alt="" />
        ))}
      <div className="reveal-caption">
        <span className="team">{sub}</span>
        {challenge ? ` · ${challenge.title}` : ''}
        {submission.submitted_by ? ` · by ${submission.submitted_by}` : ''}
      </div>
      {submission.text_answer && (
        <div className="reveal-sub">“{submission.text_answer}”</div>
      )}
    </div>
  )
}

// Mini-map for the walking award: the two farthest-apart completed spots.
function BootsMap({ boots }) {
  const el = useRef(null)
  const mapRef = useRef(null)
  useEffect(() => {
    if (!el.current || mapRef.current) return
    const map = L.map(el.current, {
      zoomControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false,
      attributionControl: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    const a = [boots.a.lat, boots.a.lng]
    const b = [boots.b.lat, boots.b.lng]
    L.polyline([a, b], { color: '#FB4D42', weight: 4, dashArray: '10 10' }).addTo(map)
    for (const p of [a, b]) {
      L.circleMarker(p, {
        radius: 10, color: '#FB4D42', weight: 3,
        fillColor: '#FB4D42', fillOpacity: 0.9,
      }).addTo(map)
    }
    map.fitBounds([a, b], { padding: [50, 50] })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [boots])
  return (
    <div
      ref={el}
      style={{ height: '44vh', width: 'min(92vw, 900px)', borderRadius: 14 }}
    />
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
