import { useMemo, useState } from 'react'
import { useHuntData } from '../lib/useHuntData'
import { useTeamSubmissions } from '../lib/useTeamSubmissions'
import { buildMaps, scoreTeam } from '../lib/scoring'
import { pendingSyncCount } from '../lib/outbox'
import JoinTeam from './JoinTeam.jsx'
import ScoreHeader from './ScoreHeader.jsx'
import ChallengeCard from './ChallengeCard.jsx'
import SubmitSheet from './SubmitSheet.jsx'
import { useOnline } from '../lib/useOnline'

const TEAM_KEY = 'sip-team'
const NAME_KEY = 'sip-name'

function loadSaved() {
  try {
    return {
      team: JSON.parse(localStorage.getItem(TEAM_KEY) || 'null'),
      name: localStorage.getItem(NAME_KEY) || '',
    }
  } catch {
    return { team: null, name: '' }
  }
}

export default function InternApp() {
  const { loading, challenges, quests, config, teams } = useHuntData()
  const [saved, setSaved] = useState(loadSaved)
  const [openChallenge, setOpenChallenge] = useState(null)
  const online = useOnline()

  const team = saved.team
  const submissions = useTeamSubmissions(team?.id)

  const { challengeMap, questMap } = useMemo(
    () => buildMaps(challenges, quests),
    [challenges, quests],
  )
  const score = useMemo(
    () => scoreTeam(submissions, { challengeMap, questMap, config }),
    [submissions, challengeMap, questMap, config],
  )
  const syncing = pendingSyncCount(submissions.filter((s) => s._local))

  function join(t, name) {
    localStorage.setItem(TEAM_KEY, JSON.stringify(t))
    localStorage.setItem(NAME_KEY, name || '')
    setSaved({ team: t, name: name || '' })
  }
  function leave() {
    localStorage.removeItem(TEAM_KEY)
    setSaved({ team: null, name: '' })
  }

  if (loading) return <Splash />

  if (!team) return <JoinTeam teams={teams} onJoin={join} />

  // Group active challenges by quest, in quest order (1..5, then roaming = 0 last).
  const activeChallenges = challenges.filter((c) => c.active !== false)
  const orderedQuests = [...quests].sort(
    (a, b) => (a.id === 0 ? 99 : a.id) - (b.id === 0 ? 99 : b.id),
  )
  const subsByChallenge = new Map()
  for (const s of submissions) {
    if (!subsByChallenge.has(s.challenge_id)) subsByChallenge.set(s.challenge_id, [])
    subsByChallenge.get(s.challenge_id).push(s)
  }

  return (
    <div className="app">
      <ScoreHeader team={team} score={score} config={config} syncing={syncing} />

      {!online && (
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className="banner warn">
            You’re offline — submissions are saved and will upload when signal
            returns.
          </div>
        </div>
      )}

      <div className="pad">
        <div className="banner info" style={{ marginBottom: 4 }}>
          🗺 Use your printed packet to find and solve each challenge. Come here to
          check it off and upload your photo/video proof. The numbers below match
          your packet.
        </div>

        {orderedQuests.map((q) => {
          const items = activeChallenges.filter((c) => c.quest === q.id)
          if (items.length === 0) return null
          return (
            <section key={q.id}>
              <div className="quest-head">
                <h2>
                  {q.emoji} {q.name}
                </h2>
              </div>
              <div className="quest-tag">{q.tagline}</div>
              {items.map((c, i) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  number={q.id === 0 ? null : i + 1}
                  subs={subsByChallenge.get(c.id) || []}
                  onOpen={setOpenChallenge}
                />
              ))}
            </section>
          )
        })}

        <div className="spacer" />
        <div className="center">
          <span
            className="adminlink"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (
                window.confirm(
                  `You're on ${team.name}. Only switch if you joined the wrong team — you'll need that team's code to rejoin.`,
                )
              )
                leave()
            }}
          >
            Joined the wrong team?
          </span>
        </div>
        <div className="spacer" />
      </div>

      {openChallenge && (
        <SubmitSheet
          challenge={openChallenge}
          team={team}
          memberName={saved.name}
          config={config}
          subs={subsByChallenge.get(openChallenge.id) || []}
          onClose={() => setOpenChallenge(null)}
        />
      )}
    </div>
  )
}

function Splash() {
  return (
    <div className="app">
      <div className="topbar">
        <h1>SIP Scavenger Hunt</h1>
      </div>
      <div className="pad center muted">Loading the hunt…</div>
    </div>
  )
}
