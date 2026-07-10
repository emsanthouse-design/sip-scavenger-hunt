import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CHALLENGE_LOCATIONS } from '../config/locations'

// "Who's been where" — a pin appears at a challenge's known location when a
// team submits it (filled = verified, hollow = pending). Colors are per team.
// No GPS involved: pins come from the challenge's fixed spot, so the intern
// app is untouched. Tiles from OpenStreetMap (free, no key).

export const TEAM_COLORS = ['#1871BD', '#FB4D42', '#1A7F47', '#E8A33D', '#8E5BC0']

export default function MapTab({ teams, submissions, challengeMap }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  // Create the map once.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { scrollWheelZoom: true }).setView(
      [42.3578, -71.0625], 15,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // (Re)draw pins whenever submissions change.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    const teamIndex = new Map(teams.map((t, i) => [t.id, i]))
    for (const s of submissions) {
      if (s.status === 'rejected') continue
      const loc = CHALLENGE_LOCATIONS[s.challenge_id]
      if (!loc) continue
      const i = teamIndex.get(s.team_id) ?? 0
      const color = TEAM_COLORS[i % TEAM_COLORS.length]
      // Fan same-spot pins out slightly so teams don't hide each other.
      const jitter = 0.00016 * (i - (teams.length - 1) / 2)
      const marker = L.circleMarker([loc.lat + jitter, loc.lng + jitter], {
        radius: 9,
        color,
        weight: 3,
        fillColor: color,
        fillOpacity: s.status === 'verified' ? 0.85 : 0.15,
      })
      const team = teams[i]
      const c = challengeMap.get(s.challenge_id)
      const when = new Date(s.created_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
      marker.bindPopup(
        `<b>${team?.name || 'Team'}</b><br>${c?.title || loc.label}<br>` +
          `${s.status}${s.submitted_by ? ' · by ' + s.submitted_by : ''} · ${when}`,
      )
      marker.addTo(layer)
    }
  }, [submissions, teams, challengeMap])

  return (
    <div className="pad stack">
      <div className="lb-legend" style={{ flexWrap: 'wrap', margin: '0 2px' }}>
        {teams.map((t, i) => (
          <span key={t.id}>
            <span
              className="swatch"
              style={{ background: TEAM_COLORS[i % TEAM_COLORS.length], borderRadius: '50%' }}
            />
            {t.name}
          </span>
        ))}
        <span className="muted">filled = verified · hollow = pending</span>
      </div>
      <div
        ref={mapEl}
        style={{ height: '68vh', borderRadius: 12, boxShadow: 'var(--shadow)' }}
      />
      <p className="muted small center" style={{ margin: 0 }}>
        Pins show challenges with a fixed, known spot (riddles, venues, City
        Hall). “Anywhere” challenges don’t pin.
      </p>
    </div>
  )
}
