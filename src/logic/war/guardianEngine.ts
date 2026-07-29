

/**
 * Guardian Engine - Conflict Zone Logic
 * Handles daily deterministic map selection and guardian generation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */
import { getArgDateString } from '../utils/timeUtils.ts'
import type { MapRouteId } from '@/data/world/map-assets'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

const GUARDIAN_TIERS = ['common', 'rare', 'elite'] as const
type GuardianTier = (typeof GUARDIAN_TIERS)[number]


export interface GuardianBase {
  id: PokemonSpeciesId;
  lv: number;
  pts: number;
}

export interface GuardianData extends GuardianBase {
  tier: GuardianTier;
  isGuardian: boolean;
}

const GUARDIAN_POOL: Record<GuardianTier, readonly GuardianBase[]> = {
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
    { id: 'gyarados',   lv: 50, pts: 300 }, { id: 'alakazam',   lv: 48, pts: 300 },
    { id: 'machamp',    lv: 48, pts: 300 }, { id: 'gengar',     lv: 48, pts: 300 },
    { id: 'exeggutor',  lv: 46, pts: 300 }, { id: 'pinsir',     lv: 47, pts: 300 },
    { id: 'scyther',    lv: 47, pts: 300 }, { id: 'kangaskhan', lv: 45, pts: 300 },
    { id: 'tauros',     lv: 45, pts: 300 }, { id: 'slowbro',    lv: 46, pts: 300 }, 
    { id: 'jolteon',    lv: 48, pts: 300 }, { id: 'vaporeon',   lv: 48, pts: 300 }, 
    { id: 'flareon',    lv: 48, pts: 300 }
  ],
  elite: [
    { id: 'dragonite',  lv: 60, pts: 750 }, { id: 'snorlax',    lv: 55, pts: 750 },
    { id: 'lapras',     lv: 55, pts: 750 }, { id: 'chansey',    lv: 50, pts: 750 },
    { id: 'cloyster',   lv: 52, pts: 750 }
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
export function getConflictZones(allMapIds: readonly MapRouteId[], date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): MapRouteId[] {
  if (!allMapIds || allMapIds.length === 0) return []
  
  const dateStr = getArgDateString(date)
  const zones: MapRouteId[] = []
  let tempSeed = hashString(dateStr + "zones")
  
  while (zones.length < 12 && zones.length < allMapIds.length) {
    const idx = Math.abs(tempSeed) % allMapIds.length
    const mId = allMapIds[idx]
    if (!mId) {
      throw new Error(`[guardianEngine] Failed to resolve conflict zone at index ${idx}`)
    }
    if (!zones.includes(mId)) zones.push(mId)
    tempSeed = hashString(tempSeed.toString())
  }
  return zones
}

/**
 * Generates guardian data for a specific map and date.
 * @param {string} mapId 
 * @param {string[]} allMapIds 
 * @param {Temporal.ZonedDateTime|Temporal.Instant} date 
 * @returns {GuardianData|null}
 */
export function getGuardianData(mapId: MapRouteId, allMapIds: readonly MapRouteId[] = [], date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): GuardianData | null {
  if (allMapIds && allMapIds.length > 0) {
    const zones = getConflictZones(allMapIds, date)
    if (!zones.includes(mapId)) return null
  }

  const dateStr = getArgDateString(date)
  const seed = hashString(dateStr + mapId)
  
  const rarityRand = (seed % 100)
  let tier: GuardianTier = 'common'
  if (rarityRand >= 90) tier = 'elite'
  else if (rarityRand >= 60) tier = 'rare'

  const pool = GUARDIAN_POOL[tier];
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
export function simulateLocalDominance(allMapIds: readonly MapRouteId[]): { mapId: MapRouteId; union: number; poder: number }[] {
  // Logic to be used in warStore for Local Instance
  return allMapIds.map(mapId => ({
    mapId,
    union: Math.floor(Math.random() * 500),
    poder: Math.floor(Math.random() * 500)
  }))
}
