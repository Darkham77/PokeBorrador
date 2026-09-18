import type { Pokemon } from '@/types/pokemon/pokemon'
import { calculateTotalIVs, hasMaxIV } from '@/logic/pokemon/statsMath'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { hasPokemonTag, isPokemonFilterTagId } from '@/logic/constants/tags'
import {
  resolveFriendshipSealTier,
  isReadyForFriendshipEvolution,
} from '@/logic/pokemon/friendshipLogic'
import { FRIENDSHIP_BOUNDS } from '@/types/pokemon/friendship'
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils'

export interface BoxFilterStateData {
  search: string
  tier: string
  type: string
  levelMin: number
  levelMax: number
  ivTotalMin: number
  ivTotalMax: number
  ivAny31: boolean
  ivMin: number
  ivMax: number
  ivHP: number
  ivATK: number
  ivDEF: number
  ivSPA: number
  ivSPD: number
  ivSPE: number
  evHP: number
  evATK: number
  evDEF: number
  evSPA: number
  evSPD: number
  evSPE: number
  bstMin: number
  bstMax: number
  tags?: string[]
  friendshipMin: number
  friendshipMax: number
  friendshipSealTier: string
  friendshipEvoReady: boolean
  friendshipMaxOnly: boolean
}

export function matchesCoreFilters(p: Pokemon, f: BoxFilterStateData): boolean {
  if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false
  if (f.type !== 'all' && p.type !== f.type) return false
  if (p.level < f.levelMin || p.level > f.levelMax) return false
  if (f.search) {
    const query = f.search.toLowerCase() // text-ok: UI text display localization string
    const nameMatch = p.name.toLowerCase().includes(query) // text-ok: UI text display localization string
    const nickMatch = p.nickname?.toLowerCase().includes(query)
    if (!nameMatch && !nickMatch) return false
  }
  return true
}

interface StatIvValues {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

function getPokemonIvValues(ivs?: Pokemon['ivs']): StatIvValues {
  return {
    hp: ivs?.hp ?? 0,
    atk: ivs?.atk ?? 0,
    def: ivs?.def ?? 0,
    spa: ivs?.spa ?? 0,
    spd: ivs?.spd ?? 0,
    spe: ivs?.spe ?? 0
  }
}

function areIvsWithinGlobalBounds(vals: StatIvValues, min: number, max: number): boolean {
  const stats: readonly number[] = [vals.hp, vals.atk, vals.def, vals.spa, vals.spd, vals.spe]
  return stats.every(val => val >= min && val <= max)
}

function satisfySpecificIvThresholds(vals: StatIvValues, f: BoxFilterStateData): boolean {
  if (vals.hp < f.ivHP) return false
  if (vals.atk < f.ivATK) return false
  if (vals.def < f.ivDEF) return false
  if (vals.spa < f.ivSPA) return false
  if (vals.spd < f.ivSPD) return false
  if (vals.spe < f.ivSPE) return false
  return true
}

export function matchesIvFilters(p: Pokemon, f: BoxFilterStateData): boolean {
  const totalIv = calculateTotalIVs(p.ivs)
  if (totalIv < f.ivTotalMin || totalIv > f.ivTotalMax) return false
  if (f.ivAny31 && !hasMaxIV(p.ivs)) return false

  const vals = getPokemonIvValues(p.ivs)
  if (!areIvsWithinGlobalBounds(vals, f.ivMin, f.ivMax)) return false
  if (!satisfySpecificIvThresholds(vals, f)) return false

  return true
}

export function matchesEvFilters(p: Pokemon, f: BoxFilterStateData): boolean {
  const evs = p.evs
  if ((evs?.hp || 0) < f.evHP) return false
  if ((evs?.atk || 0) < f.evATK) return false
  if ((evs?.def || 0) < f.evDEF) return false
  if ((evs?.spa || 0) < f.evSPA) return false
  if ((evs?.spd || 0) < f.evSPD) return false
  if ((evs?.spe || 0) < f.evSPE) return false
  return true
}

export function matchesTagsFilter(p: Pokemon, tags?: readonly string[]): boolean {
  if (!tags || tags.length === 0) return true
  return tags.every(t => {
    if (t === 'team') return false
    return isPokemonFilterTagId(t) ? hasPokemonTag(p, t) : false
  })
}

export function matchesFriendshipFilters(p: Pokemon, f: BoxFilterStateData): boolean {
  const pFriendship = p.friendship ?? FRIENDSHIP_BOUNDS.LEGACY_BASE
  if (pFriendship < f.friendshipMin || pFriendship > f.friendshipMax) {
    return false
  }
  if (f.friendshipSealTier !== 'all' && resolveFriendshipSealTier(p.friendship) !== f.friendshipSealTier) {
    return false
  }
  if (f.friendshipEvoReady && !isReadyForFriendshipEvolution(p)) {
    return false
  }
  if (f.friendshipMaxOnly && (p.friendship ?? FRIENDSHIP_BOUNDS.LEGACY_BASE) < FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD) {
    return false
  }
  return true
}

export function matchesTotalPowerFilter(p: Pokemon, bstMin: number, bstMax: number): boolean {
  const totalPower = calculateTotalPower(p)
  return totalPower >= bstMin && totalPower <= bstMax
}

export function matchesAllBoxFilters(p: Pokemon, f: BoxFilterStateData): boolean {
  if (!matchesCoreFilters(p, f)) return false
  if (!matchesIvFilters(p, f)) return false
  if (!matchesEvFilters(p, f)) return false
  if (!matchesTagsFilter(p, f.tags)) return false
  if (!matchesFriendshipFilters(p, f)) return false
  if (!matchesTotalPowerFilter(p, f.bstMin, f.bstMax)) return false
  return true
}

const MAX_TOTAL_IVS = 186 as const
const MAX_BST_FILTER = 1000 as const
const MAX_SINGLE_IV = 31 as const
const MAX_POKEMON_LEVEL_CONST = 100 as const
const MAX_POKEMON_FRIENDSHIP_CONST = 255 as const

function hasActiveCoreFilters(f: BoxFilterStateData): boolean {
  return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < MAX_POKEMON_LEVEL_CONST || f.search !== ''
}

function hasActiveIvFilters(f: BoxFilterStateData): boolean {
  return f.ivTotalMin > 0 || f.ivTotalMax < MAX_TOTAL_IVS || f.ivAny31 || f.ivMin > 0 || f.ivMax < MAX_SINGLE_IV ||
         f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 || f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0
}

function hasActiveEvFilters(f: BoxFilterStateData): boolean {
  return f.evHP > 0 || f.evATK > 0 || f.evDEF > 0 || f.evSPA > 0 || f.evSPD > 0 || f.evSPE > 0
}

function hasActiveFriendshipFilters(f: BoxFilterStateData): boolean {
  return f.friendshipMin > 0 || f.friendshipMax < MAX_POKEMON_FRIENDSHIP_CONST ||
         f.friendshipSealTier !== 'all' || f.friendshipEvoReady || f.friendshipMaxOnly
}

function hasActiveBstOrTagsFilters(f: BoxFilterStateData): boolean {
  return f.bstMin > 0 || f.bstMax < MAX_BST_FILTER || Boolean(f.tags && f.tags.length > 0)
}

export function checkHasActiveFilters(f: BoxFilterStateData): boolean {
  return hasActiveCoreFilters(f) ||
         hasActiveIvFilters(f) ||
         hasActiveEvFilters(f) ||
         hasActiveFriendshipFilters(f) ||
         hasActiveBstOrTagsFilters(f)
}
