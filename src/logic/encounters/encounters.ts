import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { getDayCycle, requireDayPhase } from '@/logic/utils/timeUtils';
import { applyEncounterBonuses } from '@/logic/war/bonusEngine';
import { CRIMINALITY_DENOMINATOR_FACTOR } from '@/logic/constants/gameplay';
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
  getSpeciesEntries,
  applyAtmosphericStatus
} from './encounterHelpers.ts';

import { generateFishingEncounter } from './fishingEncounterHelper.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { ItemId } from '@/data/inventory/items'
import type { PokemonType } from '@/data/battle/types'

export { getEncounterPool, selectFromPool, clampLegendaryRates, getFinalGroundRates, getSpeciesEntries }

/**
 * General walking wild encounter tables, weather visitor quota, incense, and region boosts.
 */
import { resolveFieldEncounterModifiers } from '@/logic/rules/fieldRulesCoordinator';

function generateGroundEncounter(
  loc: MapLocation,
  cycle: ReturnType<typeof requireDayPhase>,
  weather: WeatherId,
  state: EncounterState,
  options: EncounterOptions,
  activeEvents: GameEvent[],
  locId: string
): Encounter | null {
  let { pool, rates } = getFinalGroundRates(loc, cycle, weather, activeEvents);

  const modifiers = resolveFieldEncounterModifiers({
    team: state.team,
    mapId: locId,
    loc,
    weather,
    dayPhase: cycle,
    repelSecs: state.repelSecs,
    incenseSecs: state.incenseSecs,
    incenseType: state.incenseType,
    playerClass: state.playerClass,
    classData: state.classData,
    faction: state.faction,
    dominanceData: options.dominanceData,
    activeEvents,
    options
  });

  const INCENSE_TO_TYPE: Partial<Record<ItemId, PokemonType>> = {
    incensefire: 'fire',
    incensewater: 'water',
    incensegrass: 'grass',
    incensenormal: 'normal',
    incenseghost: 'ghost',
    incensepsychic: 'psychic',
  };

  const targetType = modifiers.attractionType || (state.incenseSecs && state.incenseSecs > 0 && state.incenseType ? INCENSE_TO_TYPE[state.incenseType] : null);
  if (targetType) {
    const typeIndices = pool.map((id, idx) => {
      const pData = pokemonDataProvider.getPokemonData(id);
      return (pData && (pData.type === targetType || pData.type2 === targetType)) ? idx : -1;
    }).filter(idx => idx !== -1);

    if (typeIndices.length > 0) {
      pool = typeIndices.map(idx => pool[idx]).filter((id): id is PokemonSpeciesId => id !== undefined);
      rates = typeIndices.map(idx => rates[idx]).filter((r): r is number => r !== undefined);
    }
  }

  clampLegendaryRates(pool, rates);
  const selectedId = selectFromPool(pool, rates);
  const minLv = loc.lv[0] || 2;
  const maxLv = loc.lv[1] || 5;
  let level = modifiers.forceMaxLevel ? maxLv : Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  if (modifiers.shouldAvoidLowLevel(level)) {
    level = Math.max(level, maxLv);
  }
  
  const pokemon = makePokemon(selectedId, level, {
    nature: modifiers.natureOverride ?? undefined,
    gender: modifiers.genderOverride ?? undefined,
    heldItemRates: modifiers.heldItemRates,
    shinyMultiplier: modifiers.shinyMultiplier,
    ivFloor: modifiers.ivFloor,
    mapId: locId
  }) as Pokemon;
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
  const routeId = requireMapRouteId(locId);
  const maps = pokemonDataProvider.getMaps();
  const loc = maps.find(l => l.id === routeId);
  if (!loc) return null;

  const cycle = requireDayPhase(options.cycle || getDayCycle());
  const eventStore = useEventStore() as { activeEvents: GameEvent[] };
  const activeEvents = options.activeEvents || (eventStore.activeEvents || []) || [];
  const allMapIds = maps.map(m => m.id);

  // 1. Check special overrides (debug, rival, defender, guardian)
  const specialEncounter = checkSpecialEncounters(routeId, state, options, allMapIds);
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
    ? (criminality / CRIMINALITY_DENOMINATOR_FACTOR) * trainerBonus
    : Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus;

  if (!options.forceEncounter && Math.random() * 100 < tChance) {
    return { type: 'trainer' };
  }

  // 4. Weighted Encounter Roll (Walking vs Fishing vs Archaeology)
  const weather = requireWeatherId(options.weather || 'clear');
  const { fishingWeight, archWeight, totalWeight } = calculateEncounterTypeWeights(loc, weather, state, options);
  const roll = Math.random() * totalWeight;

  if (loc.fishing && roll < fishingWeight) {
    return generateFishingEncounter(loc, weather, state, options);
  } else if (loc.archaeology && roll < fishingWeight + archWeight) {
    return generateArchaeologyEncounter(loc, options);
  }

  // 5. Wild Pokemon Pool Selection (Normal)
  return generateGroundEncounter(loc, cycle, weather, state, options, activeEvents, routeId);
}
