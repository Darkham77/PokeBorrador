

/**
 * Guardian Engine - Conflict Zone Logic
 * Handles daily deterministic map selection and guardian generation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */
import { getArgDateString } from '../utils/timeUtils.ts'
import type { MapRouteId } from '@/data/world/map-assets'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import {
  MAX_ACTIVE_WAR_ZONES,
  ELITE_GUARDIAN_RARITY_THRESHOLD,
  RARE_GUARDIAN_RARITY_THRESHOLD,
  GUARDIAN_RANDOM_SCALE,
  BASE_GUARDIAN_POINTS,
  RARE_GUARDIAN_POINTS,
  LEGENDARY_GUARDIAN_POINTS,
  LOCAL_DOMINANCE_MAX_POINTS,
  HASH_SHIFT_BITS,
  GUARDIAN_LEVELS
} from '@/logic/constants/gameplay'

export const GUARDIAN_TIERS = ['common', 'rare', 'elite'] as const
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
    { id: 'arcanine',   lv: GUARDIAN_LEVELS.COMMON_HIGH, pts: BASE_GUARDIAN_POINTS },     { id: 'pidgeot',   lv: GUARDIAN_LEVELS.COMMON_MID_LOW, pts: BASE_GUARDIAN_POINTS },
    { id: 'nidoking',   lv: GUARDIAN_LEVELS.COMMON_MID_HIGH, pts: BASE_GUARDIAN_POINTS }, { id: 'nidoqueen', lv: GUARDIAN_LEVELS.COMMON_MID_HIGH, pts: BASE_GUARDIAN_POINTS },
    { id: 'victreebel', lv: GUARDIAN_LEVELS.COMMON_MID, pts: BASE_GUARDIAN_POINTS },      { id: 'vileplume', lv: GUARDIAN_LEVELS.COMMON_MID, pts: BASE_GUARDIAN_POINTS },
    { id: 'sandslash',  lv: GUARDIAN_LEVELS.COMMON_LOW, pts: BASE_GUARDIAN_POINTS },      { id: 'fearow',    lv: GUARDIAN_LEVELS.COMMON_MID_LOW, pts: BASE_GUARDIAN_POINTS },
    { id: 'golem',      lv: GUARDIAN_LEVELS.COMMON_HIGH, pts: BASE_GUARDIAN_POINTS },     { id: 'raichu',    lv: GUARDIAN_LEVELS.COMMON_HIGH, pts: BASE_GUARDIAN_POINTS },
    { id: 'weezing',    lv: GUARDIAN_LEVELS.COMMON_MIN, pts: BASE_GUARDIAN_POINTS },      { id: 'muk',       lv: GUARDIAN_LEVELS.COMMON_MIN, pts: BASE_GUARDIAN_POINTS },
    { id: 'starmie',    lv: GUARDIAN_LEVELS.COMMON_MID_HIGH, pts: BASE_GUARDIAN_POINTS }, { id: 'rapidash',  lv: GUARDIAN_LEVELS.COMMON_MID_HIGH, pts: BASE_GUARDIAN_POINTS },
    { id: 'hypno',      lv: GUARDIAN_LEVELS.COMMON_MID_LOW, pts: BASE_GUARDIAN_POINTS }
  ],
  rare: [
    { id: 'gyarados',   lv: GUARDIAN_LEVELS.RARE_HIGH, pts: RARE_GUARDIAN_POINTS }, { id: 'alakazam',   lv: GUARDIAN_LEVELS.RARE_MID, pts: RARE_GUARDIAN_POINTS },
    { id: 'machamp',    lv: GUARDIAN_LEVELS.RARE_MID, pts: RARE_GUARDIAN_POINTS },  { id: 'gengar',     lv: GUARDIAN_LEVELS.RARE_MID, pts: RARE_GUARDIAN_POINTS },
    { id: 'exeggutor',  lv: GUARDIAN_LEVELS.RARE_MIN, pts: RARE_GUARDIAN_POINTS },  { id: 'pinsir',     lv: GUARDIAN_LEVELS.RARE_LOW, pts: RARE_GUARDIAN_POINTS },
    { id: 'scyther',    lv: GUARDIAN_LEVELS.RARE_LOW, pts: RARE_GUARDIAN_POINTS },  { id: 'kangaskhan', lv: GUARDIAN_LEVELS.COMMON_HIGH, pts: RARE_GUARDIAN_POINTS },
    { id: 'tauros',     lv: GUARDIAN_LEVELS.COMMON_HIGH, pts: RARE_GUARDIAN_POINTS }, { id: 'slowbro',    lv: GUARDIAN_LEVELS.RARE_MIN, pts: RARE_GUARDIAN_POINTS }, 
    { id: 'jolteon',    lv: GUARDIAN_LEVELS.RARE_MID, pts: RARE_GUARDIAN_POINTS },  { id: 'vaporeon',   lv: GUARDIAN_LEVELS.RARE_MID, pts: RARE_GUARDIAN_POINTS }, 
    { id: 'flareon',    lv: GUARDIAN_LEVELS.RARE_MID, pts: RARE_GUARDIAN_POINTS }
  ],
  elite: [
    { id: 'dragonite',  lv: GUARDIAN_LEVELS.ELITE_HIGH, pts: LEGENDARY_GUARDIAN_POINTS }, { id: 'snorlax',    lv: GUARDIAN_LEVELS.ELITE_MID, pts: LEGENDARY_GUARDIAN_POINTS },
    { id: 'lapras',     lv: GUARDIAN_LEVELS.ELITE_MID, pts: LEGENDARY_GUARDIAN_POINTS },  { id: 'chansey',    lv: GUARDIAN_LEVELS.RARE_HIGH, pts: LEGENDARY_GUARDIAN_POINTS },
    { id: 'cloyster',   lv: GUARDIAN_LEVELS.ELITE_LOW, pts: LEGENDARY_GUARDIAN_POINTS }
  ]
}

/**
 * Deterministic hash function for date-based seeds.
 * @param {string} str 
 * @returns {number}
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << HASH_SHIFT_BITS) - hash) + str.charCodeAt(i)
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
  
  while (zones.length < MAX_ACTIVE_WAR_ZONES && zones.length < allMapIds.length) {
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
  
  const rarityRand = (seed % GUARDIAN_RANDOM_SCALE)
  let tier: GuardianTier = 'common'
  if (rarityRand >= ELITE_GUARDIAN_RARITY_THRESHOLD) tier = 'elite'
  else if (rarityRand >= RARE_GUARDIAN_RARITY_THRESHOLD) tier = 'rare'

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
    union: Math.floor(Math.random() * LOCAL_DOMINANCE_MAX_POINTS),
    poder: Math.floor(Math.random() * LOCAL_DOMINANCE_MAX_POINTS)
  }))
}
