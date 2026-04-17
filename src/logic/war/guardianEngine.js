/**
 * Guardian Engine - Conflict Zone Logic
 * Handles daily deterministic map selection and guardian generation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

export const GUARDIAN_POOL = {
  common: [
    { id: 'arcanine',   lv: 45, pts: 150 }, { id: 'pidgeot',    lv: 42, pts: 150 },
    { id: 'nidoking',   lv: 44, pts: 150 }, { id: 'nidoqueen',  lv: 44, pts: 150 },
    { id: 'victreebel', lv: 43, pts: 150 }, { id: 'vileplume',  lv: 43, pts: 150 },
    { id: 'sandslash',  lv: 41, pts: 150 }, { id: 'fearow',     lv: 42, pts: 150 },
    { id: 'golem',      lv: 45, pts: 150 }, { id: 'raichu',     lv: 45, pts: 150 },
    { id: 'weezing',    lv: 40, pts: 150 }, { id: 'muk',        lv: 40, pts: 150 },
    { id: 'starmie',    lv: 44, pts: 150 }, { id: 'rapidash',   lv: 44, pts: 150 },
    { id: 'hypno',      lv: 42, pts: 150 }
  ],
  rare: [
    { id: 'gyarados',   lv: 50, pts: 150 }, { id: 'alakazam',   lv: 48, pts: 150 },
    { id: 'machamp',    lv: 48, pts: 150 }, { id: 'gengar',     lv: 48, pts: 150 },
    { id: 'exeggutor',  lv: 46, pts: 150 }, { id: 'pinsir',     lv: 47, pts: 150 },
    { id: 'scyther',    lv: 47, pts: 150 }, { id: 'kangaskhan', lv: 45, pts: 150 },
    { id: 'tauros',     lv: 45, pts: 150 }, { id: 'slowbro',    lv: 46, pts: 150 }, 
    { id: 'jolteon',    lv: 48, pts: 150 }, { id: 'vaporeon',   lv: 48, pts: 150 }, 
    { id: 'flareon',    lv: 48, pts: 150 }
  ],
  elite: [
    { id: 'dragonite',  lv: 60, pts: 150 }, { id: 'snorlax',    lv: 55, pts: 150 },
    { id: 'lapras',     lv: 55, pts: 150 }, { id: 'chansey',    lv: 50, pts: 150 },
    { id: 'cloyster',   lv: 52, pts: 150 }
  ]
}

export const GUARDIAN_CHANCE = 0.015

/**
 * Deterministic hash function for date-based seeds.
 * @param {string} str 
 * @returns {number}
 */
export function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Gets a clean date string for Argentina Time (UTC-3).
 * @param {Date} date 
 * @returns {string} YYYY-MM-DD
 */
function getArgDateString(date = new Date()) {
  const argTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const y = argTime.getFullYear()
  const m = String(argTime.getMonth() + 1).padStart(2, '0')
  const d = String(argTime.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calculates current conflict zones for a given date.
 * @param {Array} allMapIds 
 * @param {Date} date 
 * @returns {Array} List of map IDs
 */
export function getConflictZones(allMapIds, date = new Date()) {
  if (!allMapIds || allMapIds.length === 0) return []
  
  const dateStr = getArgDateString(date)
  const zones = []
  let tempSeed = hashString(dateStr + "zones")
  
  while (zones.length < 5 && zones.length < allMapIds.length) {
    const idx = Math.abs(tempSeed) % allMapIds.length
    const mId = allMapIds[idx]
    if (!zones.includes(mId)) zones.push(mId)
    tempSeed = hashString(tempSeed.toString())
  }
  return zones
}

/**
 * Generates guardian data for a specific map and date.
 * @param {string} mapId 
 * @param {Array} allMapIds 
 * @param {Date} date 
 * @returns {object|null}
 */
export function getGuardianData(mapId, allMapIds, date = new Date()) {
  const zones = getConflictZones(allMapIds, date)
  if (!zones.includes(mapId)) return null

  const dateStr = getArgDateString(date)
  const seed = hashString(dateStr + mapId)
  
  const rarityRand = (seed % 100)
  let tier = 'common'
  if (rarityRand >= 90) tier = 'elite'
  else if (rarityRand >= 60) tier = 'rare'

  const pool = GUARDIAN_POOL[tier]
  const index = seed % pool.length
  return {
    ...pool[index],
    tier,
    isGuardian: true
  }
}

/**
 * [Instancia Local Only]
 * Simulates a dominance shift for offline play.
 * Generates random points for factions to keep maps dynamic.
 */
export function simulateLocalDominance(allMapIds) {
  // Logic to be used in warStore for Local Instance
  return allMapIds.map(mapId => ({
    mapId,
    union: Math.floor(Math.random() * 500),
    poder: Math.floor(Math.random() * 500)
  }))
}
