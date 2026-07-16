import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { buildLeaderboard, pointsByQuest } from '../lib/scoring'
import { evidenceUrl } from '../lib/supabase'
import MapTab, { TEAM_COLORS } from './MapTab.jsx'
import { QUEST_COLORS } from './StrategyTab.jsx'
import { MusicEngine } from './revealMusic'
import { computeBoots, computeSuperlatives, computeBonuses, computeRecap } from './awards'
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
  // The shuffle is SEEDED so the order is stable — the dashboard refetches
  // data every ~12s, and an unseeded shuffle re-dealt the deck mid-show,
  // which read as "repeats" on screen.
  const REEL_CAP = 20
  const { photos, totalPhotos } = useMemo(() => {
    const seededShuffle = (list, seed) => {
      let s = seed >>> 0
      const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
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
      .sort((a, b) => (a.id < b.id ? -1 : 1)) // stable base order before seeding
    const pickedIds = new Set(config?.reelIds || [])
    const picked = all.filter((p) => pickedIds.has(p.id))
    const fill = seededShuffle(
      all.filter((p) => !pickedIds.has(p.id)),
      20260710,
    ).slice(0, Math.max(0, REEL_CAP - picked.length))
    return {
      photos: seededShuffle([...picked, ...fill], 741776),
      totalPhotos: all.length,
    }
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
  const recap = useMemo(
    () => computeRecap(teams, submissions, { challengeMap, questMap, config }),
    [teams, submissions, challengeMap, questMap, config],
  )
  // Erin's hand-picked awards — multi-select lists (legacy single ids folded in).
  const pickList = (listKey, legacyKey) => {
    const ids = [
      ...(config?.[listKey] || []),
      ...(config?.[legacyKey] ? [config[legacyKey]] : []),
    ]
    return [...new Set(ids)]
      .map((id) => submissions.find((s) => s.id === id))
      .filter(Boolean)
  }
  const erinsSubs = pickList('erinsChoiceIds', 'erinsChoiceId')
  const failSubs = pickList('funniestFailIds', 'funniestFailId')

  // Strategy fingerprints, spoiler-proofed for the show: each team's bar is
  // normalized to full width (share of THEIR points by quest), so it tells the
  // strategy story without leaking who's ahead before the podium.
  const fingerprints = useMemo(() => {
    const byTeam = new Map(teams.map((t) => [t.id, []]))
    for (const s of submissions) byTeam.get(s.team_id)?.push(s)
    return teams.map((t) => {
      const pts = pointsByQuest(byTeam.get(t.id) || [], { challengeMap })
      const total = [...pts.values()].reduce((a, b) => a + b, 0)
      return { team: t, pts, total }
    })
  }, [teams, submissions, challengeMap])

  // Stage list adapts to team count and which extras exist. With only two
  // teams the podium is skipped entirely — announcing 2nd place would just
  // announce the winner early and deflate the big moment.
  const STAGES = ['intro', 'rules', 'recap', 'map', 'fingerprints']
  if (rows.length >= 3) STAGES.push('third', 'second')
  STAGES.push('drumroll', 'winner', 'bonus')
  if (boots) STAGES.push('boots')
  STAGES.push('supers')
  erinsSubs.forEach((_, i) => STAGES.push('erins-' + i))
  failSubs.forEach((_, i) => STAGES.push('fail-' + i))
  STAGES.push('finale')
  const cur = STAGES[Math.min(stage, STAGES.length - 1)]
  const last = stage >= STAGES.length - 1

  // Two kinds of navigation around the play-by-play:
  //   - stepNext/stepBack move through PLAYS first (the on-slide < > arrows
  //     and the arrow keys — the natural viewing flow)
  //   - next/back (the bottom buttons) always jump WHOLE SECTIONS, so a viewer
  //     can skip the rest of the tape entirely
  const [recapIdx, setRecapIdx] = useState(0)
  const next = () => setStage((s) => Math.min(s + 1, STAGES.length - 1))
  const back = () => setStage((s) => Math.max(s - 1, 0))
  const stepNext = () => {
    if (cur === 'recap' && recapIdx < recap.length - 1) setRecapIdx(recapIdx + 1)
    else next()
  }
  const stepBack = () => {
    if (cur === 'recap' && recapIdx > 0) setRecapIdx(recapIdx - 1)
    else back()
  }
  // Keyboard handlers read the latest step fns through refs (cur/recapIdx
  // change every render; a once-bound listener would go stale).
  const nextRef = useRef(stepNext)
  const backRef = useRef(stepBack)
  nextRef.current = stepNext
  backRef.current = stepBack

  // --- music ----------------------------------------------------------------
  const [music, setMusic] = useState(false)
  const engineRef = useRef(null)
  const moodFor = (k) =>
    k === 'third' || k === 'second'
      ? 'tension'
      : k === 'drumroll'
        ? 'drumroll'
        : k === 'winner'
        ? 'fanfare'
        : ['bonus', 'boots', 'supers', 'finale'].includes(k) ||
            k.startsWith('erins-') ||
            k.startsWith('fail-')
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
        nextRef.current()
      } else if (e.key === 'ArrowLeft') backRef.current()
      else if (e.key === 'Escape') onExit?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Winners (handles a tie for first).
  const topTotal = rows[0]?.score.total ?? 0
  const winners = rows.filter((r) => r.score.total === topTotal)
  const isTie = winners.length > 1

  return (
    <div className="reveal-overlay">
      <Confetti active={cur === 'winner' || cur === 'finale'} />

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

      {cur === 'rules' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">First — the 60-second setup</div>
          <h1 className="reveal-title" style={{ fontSize: 'clamp(24px,4.5vw,52px)' }}>
            The Game
          </h1>
          <div className="reveal-lines">
            <div className="reveal-line">
              🗓 <b>July 10, 2026.</b> City of Boston summer interns traded their
              desks for the streets — {teams.length} teams, one afternoon,
              downtown Boston, on foot.
            </div>
            <div className="reveal-line">
              🎯 <b>Dozens of challenges across 5 quests</b> — riddle trails,
              photo missions, video productions, museum deep-dives. Proof or it
              didn’t happen: photo/video evidence, 2+ teammates in frame.
            </div>
            <div className="reveal-line">
              🧠 <b>The strategy:</b> go deep on big five-point visits, or go
              wide on quick one-pointers — and scoring in more quests unlocks
              bonus points (+5 / +10 / +15).
            </div>
            <div className="reveal-line">
              🕵️ <b>HQ verified everything live.</b> No points until the
              evidence passed inspection.
            </div>
            <div className="reveal-line">
              ✨ <b>Wildcards:</b> a bonus for catching the two roaming
              organizers on camera — and a mid-game flash bounty that changed
              everything.
            </div>
          </div>
        </div>
      )}

      {cur === 'recap' && (
        <Recap
          moments={recap}
          teams={teams}
          idx={recapIdx}
          onPrev={() => setRecapIdx((x) => Math.max(0, x - 1))}
          onNext={() => setRecapIdx((x) => Math.min(recap.length - 1, x + 1))}
        />
      )}

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

      {cur === 'fingerprints' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">Same hunt — two very different playbooks</div>
          <h1 className="reveal-title" style={{ fontSize: 'clamp(24px,4.5vw,52px)' }}>
            The Game Plans
          </h1>
          <div className="reveal-sub">
            Challenges came in five flavors, each worth different points. These
            bars show where each team’s points came from — one dominant color
            means they bet big on a favorite; a rainbow means they grabbed a
            little of everything.
          </div>
          <div className="reveal-fp-legend">
            {[1, 2, 3, 4, 5, 6, 0].map((q) => {
              if (!fingerprints.some((f) => f.pts.get(q))) return null
              const blurbs = {
                1: 'quick 1-pt photo grabs',
                2: 'the 2-pt riddle trail',
                3: '3-pt team videos',
                4: '2-pt City Hall missions',
                5: 'big 5-pt culture & museum visits',
                6: 'LinkedIn repost bonus',
                0: 'catching the roamers',
              }
              return (
                <span key={q}>
                  <i style={{ background: QUEST_COLORS[q] }} />
                  {questMap.get(q)?.name || 'Quest ' + q}
                  <em className="blurb"> — {blurbs[q]}</em>
                </span>
              )
            })}
          </div>
          <div className="reveal-bars">
            {fingerprints.map(({ team, pts, total }) => (
              <div key={team.id} className="reveal-bar-row">
                <div className="label">
                  <span>{team.name}</span>
                </div>
                <div className="reveal-bar-track" style={{ display: 'flex' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((q) => {
                    const v = pts.get(q) || 0
                    if (!v || !total) return null
                    return (
                      <div
                        key={q}
                        style={{
                          width: (v / total) * 100 + '%',
                          background: QUEST_COLORS[q],
                          transition: 'width .8s cubic-bezier(.22,1,.36,1)',
                        }}
                        title={`${questMap.get(q)?.name}: ${v}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cur === 'third' && rows[2] && (
        <Podium medal="🥉" label="Third place" row={rows[2]} />
      )}
      {cur === 'second' && rows[1] && (
        <Podium medal="🥈" label="Second place" row={rows[1]} />
      )}

      {cur === 'drumroll' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">The moment of truth</div>
          <h1 className="reveal-title">
            🥁 And the winner is<span className="reveal-dots"><i>.</i><i>.</i><i>.</i></span>
          </h1>
          <div className="reveal-sub">(no pressure)</div>
        </div>
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

      {cur.startsWith('erins-') && erinsSubs[+cur.split('-')[1]] && (
        <PickStage
          kicker="A very prestigious jury of one"
          title={
            '🏅 Erin’s Choice Award' +
            (erinsSubs.length > 1 ? ` · ${+cur.split('-')[1] + 1} of ${erinsSubs.length}` : '')
          }
          sub={teamName.get(erinsSubs[+cur.split('-')[1]].team_id)}
          submission={erinsSubs[+cur.split('-')[1]]}
          challengeMap={challengeMap}
        />
      )}
      {cur.startsWith('fail-') && failSubs[+cur.split('-')[1]] && (
        <PickStage
          kicker="We salute the attempt"
          title={
            '🤣 Funniest Fail' +
            (failSubs.length > 1 ? ` · ${+cur.split('-')[1] + 1} of ${failSubs.length}` : '')
          }
          sub={teamName.get(failSubs[+cur.split('-')[1]].team_id)}
          submission={failSubs[+cur.split('-')[1]]}
          challengeMap={challengeMap}
        />
      )}

      {cur === 'finale' && (
        <div className="reveal-stage">
          <div className="reveal-kicker">That’s a wrap</div>
          <h1 className="reveal-title">
            Congratulations,
            <br />
            <span className="red">{winners.map((w) => w.team.name).join(' & ')}!</span>
          </h1>
          {rows.length > winners.length && (
            <div className="reveal-sub" style={{ fontSize: 'clamp(17px,2.4vw,26px)' }}>
              And a huge thank-you to{' '}
              <b style={{ color: '#ffd23f' }}>
                {rows
                  .filter((r) => !winners.includes(r))
                  .map((r) => r.team.name)
                  .join(' & ')}
              </b>{' '}
              — you made this a real race, right down to the wire.
            </div>
          )}
          <div className="reveal-sub">
            One afternoon. {verifiedCount} verified submissions, {totalPoints} points,
            and a whole city explored — together. You represented Boston beautifully
            today. 💙
          </div>
          <div className="reveal-sub" style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>
            Now go celebrate — you earned it. 🎉
          </div>

          <div className="reveal-promo">
            <div className="label">City of Boston · Summer Internship Program</div>
            <p>
              This was one afternoon of a summer spent doing real work for the
              City of Boston — and, occasionally, chasing riddles across
              downtown. Know a student who belongs in next year’s cohort?
              Send them our way.
            </p>
            <a
              href="https://www.boston.gov/internships"
              target="_blank"
              rel="noreferrer"
            >
              boston.gov/internships →
            </a>
          </div>

          <button
            className="secondary"
            onClick={() => {
              setStage(0)
              setRecapIdx(0)
              window.scrollTo(0, 0)
            }}
          >
            ↺ Back to the beginning
          </button>
        </div>
      )}

      <div className="reveal-controls">
        {onExit && (
          <button className="secondary small" onClick={onExit}>
            Exit
          </button>
        )}
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
            {cur === 'recap' ? 'Skip ahead →' : 'Next →'}
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
      {/* The admin's note becomes on-screen commentary — the official ruling. */}
      {submission.admin_note && (
        <div className="reveal-ruling">
          <span className="label">🎙 The official ruling</span>
          <div className="text">“{submission.admin_note}”</div>
        </div>
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

// ESPN-style play-by-play, presenter-driven: ‹ › arrows (or arrow keys / the
// Next button) step through the plays at whatever pace the room wants. Each
// moment remounts (key) so the entrance animation replays like a broadcast
// graphics package.
function Recap({ moments, teams, idx: rawIdx, onPrev, onNext }) {
  if (moments.length === 0) {
    return (
      <div className="reveal-stage">
        <div className="reveal-sub">No plays on the tape yet — verify some submissions first!</div>
      </div>
    )
  }
  const idx = Math.min(rawIdx, moments.length - 1)
  const m = moments[idx]
  const nxt = moments[Math.min(idx + 1, moments.length - 1)]
  const done = idx >= moments.length - 1

  // Score race: bars scale against the biggest total the tape ever shows, so
  // they visibly grow all game. scores === null → the board is sealed (🤫).
  const maxTot = Math.max(
    1,
    ...moments.flatMap((x) => (x.scores || []).map((s) => s.tot)),
  )
  const scores = m.scores
  const tots = teams.map((t) => scores?.find((s) => s.id === t.id)?.tot ?? 0)
  const sorted = [...tots].sort((a, b) => b - a)
  const tied = scores && sorted[0] > 0 && sorted[0] === sorted[1]
  const close = scores && !tied && sorted[0] - sorted[1] <= 2 && sorted[1] > 0

  return (
    <div className="reveal-stage" key={idx}>
      <div className="recap-chip">
        {m.time} · play {idx + 1}/{moments.length}
      </div>
      <h1 className={'reveal-title recap-' + m.type} style={{ fontSize: 'clamp(26px,5.5vw,64px)' }}>
        {m.head}
      </h1>
      <div className="reveal-sub" style={{ fontSize: 'clamp(16px,2.4vw,26px)' }}>{m.sub}</div>
      {m.photo && (
        <img
          className="reveal-photo"
          style={{ maxHeight: '34vh' }}
          src={evidenceUrl(m.photo)}
          alt=""
        />
      )}
      {/* preload the next play's photo so it slams in clean */}
      {!done && nxt.photo && <img src={evidenceUrl(nxt.photo)} alt="" style={{ display: 'none' }} />}

      <div className={'recap-score' + (scores == null ? ' mystery' : close || tied ? ' hot' : '')}>
        {(tied || close || scores == null) && (
          <div className="rflag">{scores == null ? '🤫 SEALED' : tied ? 'ALL TIED' : 'NECK AND NECK'}</div>
        )}
        {teams.map((t, i) => {
          const tot = scores?.find((s) => s.id === t.id)?.tot
          return (
            <div className="rrow" key={t.id}>
              <span className="rname">{t.name}</span>
              <div className="rtrack">
                <div
                  className="rfill"
                  style={{
                    width: scores ? (tot / maxTot) * 100 + '%' : '50%',
                    background: TEAM_COLORS[i % TEAM_COLORS.length],
                  }}
                />
              </div>
              <span className="rnum">{scores ? tot : '??'}</span>
            </div>
          )
        })}
      </div>

      <div className="row" style={{ gap: 12 }}>
        <button className="secondary" onClick={onPrev} disabled={idx === 0} aria-label="Previous play">
          ‹
        </button>
        <button onClick={onNext} disabled={done} aria-label="Next play">
          ›
        </button>
      </div>
      {done && <div className="reveal-sub" style={{ fontSize: 14 }}>end of tape — onward →</div>}
    </div>
  )
}

// (The photo slideshow, currently benched in favor of the play-by-play recap.
// Swap 'recap' for 'reel' in STAGES to bring it back.)
// eslint-disable-next-line no-unused-vars
function Reel({ photos }) {
  const [i, setI] = useState(0)
  // Plays through once and holds on the last slide (no looping repeats).
  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(
      () => setI((x) => (x + 1 >= photos.length ? x : x + 1)),
      3500,
    )
    return () => clearInterval(t)
  }, [photos.length])

  if (photos.length === 0) {
    return (
      <div className="reveal-stage">
        <div className="reveal-sub">No verified photos yet — verify some evidence first!</div>
      </div>
    )
  }
  const idx = Math.min(i, photos.length - 1)
  const cur = photos[idx]
  const nxt = photos[Math.min(idx + 1, photos.length - 1)]
  const done = idx >= photos.length - 1
  return (
    <div className="reveal-stage">
      <img className="reveal-photo" src={cur.url} alt="" />
      {/* preload the next slide so transitions never flash */}
      {!done && <img src={nxt.url} alt="" style={{ display: 'none' }} />}
      <div className="reveal-caption">
        <span className="team">{cur.team}</span> · {cur.title}
      </div>
      <div className="reveal-sub" style={{ fontSize: 14 }}>
        {done ? 'that’s the reel — onward →' : `${idx + 1} / ${photos.length}`}
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
