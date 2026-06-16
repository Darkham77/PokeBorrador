

/**
 * Guardian Engine - Conflict Zone Logic
 * Handles daily deterministic map selection and guardian generation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */
import { getArgDateString } from '../utils/timeUtils.ts'


export interface GuardianBase {
  id: string;
  lv: number;
  pts: number;
}

export interface GuardianData extends GuardianBase {
  tier: string;
  isGuardian: boolean;
}

const GUARDIAN_POOL: Record<string, GuardianBase[]> = {
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
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}



/**
 * Calculates current conflict zones for a given date.
 * @param {string[]} allMapIds 
 * @param {Date} date 
 * @returns {string[]} List of map IDs
 */
export function getConflictZones(allMapIds: string[], date: Date | Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): string[] {
  if (!allMapIds || allMapIds.length === 0) return []
  
  const dateStr = getArgDateString(date)
  const zones: string[] = []
  let tempSeed = hashString(dateStr + "zones")
  
  while (zones.length < 5 && zones.length < allMapIds.length) {
    const idx = Math.abs(tempSeed) % allMapIds.length
    const mId = allMapIds[idx] || '';
    if (mId && !zones.includes(mId)) zones.push(mId)
    tempSeed = hashString(tempSeed.toString())
  }
  return zones
}

/**
 * Generates guardian data for a specific map and date.
 * @param {string} mapId 
 * @param {string[]} allMapIds 
 * @param {Date} date 
 * @returns {GuardianData|null}
 */
export function getGuardianData(mapId: string, allMapIds: string[], date: Date | Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): GuardianData | null {
  const zones = getConflictZones(allMapIds, date)
  if (!zones.includes(mapId)) return null

  const dateStr = getArgDateString(date)
  const seed = hashString(dateStr + mapId)
  
  const rarityRand = (seed % 100)
  let tier = 'common'
  if (rarityRand >= 90) tier = 'elite'
  else if (rarityRand >= 60) tier = 'rare'

  const pool = GUARDIAN_POOL[tier] || GUARDIAN_POOL['common'] || [];
  if (pool.length === 0) return null;
  const index = seed % pool.length;
  const base = pool[index];
  if (!base) return null;

  return {
    ...base,
    tier,
    isGuardian: true
  }
}

/**
 * [Instancia Local Only]
 * Simulates a dominance shift for offline play.
 * Generates random points for factions to keep maps dynamic.
 */
export function simulateLocalDominance(allMapIds: string[]): { mapId: string; union: number; poder: number }[] {
  // Logic to be used in warStore for Local Instance
  return allMapIds.map(mapId => ({
    mapId,
    union: Math.floor(Math.random() * 500),
    poder: Math.floor(Math.random() * 500)
  }))
}
