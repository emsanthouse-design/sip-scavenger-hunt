import { useMemo } from 'react'
import { useHuntData } from '../lib/useHuntData'
import { useAllSubmissions } from '../lib/useAllSubmissions'
import { buildMaps } from '../lib/scoring'
import RevealTab from './RevealTab.jsx'

// /replay — the public, shareable version of the reveal show. No password (it
// only reads the same world-readable event data the intern app uses; every
// write stays behind the admin functions) and no Exit button, so there's no
// path from here back into the dashboard.
export default function ReplayApp() {
  const { loading, challenges, quests, config, teams } = useHuntData()
  const { subs } = useAllSubmissions()

  const { challengeMap, questMap } = useMemo(
    () => buildMaps(challenges, quests),
    [challenges, quests],
  )

  if (loading) {
    return <div className="app pad center muted">Loading the show…</div>
  }

  return (
    <RevealTab
      teams={teams}
      submissions={subs}
      challengeMap={challengeMap}
      questMap={questMap}
      config={config}
    />
  )
}
