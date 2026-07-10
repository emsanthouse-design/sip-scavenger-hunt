// ---------------------------------------------------------------------------
// SEED DATA — the single source of truth for the hunt's content + scoring.
//
// This mirrors the SQL in supabase/schema.sql. It is used:
//   1. as a human-readable reference for what gets seeded into the database, and
//   2. as a *fallback* the front end can render if the database can't be reached
//      (so a dropped connection never shows interns a blank challenge list).
//
// Everything here is config-driven on purpose: point values, caps, bonus tiers
// and the challenge list are still being finalized. The admin "Settings" screen
// edits the database copies of these at run time, so nothing here is load-bearing
// once the database is seeded — change values in the admin UI, not in code.
//
// Source: SIP 2026 Scavenger Hunt planning doc, "Working Draft" (the most
// current point values), reconciled with the build brief's scoring rules.
// ---------------------------------------------------------------------------

// Quest metadata. Quest 0 is reserved for the Roaming Bonus, which is NOT one
// of the five quests that count toward the Hero's Journey breadth bonus.
export const QUESTS = [
  { id: 1, name: 'Boston Bingo', tagline: 'Fast photo grabs as you move.', emoji: '⚡', heroEligible: true },
  { id: 2, name: 'Solve the Riddle', tagline: 'Crack the clue, prove it with a team photo.', emoji: '🗺', heroEligible: true },
  { id: 3, name: 'Lights, Camera, Boston', tagline: 'Creative videos — whole team on camera.', emoji: '🎬', heroEligible: true },
  { id: 4, name: 'City Hall Insider', tagline: 'The "you actually work here" quest.', emoji: '🏛', heroEligible: true },
  { id: 5, name: 'Culture & Community', tagline: 'The big investment — commit and you can win the hunt.', emoji: '🎨', heroEligible: true },
  // Bonus sections — NOT among the five quests, so they don't count toward the
  // Hero's Journey breadth bonus (heroEligible: false).
  { id: 6, name: 'LinkedIn Bonus', tagline: 'Post your best moment — +1 for each teammate the City reposts.', emoji: '💼', heroEligible: false },
  { id: 0, name: 'Roaming Bonus', tagline: 'Spot the roamers out on the route.', emoji: '✨', heroEligible: false },
]

// Evidence types drive what the submit form asks for.
//   photo    -> camera/photo upload
//   video    -> short video clip upload
//   text     -> typed answer only (no media)
//   recorded -> a recorded spoken answer; accepts a video/audio clip
export const EVIDENCE = { PHOTO: 'photo', VIDEO: 'video', TEXT: 'text', RECORDED: 'recorded' }

