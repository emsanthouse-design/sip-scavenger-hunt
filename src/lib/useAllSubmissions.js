import { useEffect, useState } from 'react'
import { loadSubmissions, subscribeSubmissions } from './data'

// Live feed of ALL submissions for the admin dashboard. Re-fetches on any
// realtime change so the queue and leaderboard stay current without a manual
// refresh. A slow polling fallback covers the rare case realtime drops.
export function useAllSubmissions() {
  const [subs, setSubs] = useState([])
  const [loadedAt, setLoadedAt] = useState(null)

  useEffect(() => {
    let alive = true
    const refresh = () =>
      loadSubmissions().then((rows) => {
        if (!alive) return
        setSubs(rows)
        setLoadedAt(new Date())
      })
    refresh()
    const unsub = subscribeSubmissions(refresh)
    const poll = setInterval(refresh, 12000)
    return () => {
      alive = false
      unsub()
      clearInterval(poll)
    }
  }, [])

  return { subs, loadedAt }
}
