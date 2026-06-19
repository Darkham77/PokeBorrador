import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { getDayCycle } from '@/logic/utils/timeUtils';
import { applyEncounterBonuses } from '@/logic/war/bonusEngine';
import { redistributeWeatherSpawns, applyFishingRodBudget } from '@/logic/utils/routeSpawnHelpers';
import { useEventStore } from '@/stores/events';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters';
import type { Event as GameEvent } from '@/logic/events/eventEngine';
import {
  getEncounterPool,
  selectFromPool,
  checkSpecialEncounters,
  handleRepellentEncounter,
  generateArchaeologyEncounter,
  calculateEncounterTypeWeights,
  clampLegendaryRates,
  getFinalGroundRates,
  applyAtmosphericStatus
} from './encounterHelpers.ts';


export { getEncounterPool, selectFromPool, clampLegendaryRates, getFinalGroundRates };

/**
 * Handles special fishing encounter tables and weather visitors.
 */
function generateFishingEncounter(
  loc: MapLocation,
  weather: string,
  state: EncounterState,
  options: EncounterOptions
): Encounter | null {
  if (!loc.fishing) return null;
  const pool = [...loc.fishing.pool];
  const rates = [...loc.fishing.rates];

  while (rates.length < pool.length) rates.push(10);

  const fishingType = state.fishingRodType || 'standard';
  applyFishingRodBudget(rates, pool, fishingType);

  const wConfig = loc.weather?.[weather];
  if (weather && weather !== 'clear' && wConfig) {
    if (wConfig.fishingExclusive) {
      const exclusives = Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive);
      exclusives.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id);
          const weight = Array.isArray(wConfig.fishingExclusive) ? 5 : ((wConfig.fishingExclusive as Record<string, number>)[id] || 5);
          rates.push(weight || 5);
        }
      });
    }
    if (wConfig.fishingVisitors) {
      const visitors = Array.isArray(wConfig.fishingVisitors) ? wConfig.fishingVisitors : Object.keys(wConfig.fishingVisitors);
      visitors.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id);
          const weight = Array.isArray(wConfig.fishingVisitors) ? -10 : -((wConfig.fishingVisitors as Record<string, number>)[id] || 10);
          rates.push(weight || -10);
        }
      });
    }
  }

  if (weather && weather !== 'clear') {
    const exclusives = wConfig?.fishingExclusive ? (Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive)) : [];
    redistributeWeatherSpawns(rates, pool, weather, exclusives);
  }

  clampLegendaryRates(pool, rates);
  const selectedId = selectFromPool(pool, rates);
  const minLv = loc.fishing.lv[0] || 10;
  const maxLv = loc.fishing.lv[1] || 20;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  const totalRate = rates.reduce((a, b) => a + b, 0);
  const rateIdx = pool.indexOf(selectedId);
  const rateVal = rates[rateIdx];
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * 100;

  const shinyMult = (options.shinyMultiplier || 1) * (fishingType === 'super' ? 1.5 : 1.0);
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: shinyMult }) as Pokemon;
  if (pokemon) {
    applyAtmosphericStatus(pokemon, loc, weather, selectedId);
  }
  
  return { 
    type: 'fishing', 
    pokemon,
    rarity 
  };
}

/**
 * General walking wild encounter tables, weather visitor quota, incense, and region boosts.
 */
function generateGroundEncounter(
  loc: MapLocation,
  cycle: string,
  weather: string,
  state: EncounterState,
  options: EncounterOptions,
  activeEvents: GameEvent[],
  locId: string
): Encounter | null {
  let { pool, rates } = getFinalGroundRates(loc, cycle, weather, activeEvents);

  if (state.incenseSecs && state.incenseSecs > 0 && state.incenseType) {
    const typeIndices = pool.map((id, idx) => {
      const pData = pokemonDataProvider.getPokemonData(id);
      return (pData && (pData.type === state.incenseType || pData.type2 === state.incenseType)) ? idx : -1;
    }).filter(idx => idx !== -1);

    if (typeIndices.length > 0) {
      pool = typeIndices.map(idx => pool[idx]).filter((id): id is string => id !== undefined);
      rates = typeIndices.map(idx => rates[idx]).filter((r): r is number => r !== undefined);
    }
  }

  clampLegendaryRates(pool, rates);
  const selectedId = selectFromPool(pool, rates);
  const minLv = loc.lv[0] || 2;
  const maxLv = loc.lv[1] || 5;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon;
  if (!pokemon) return null;

  applyAtmosphericStatus(pokemon, loc, weather, selectedId);

  return { 
    type: 'wild', 
    pokemon: applyEncounterBonuses(pokemon, locId, state.faction, options.dominanceData) 
  };
}

/**
 * Main logic to generate a wild encounter.
 * Decomposes complex logic flows into single-responsibility utilities.
 */
export async function generateEncounter(locId: string, state: EncounterState, options: EncounterOptions = {}): Promise<Encounter | null> {
  const maps = pokemonDataProvider.getMaps() as unknown as MapLocation[];
  const loc = maps.find(l => l.id === locId);
  if (!loc) return null;

  const cycle = options.cycle || getDayCycle();
  const eventStore = useEventStore() as { activeEvents: GameEvent[] };
  const activeEvents = options.activeEvents || (eventStore.activeEvents || []) || [];
  const allMapIds = maps.map(m => m.id);

  // 1. Check special overrides (debug, rival, defender, guardian)
  const specialEncounter = checkSpecialEncounters(locId, state, options, allMapIds);
  if (specialEncounter) return specialEncounter;

  // 2. Repellent logic
  if ((state.repelSecs || 0) > 0 && !options.forceEncounter) {
    return handleRepellentEncounter(loc, cycle, state, options, activeEvents);
  }

  // 3. Base Trainer Chance
  const trainerBonus = options.eventTrainerBonus || 1;
  const criminality = state.classData?.criminality || 0;
  const isRocketMaxCrim = state.playerClass === 'rocket' && criminality >= 100;
  
  const tChance = isRocketMaxCrim
    ? (criminality / 10) * trainerBonus
    : Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus;

  if (!options.forceEncounter && Math.random() * 100 < tChance) {
    return { type: 'trainer' };
  }

  // 4. Weighted Encounter Roll (Walking vs Fishing vs Archaeology)
  const weather = options.weather || 'clear';
  const { fishingWeight, archWeight, totalWeight } = calculateEncounterTypeWeights(loc, weather, state, options);
  const roll = Math.random() * totalWeight;

  if (loc.fishing && roll < fishingWeight) {
    return generateFishingEncounter(loc, weather, state, options);
  } else if (loc.archaeology && roll < fishingWeight + archWeight) {
    return generateArchaeologyEncounter(loc, options);
  }

  // 5. Wild Pokemon Pool Selection (Normal)
  return generateGroundEncounter(loc, cycle, weather, state, options, activeEvents, locId);
}
