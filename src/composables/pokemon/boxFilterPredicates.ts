import type { Pokemon } from '@/types/pokemon/pokemon'
import { calculateTotalIVs, hasMaxIV } from '@/logic/pokemon/statsMath'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { hasPokemonTag, isPokemonTagId } from '@/logic/constants/tags'
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

export function matchesIvFilters(p: Pokemon, f: BoxFilterStateData): boolean {
  const totalIv = calculateTotalIVs(p.ivs)
  if (totalIv < f.ivTotalMin || totalIv > f.ivTotalMax) return false
  if (f.ivAny31 && !hasMaxIV(p.ivs)) return false

  const hp = p.ivs?.hp || 0
  const atk = p.ivs?.atk || 0
  const def = p.ivs?.def || 0
  const spa = p.ivs?.spa || 0
  const spd = p.ivs?.spd || 0
  const spe = p.ivs?.spe || 0

  if (
    hp < f.ivMin || hp > f.ivMax ||
    atk < f.ivMin || atk > f.ivMax ||
    def < f.ivMin || def > f.ivMax ||
    spa < f.ivMin || spa > f.ivMax ||
    spd < f.ivMin || spd > f.ivMax ||
    spe < f.ivMin || spe > f.ivMax
  ) {
    return false
  }

  if (hp < f.ivHP || atk < f.ivATK || def < f.ivDEF || spa < f.ivSPA || spd < f.ivSPD || spe < f.ivSPE) {
    return false
  }

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
    if (isPokemonTagId(t) || t === 'favorite' || t === 'comp') {
      return hasPokemonTag(p, t)
    }
    return false
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