// challenges: stable string ids so submissions survive point/label tweaks.
//   points     - default points awarded on verify (admin can override per submission)
//   maxClaims  - how many times ONE team can score this challenge (caps)
//   enhanced   - true => needs more than a photo (brochure, named exhibit, etc.)
//   evidence   - what the submit form collects
//   hint       - admin-only verification note (riddle answers, what to check for)
export const CHALLENGES = [
  // --- Quest 1: Boston Bingo (1 pt each unless noted) -----------------------
  { id: 'bingo-flag',        quest: 1, title: 'Photo with a Boston city flag', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-lobster',     quest: 1, title: 'Photo with something shaped like a lobster', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-penny',       quest: 1, title: 'Throw a penny in a fountain & make a wish', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-wicked',      quest: 1, title: 'Find a "wicked" Boston sign or slogan', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-small-biz',   quest: 1, title: 'Small independent business open 20+ years', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-street-sign', quest: 1, title: 'Street sign in a language other than English', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-performer',   quest: 1, title: 'A live street performer or musician', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-public-art',  quest: 1, title: 'A public art project funded by the City (max 2)', points: 1, maxClaims: 2, evidence: 'photo' },
  { id: 'bingo-old-building',quest: 1, title: 'A building older than 1850 (team photo)', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-ducklings',   quest: 1, title: 'Strike a pose with the "Make Way for Ducklings" statues', points: 1, maxClaims: 1, evidence: 'photo' },
  { id: 'bingo-statue-pose', quest: 1, title: "Recreate a historical statue's pose (in the shot with the statue)", points: 2, maxClaims: 1, evidence: 'photo' },

  // --- Quest 2: Solve the Riddle (2 pts each) -------------------------------
  // Riddle text lives in the printed packet; the app just needs the line items.
  // hint = facilitator-only answer (NEVER shown to interns).
  { id: 'riddle-state-house',   quest: 2, title: 'Riddle 1 — the golden-domed lawmakers’ home', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Massachusetts State House (Beacon Hill).' },
  { id: 'riddle-granary',       quest: 2, title: 'Riddle 2 — a signer rests among old stones', points: 2, maxClaims: 1, evidence: 'photo', hint: "Answer: Granary Burying Ground (John Hancock's grave)." },
  { id: 'riddle-swan-boats',    quest: 2, title: 'Riddle 3 — shaped like birds, glide on water', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Swan Boats (Public Garden).' },
  { id: 'riddle-faneuil',       quest: 2, title: 'Riddle 4 — the "cradle" where voices rose', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Faneuil Hall ("Cradle of Liberty").' },
  { id: 'riddle-quincy-market', quest: 2, title: 'Riddle 5 — food-filled favorite beside historic halls', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Quincy Market.' },
  { id: 'riddle-dunkin',        quest: 2, title: 'Riddle 6 — the orange-and-pink morning stop', points: 2, maxClaims: 1, evidence: 'photo', hint: "Answer: Dunkin'." },
  { id: 'riddle-bell-in-hand',  quest: 2, title: 'Riddle 7 — a town crier’s famous tavern', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Bell in Hand Tavern.' },
  { id: 'riddle-art-venue',     quest: 2, title: 'Riddle 8 — Boston’s home for art', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Boston Center for the Arts.' },
  { id: 'riddle-old-south',     quest: 2, title: 'Riddle 9 — where crowds met before tea hit the bay', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Old South Meeting House.' },
  { id: 'riddle-revere-house',  quest: 2, title: 'Riddle 10 — a midnight rider’s North End home', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Paul Revere House.' },
  { id: 'riddle-union-oyster',  quest: 2, title: 'Riddle 11 — America’s oldest restaurant, oysters its fame', points: 2, maxClaims: 1, evidence: 'photo', hint: 'Answer: Union Oyster House.' },
  { id: 'riddle-mikes-pastry',  quest: 2, title: 'Riddle 12 — North End bakery known for cannoli', points: 2, maxClaims: 1, evidence: 'photo', hint: "Answer: Bova's Bakery OR Mike's Pastry (both accepted)." },

  // --- Quest 3: Lights, Camera, Boston (3 pts each, video) -------------------
  { id: 'video-music',     quest: 3, title: '30-second music video — World Cup theme', points: 3, maxClaims: 1, evidence: 'video' },
  { id: 'video-tourism',   quest: 3, title: '30-second "Boston Tourism Commercial" (full team on camera)', points: 3, maxClaims: 1, evidence: 'video' },
  { id: 'video-plaque',    quest: 3, title: '15-second dramatic reading from a public historical plaque', points: 3, maxClaims: 1, evidence: 'video' },
  { id: 'video-9th-map',   quest: 3, title: '15-second video explaining what one of the 9th-floor maps in City Hall shows', points: 3, maxClaims: 1, evidence: 'video' },

  // --- Quest 4: City Hall Insider (2 pts each) ------------------------------
  { id: 'cityhall-model-room', quest: 4, title: 'Visit the model room', points: 2, maxClaims: 1, evidence: 'photo' },
  { id: 'cityhall-flag',       quest: 4, title: 'Identify the flag (besides the US & Boston flags) flown outside City Hall today — and explain why it matters', points: 2, maxClaims: 1, evidence: 'photo', enhanced: true },
  // Dropped in the final draft (replaced by the flag challenge); hidden, not deleted.
  { id: 'cityhall-councilor',  quest: 4, title: 'Photo with a City Council member', points: 2, maxClaims: 1, evidence: 'photo', active: false },
  { id: 'cityhall-service',    quest: 4, title: 'Photo that represents "public service" — explain how', points: 2, maxClaims: 1, evidence: 'photo', enhanced: true },
  { id: 'cityhall-bcyf',       quest: 4, title: 'Visit a BCYF center inside the perimeter', points: 2, maxClaims: 1, evidence: 'photo' },
  { id: 'cityhall-mezzanine',  quest: 4, title: '15-second video explaining the mezzanine art exhibit', points: 2, maxClaims: 1, evidence: 'video' },
  { id: 'cityhall-common',     quest: 4, title: 'Team video: one thing all your departments have in common', points: 2, maxClaims: 1, evidence: 'video' },
  // Editable slot kept for the "accessibility office" item being reworked.
  { id: 'cityhall-slot',       quest: 4, title: '(Configurable slot — edit or hide in Settings)', points: 2, maxClaims: 1, evidence: 'photo', active: false },

  // --- Quest 5: Culture & Community (the high-value quest) -------------------
  { id: 'culture-pao',        quest: 5, title: 'Pao Arts Center — team photo + name an exhibit + bring back a brochure', points: 5, maxClaims: 1, evidence: 'photo', enhanced: true },
  { id: 'culture-maahm',      quest: 5, title: 'Museum of African American History — team photo + exhibit + bring back a brochure', points: 5, maxClaims: 1, evidence: 'photo', enhanced: true },
  { id: 'culture-toussaint',  quest: 5, title: 'Toussaint Louverture Cultural Center — team photo + highlight a hallway artwork', points: 5, maxClaims: 1, evidence: 'photo', enhanced: true },
  { id: 'culture-bpl',        quest: 5, title: 'Get a BPL library card + check out a book', points: 5, maxClaims: 1, evidence: 'photo', enhanced: true },
  { id: 'culture-sister-city',quest: 5, title: "Find representation of one of Boston's Sister Cities (max 2)", points: 2, maxClaims: 2, evidence: 'photo' },
  { id: 'culture-fav-thing',  quest: 5, title: 'Ask someone their favorite thing about Boston + tell us (max 2 people)', points: 2, maxClaims: 2, evidence: 'recorded', enhanced: true },
  { id: 'culture-theater',    quest: 5, title: 'Theater District photo recreating an upcoming opera/theater performance', points: 5, maxClaims: 1, evidence: 'photo' },
  { id: 'culture-famine',     quest: 5, title: 'Irish Famine Memorial on School Street — photo + explain its importance', points: 5, maxClaims: 1, evidence: 'photo', enhanced: true },

  // --- Quest 6: LinkedIn Bonus (individual; +1 per teammate reposted) --------
  { id: 'linkedin-repost', quest: 6, maxClaims: 5, points: 1, evidence: 'photo', enhanced: true,
    title: 'LinkedIn: post a challenge photo — “What is Boston to you?” Tag @CityofBoston + the packet hashtags, then submit a screenshot here. +1 for each teammate the City reposts (one post per person).',
    hint: 'Award (and repost) only if it clears the bar: says something real (not just a photo), professional first-person voice, tags @CityofBoston + teammates + a hashtag, clear well-lit photo with 2+ teammates, nothing political/unsafe, clean copy. One post per person; +1 each.' },

  // --- Quest 0: Roaming Bonus (one-time per team) ---------------------------
  { id: 'roaming-bonus', quest: 0, title: 'Spot BOTH roamers (Isabella & Avis) in one photo with 2+ teammates', points: 3, maxClaims: 1, evidence: 'photo', enhanced: true,
    hint: 'Both roamers must be in frame together, plus at least two of the team’s own members. Once per team.' },
]

// Scoring config — editable in the admin Settings screen.
export const CONFIG = {
  // Hero's Journey breadth bonus: distinct hero-eligible quests with >=1 verified
  // point-bearing submission. Award only the highest tier reached (not cumulative).
  heroTiers: [
    { quests: 3, bonus: 5 },
    { quests: 4, bonus: 10 },
    { quests: 5, bonus: 15 },
  ],
  // Roaming bonus value lives on the roaming-bonus challenge's points, but we
  // mirror it here so Settings can surface it plainly. The challenge points win.
  roamingBonus: 3,
  // Every photo/video must include at least two team members. This is a
  // verification criterion the admin eyeballs; surfaced as a reminder.
  minTeammatesInShot: 2,
  // Event window (local Boston time, HH:MM). Drives the intern countdown strip
  // and the halfway / 30-minutes-left alerts. Editable in Admin → Settings.
  startTime: '13:30',
  endTime: '16:40',
}

// Seed teams. Join codes are short + memorable; admin can rename/add in Settings.
// Expecting ~15 players => three teams of five.
export const TEAMS = [
  { name: 'Team 1', join_code: 'HUB' },
  { name: 'Team 2', join_code: 'BAY' },
  { name: 'Team 3', join_code: 'FEN' },
]

// Boston OHR brand tokens (also mirrored in styles.css as CSS variables).
export const BRAND = {
  charlesBlue: '#091F2F',
  optimisticBlue: '#1871BD',
  freedomRed: '#FB4D42',
  bodyGray: '#58585B',
  lightGray: '#F2F2F2',
  white: '#FFFFFF',
}

// Convenience lookups.
export const questById = (id) => QUESTS.find((q) => q.id === id)
export const challengesByQuest = (quest) =>
  CHALLENGES.filter((c) => c.quest === quest && c.active !== false)
