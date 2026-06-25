import { useEffect, useState } from 'react'
import { loadChallenges, loadQuests, loadConfig, loadTeams } from './data'

// Loads the static-ish hunt content (challenges, quests, scoring config, teams)
// once. Shared by the intern app and the admin dashboard.
export function useHuntData() {
  const [state, setState] = useState({
    loading: true,
    challenges: [],
    quests: [],
    config: null,
    teams: [],
  })

  async function refresh() {
    const [challenges, quests, config, teams] = await Promise.all([
      loadChallenges(),
      loadQuests(),
      loadConfig(),
      loadTeams(),
    ])
    setState({ loading: false, challenges, quests, config, teams })
  }

  useEffect(() => {
    refresh()
  }, [])

  return { ...state, refresh }
}
