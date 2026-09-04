
import { calculateMapBonuses } from './warEngine.ts'
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon'
import type { DominanceInfo } from '@/types/system/stores'
import type { MapRouteId } from '@/data/world/map-assets'
import type { FactionId } from '@/types/system/game'

const DOMINANCE_MIN_IV_BOOST = 15
const DOMINANCE_MONEY_BOOST_MULT = 1.2

/**
 * Applies map dominance bonuses to a generated Pokémon.
 */
export function applyEncounterBonuses(
  pokemon: Pokemon,
  mapId: MapRouteId,
  faction: FactionId | null,
  dominanceData?: Partial<Record<MapRouteId, DominanceInfo>> | Record<MapRouteId, DominanceInfo> | null
): Pokemon {
  if (!faction || !dominanceData) return pokemon

  const winner = dominanceData[mapId]?.winner
  const isDominant = winner === faction
  const bonuses = calculateMapBonuses(isDominant)

  // 1. Shiny Multiplier (Legacy 1.3x)
  if (isDominant && !pokemon.isShiny) {
    if (Math.random() < (0.001 * (bonuses.shinyMult - 1))) {
       pokemon.isShiny = true
    }
  }

  // 2. IV Boost (Legacy rule: Guaranteed higher IVs)
  if (isDominant && bonuses.ivBoost > 0) {
    const ivKeys: (keyof PokemonIVs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    ivKeys.forEach(stat => {
      pokemon.ivs[stat] = Math.max(Number(pokemon.ivs[stat]) || 0, DOMINANCE_MIN_IV_BOOST) // Boost to at least 15
    })
    
    // CRITICAL: Recalculate stats after IV changes
    recalcPokemonStats(pokemon)
  }

  return pokemon
}

export function getBattleRewardModifiers(
  mapId: MapRouteId,
  faction: FactionId | null,
  dominanceData: Partial<Record<MapRouteId, DominanceInfo>> | Record<MapRouteId, DominanceInfo>
): { expMult: number; moneyMult: number } {
  if (!faction || !dominanceData) return { expMult: 1, moneyMult: 1 }

  const winner = dominanceData[mapId]?.winner
  const isDominant = winner === faction
  const bonuses = calculateMapBonuses(isDominant)

  return {
    expMult: bonuses.expMult,
    moneyMult: isDominant ? DOMINANCE_MONEY_BOOST_MULT : 1 // Legacy rule: 20% extra money
  }
}
