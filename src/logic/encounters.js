import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { GAME_RATIOS } from '@/data/constants';
import { makePokemon } from '@/logic/pokemonFactory';
import { getDayCycle } from '@/logic/timeUtils';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine';

/**
 * Gets the valid pool of Pokémon for a location and time cycle.
 * Incorporates active events.
 */
export function getEncounterPool(loc, cycle, activeEvents = []) {
  if (!loc || !loc.wild) return { pool: [], rates: [] };
  
  let pool = [...(loc.wild[cycle] || loc.wild.day || [])];
  let rates = [...(loc.rates && (loc.rates[cycle] || loc.rates.day) ? (loc.rates[cycle] || loc.rates.day) : [])];
  
  // Ensure rates match pool length
  while (rates.length < pool.length) rates.push(10);

  // Apply Event Injections
  activeEvents.forEach(ev => {
    if (ev.active && ev.config?.ignoreTimeRestrictions && ev.config.species) {
      const eventSpecies = ev.config.species.split(',').map(s => s.trim().toLowerCase());
      eventSpecies.forEach(spId => {
        if (!pool.includes(spId)) {
          // Check if species exists in other cycles for this map
          for (const c in loc.wild) {
            const idx = loc.wild[c].indexOf(spId);
            if (idx !== -1) {
              pool.push(spId);
              const originalRates = loc.rates?.[c] || [];
              rates.push(originalRates[idx] || 10);
              break;
            }
          }
        }
      });
    }
  });
  
  return { pool, rates };
}

/**
 * Selects a random Pokémon ID from a pool using weights.
 */
export function selectFromPool(pool, rates) {
  if (!pool.length) return null;
  const totalRate = rates.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalRate;
  let cumulative = 0;
  
  for (let i = 0; i < pool.length; i++) {
    cumulative += rates[i] || 0;
    if (rand <= cumulative) return pool[i];
  }
  return pool[0];
}

/**
 * Main logic to generate a wild encounter.
 * Handles repellent, incense, fishing, and specialty spawns.
 */
export async function generateEncounter(locId, state, options = {}) {
  const loc = pokemonDataProvider.getMaps().find(l => l.id === locId);
  if (!loc) return null;

  const cycle = getDayCycle();
  const activeEvents = options.activeEvents || (typeof window !== 'undefined' ? window._activeEvents : []) || [];
  const maps = pokemonDataProvider.getMaps();
  const allMapIds = maps.map(m => m.id);
  
  // 1. Especial: Fase de Dominancia (Finde) - Batallas de Defensores
  if (!isDisputePhase()) {
    // Chance de encontrar defensor (20% normal)
    if (Math.random() < 0.20 && state.faction) {
      // Determinamos si el mapa está dominado por el enemigo
      // Nota: Esto requiere que el store MAP pase la información de ganadores
      const winner = (options.dominanceData || {})[locId];
      if (winner && winner !== state.faction) {
        return { type: 'defender', faction: winner };
      }
    }
  }

  // 2. Especial: Guardianes (Pokémon Alfa)
  const guardian = getGuardianData(locId, allMapIds);
  if (guardian) {
    // Verificar si ya fue capturado hoy
    const capturedToday = (state.dailyGuardianCaptures || []).includes(locId);
    if (!capturedToday && Math.random() < GUARDIAN_CHANCE) {
      return { 
        type: 'guardian', 
        pokemon: makePokemon(guardian.id, guardian.lv),
        pts: guardian.pts
      };
    }
  }

  // 3. Repellent Logic
  const repellentActive = (state.repelSecs || 0) > 0;
  const firstPokemon = state.team?.[0];
  
  if (repellentActive) {
    if (Math.random() < GAME_RATIOS.encounters.trainerRepel) {
      return { type: 'trainer' };
    }
    
    const { pool, rates } = getEncounterPool(loc, cycle, activeEvents);
    // Find a pokemon with level >= firstPokemon.level
    for (let attempt = 0; attempt < 10; attempt++) {
      const selectedId = selectFromPool(pool, rates);
      const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
      if (!firstPokemon || level >= firstPokemon.level) {
        return { type: 'wild', pokemon: makePokemon(selectedId, level) };
      }
    }
    return { type: 'trainer' }; // Fallback to trainer
  }

  // 2. Base Trainer Chance
  const trainerBonus = options.eventTrainerBonus || 1;
  const tChance = Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus;
  if (Math.random() * 100 < tChance) {
    return { type: 'trainer' };
  }

  // 3. Fishing Chance (if applicable)
  const fishingBonus = options.eventFishingBonus || 1;
  if (loc.fishing && Math.random() < GAME_RATIOS.encounters.fishing * fishingBonus) {
    const { pool, rates } = loc.fishing;
    const selectedId = selectFromPool(pool, rates);
    const level = Math.floor(Math.random() * (loc.fishing.lv[1] - loc.fishing.lv[0] + 1)) + loc.fishing.lv[0];
    const totalRate = rates.reduce((a, b) => a + b, 0);
    const rarity = (rates[pool.indexOf(selectedId)] / totalRate) * 100;
    
    return { 
      type: 'fishing', 
      pokemon: makePokemon(selectedId, level),
      rarity 
    };
  }

  // 4. Wild Pokemon Pool Selection (Normal)
  let { pool, rates } = getEncounterPool(loc, cycle, activeEvents);

  // 5. Incense Effect
  if (state.incenseSecs > 0 && state.incenseType) {
    const typeIndices = pool.map((id, idx) => {
      const pData = pokemonDataProvider.getPokemonData(id);
      return (pData && pData.type === state.incenseType) ? idx : -1;
    }).filter(idx => idx !== -1);

    if (typeIndices.length > 0) {
      pool = typeIndices.map(idx => pool[idx]);
      rates = typeIndices.map(idx => rates[idx]);
    }
  }

  // 6. Final Select
  const selectedId = selectFromPool(pool, rates);
  const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
  
  return { type: 'wild', pokemon: makePokemon(selectedId, level) };
}
