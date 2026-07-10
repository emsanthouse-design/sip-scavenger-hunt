import { useCallback, useEffect, useState } from 'react'
import { loadMembers } from './data'

// Team roster for the admin: who has joined which team. Polls gently so the
// list fills in live while people join at 1:30.
export function useMembers() {
  const [members, setMembers] = useState([])
  const refresh = useCallback(() => loadMembers().then(setMembers), [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])
  return { members, refresh }
}
