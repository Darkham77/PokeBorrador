
import { calculateMapBonuses } from './warEngine'
import { recalcPokemonStats } from '@/logic/pokemonFactory'
import type { Pokemon, PokemonIVs } from '@/types/pokemon'

/**
 * Applies map dominance bonuses to a generated Pokémon.
 * @param {Pokemon} pokemon 
 * @param {string} mapId 
 * @param {string} faction 
 * @param {Record<string, string>} dominanceData 
 * @returns {Pokemon} The modified pokemon
 */
export function applyEncounterBonuses(pokemon: Pokemon, mapId: string, faction: string | null, dominanceData: Record<string, string>): Pokemon {
  if (!faction || !dominanceData) return pokemon

  const winner = dominanceData[mapId]
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
      pokemon.ivs[stat] = Math.max(pokemon.ivs[stat], 15) // Boost to at least 15
    })
    
    // CRITICAL: Recalculate stats after IV changes
    recalcPokemonStats(pokemon)
  }

  return pokemon
}

/**
 * Calculates experience and money multipliers based on dominance.
 * @param {string} mapId 
 * @param {string} faction 
 * @param {Record<string, string>} dominanceData 
 * @returns {object} { expMult, moneyMult }
 */
export function getBattleRewardModifiers(mapId: string, faction: string | null, dominanceData: Record<string, string>): { expMult: number; moneyMult: number } {
  if (!faction || !dominanceData) return { expMult: 1, moneyMult: 1 }

  const winner = dominanceData[mapId]
  const isDominant = winner === faction
  const bonuses = calculateMapBonuses(isDominant)

  return {
    expMult: bonuses.expMult,
    moneyMult: isDominant ? 1.2 : 1 // Legacy rule: 20% extra money
  }
}
