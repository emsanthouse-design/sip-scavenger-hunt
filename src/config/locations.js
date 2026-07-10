// Known, fixed locations for location-specific challenges (approximate lat/lng,
// downtown Boston). Powers the admin map: when a team completes one of these,
// a pin in the team's color appears at the challenge's spot.
//
// Deliberately NOT GPS: the app never asks interns for location. Challenges
// without a single fixed spot (bingo finds, BPL branches, BCYF centers, videos
// shot anywhere, roaming) simply don't get pins.
//
// Coordinates are close-enough-for-a-map approximations — tweak freely.

export const CHALLENGE_LOCATIONS = {
  // Quest 2 — riddle answers
  'riddle-state-house':   { lat: 42.3588, lng: -71.0638, label: 'Mass State House' },
  'riddle-granary':       { lat: 42.3575, lng: -71.0614, label: 'Granary Burying Ground' },
  'riddle-swan-boats':    { lat: 42.3540, lng: -71.0700, label: 'Swan Boats' },
  'riddle-faneuil':       { lat: 42.3600, lng: -71.0568, label: 'Faneuil Hall' },
  'riddle-quincy-market': { lat: 42.3600, lng: -71.0546, label: 'Quincy Market' },
  'riddle-bell-in-hand':  { lat: 42.3610, lng: -71.0572, label: 'Bell in Hand Tavern' },
  'riddle-art-venue':     { lat: 42.3438, lng: -71.0698, label: 'Boston Center for the Arts' },
  'riddle-old-south':     { lat: 42.3568, lng: -71.0585, label: 'Old South Meeting House' },
  'riddle-revere-house':  { lat: 42.3637, lng: -71.0537, label: 'Paul Revere House' },
  'riddle-union-oyster':  { lat: 42.3614, lng: -71.0570, label: 'Union Oyster House' },
  'riddle-mikes-pastry':  { lat: 42.3647, lng: -71.0542, label: "Mike's Pastry / Bova's (Hanover St)" },
  // riddle-dunkin: any Dunkin' — no fixed spot.

  // Quest 1 — the fixed-spot bingo item
  'bingo-ducklings': { lat: 42.3555, lng: -71.0693, label: 'Make Way for Ducklings' },

  // City Hall cluster (Quests 3 + 4)
  'video-9th-map':        { lat: 42.3603, lng: -71.0580, label: 'City Hall (9th floor)' },
  'cityhall-model-room':  { lat: 42.3603, lng: -71.0582, label: 'City Hall (model room)' },
  'cityhall-flag':        { lat: 42.3600, lng: -71.0577, label: 'City Hall (flags)' },
  'cityhall-mezzanine':   { lat: 42.3605, lng: -71.0579, label: 'City Hall (mezzanine)' },
  'cityhall-common':      { lat: 42.3604, lng: -71.0584, label: 'City Hall' },

  // Quest 5 — venues
  'culture-pao':       { lat: 42.3486, lng: -71.0629, label: 'Pao Arts Center' },
  'culture-maahm':     { lat: 42.3590, lng: -71.0650, label: 'Museum of African American History' },
  'culture-toussaint': { lat: 42.3630, lng: -71.0600, label: 'Toussaint Louverture Cultural Center (approx — adjust me)' },
  'culture-theater':   { lat: 42.3519, lng: -71.0643, label: 'Theater District' },
  'culture-famine':    { lat: 42.3573, lng: -71.0596, label: 'Irish Famine Memorial' },
  // culture-bpl: multiple branches — no pin. culture-sister-city / fav-thing: anywhere.
}
