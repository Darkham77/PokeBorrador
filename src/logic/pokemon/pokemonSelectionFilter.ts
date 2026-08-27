import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import { hasPokemonTag } from '@/logic/constants/tags'
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils'
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight } from '@/logic/pokemon/physicalDimensionsMath'

export interface PokemonFilterCriteria {
  searchQuery: string
  sortBy: string
  sortOrder: string
  activeTags: string[]
  excludeUids?: string[]
  allowedIds?: string[] | null
  allowedSpecies?: string[] | null
  isBattleSwitch?: boolean
  activePokemonUid?: string | null
  allowDead?: boolean
}

export function getPokemonTotalPower(p: Pokemon): number {
  return calculateTotalPower(p)
}

export function filterAndSortPokemon(
  sourceList: { pokemon: Pokemon; _source: PokemonSelectionSource; index: number }[],
  criteria: PokemonFilterCriteria
) {
  const filtered = sourceList.filter(item => {
    const p = item.pokemon
    if (!p) return false
    
    if (criteria.isBattleSwitch && criteria.activePokemonUid === p.uid) return false
    if (criteria.isBattleSwitch && p.hp <= 0 && !criteria.allowDead) return false
    
    if (criteria.allowedIds && !criteria.allowedIds.includes(p.uid)) return false
    
    if (criteria.allowedSpecies && criteria.allowedSpecies.length > 0) {
      if (!criteria.allowedSpecies.includes(p.id) && !criteria.allowedSpecies.includes(p.species)) return false
    }
    
    if (criteria.searchQuery) {
      const q = criteria.searchQuery.toLowerCase() // text-ok
      const matchName = p.name?.toLowerCase().includes(q)
      const matchNick = p.nickname?.toLowerCase().includes(q)
      const matchId = String(p.id).includes(q)
      if (!matchName && !matchNick && !matchId) return false
    }

    if (criteria.excludeUids && criteria.excludeUids.includes(p.uid)) return false
    
    if (criteria.activeTags.length > 0) {
      if (!criteria.activeTags.every(tag => {
        if (tag === 'shiny') return p.isShiny
        if (tag === 'team') return item._source === 'team'
        if (tag === 'box') return item._source === 'box'
        return hasPokemonTag(p, tag)
      })) return false
    }

    return true
  })

  if (criteria.isBattleSwitch && (!criteria.sortBy || criteria.sortBy === 'index' || criteria.sortBy === 'recent')) {
    return filtered.sort((a, b) => a.index - b.index)
  }

  return filtered.sort((a, b) => {
    const pA = a.pokemon
    const pB = b.pokemon
    let valA: number, valB: number

    if (criteria.sortBy === 'level') {
      valA = pA.level || 0
      valB = pB.level || 0
    } else if (criteria.sortBy === 'ivs') {
      const sum = (ivs: Pokemon['ivs']) => {
        const obj = ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        return (obj.hp || 0) + (obj.atk || 0) + (obj.def || 0) + (obj.spa || 0) + (obj.spd || 0) + (obj.spe || 0)
      }
      valA = sum(pA.ivs)
      valB = sum(pB.ivs)
    } else if (criteria.sortBy === 'TOT') {
      valA = getPokemonTotalPower(pA)
      valB = getPokemonTotalPower(pB)
    } else if (criteria.sortBy === 'hatched') {
      valA = pA.obtainedMethod === 'egg' ? 1 : 0
      valB = pB.obtainedMethod === 'egg' ? 1 : 0
    } else if (criteria.sortBy === 'weight') {
      valA = getPokemonPhysicalWeight(pA)
      valB = getPokemonPhysicalWeight(pB)
    } else if (criteria.sortBy === 'height') {
      valA = getPokemonPhysicalHeight(pA)
      valB = getPokemonPhysicalHeight(pB)
    } else {
      const BOX_SORT_INDEX_OFFSET = 1000;
      valA = pA.obtainedAt || ((a._source === 'box' ? BOX_SORT_INDEX_OFFSET : 0) + a.index)
      valB = pB.obtainedAt || ((b._source === 'box' ? BOX_SORT_INDEX_OFFSET : 0) + b.index)
    }

    if (valA === valB) {
      return criteria.sortOrder === 'desc' 
        ? b.pokemon.uid.localeCompare(a.pokemon.uid) 
        : a.pokemon.uid.localeCompare(b.pokemon.uid)
    }
    return criteria.sortOrder === 'desc' ? valB - valA : valA - valB
  })
}
