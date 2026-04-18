import { calculateMapBonuses } from './warEngine'

/**
 * Applies map dominance bonuses to a generated Pokémon.
 * @param {object} pokemon 
 * @param {string} mapId 
 * @param {string} faction 
 * @param {object} dominanceData 
 * @returns {object} The modified pokemon
 */
export function applyEncounterBonuses(pokemon, mapId, faction, dominanceData) {
  if (!faction || !dominanceData) return pokemon

  const winner = dominanceData[mapId]
  const isDominant = winner === faction
  const bonuses = calculateMapBonuses(isDominant)

  // 1. Shiny Multiplier (Legacy 1.3x)
  if (isDominant && !pokemon.shiny) {
    if (Math.random() < (0.001 * (bonuses.shinyMult - 1))) {
       pokemon.shiny = true
    }
  }

  // 2. IV Boost (Legacy rule: Guaranteed higher IVs)
  if (isDominant && bonuses.ivBoost > 0) {
    Object.keys(pokemon.ivs).forEach(stat => {
      pokemon.ivs[stat] = Math.max(pokemon.ivs[stat], 15) // Boost to at least 15
    })
  }

  return pokemon
}

/**
 * Calculates experience and money multipliers based on dominance.
 * @param {string} mapId 
 * @param {string} faction 
 * @param {object} dominanceData 
 * @returns {object} { expMult, moneyMult }
 */
export function getBattleRewardModifiers(mapId, faction, dominanceData) {
  if (!faction || !dominanceData) return { expMult: 1, moneyMult: 1 }

  const winner = dominanceData[mapId]
  const isDominant = winner === faction
  const bonuses = calculateMapBonuses(isDominant)

  return {
    expMult: bonuses.expMult,
    moneyMult: isDominant ? 1.2 : 1 // Legacy rule: 20% extra money
  }
}
