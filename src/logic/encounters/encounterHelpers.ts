const ENCOUNTER_INITIAL_CUMULATIVE_RATE = 0;
const FIRST_POOL_INDEX = 0;

import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { Event as GameEvent } from '@/logic/events/eventEngine';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { MapRouteId } from '@/data/world/map-assets';
import {
  checkDebugForcedEncounter,
  checkRivalSpecialEncounter,
  checkDefenderSpecialEncounter,
  checkGuardianSpecialEncounter,
  type ViteDebugEncounterConfig
} from './specialEncounterCheckers.ts';
import {
  DEBUG_TRAINER_CHANCE_PERCENT,
  PERCENTAGE_MULTIPLIER_FACTOR,
  REPELLENT_MAX_ATTEMPTS,
  DEFAULT_WILD_MIN_LEVEL,
  DEFAULT_WILD_MAX_LEVEL,
  DEFAULT_ARCHAEOLOGY_MIN_LEVEL,
  DEFAULT_ARCHAEOLOGY_MAX_LEVEL,
  RAINY_WEATHER_FISHING_MULTIPLIER,
  GROUND_ENCOUNTER_BASE_WEIGHT,
  FISHING_WEIGHT_SCALE,
  EQUIPPED_TOOL_ENCOUNTER_BONUS_WEIGHT,
  CAVE_ARCHAEOLOGY_WEIGHT,
  MOUNTAIN_ARCHAEOLOGY_WEIGHT,
  VISITOR_WEIGHT_REPLACEMENT_VALUE,
  DEFAULT_WEATHER_MULTIPLIER_NORMAL,
} from '@/logic/constants/encounters';

import {
  getSpeciesEntries,
  getEncounterPool,
  clampLegendaryRates,
  getFinalGroundRates,
  applyAtmosphericStatus,
  getMapSpawnPoolData
} from './routeSpawnMath.ts';

export {
  getSpeciesEntries,
  getEncounterPool,
  clampLegendaryRates,
  getFinalGroundRates,
  applyAtmosphericStatus,
  getMapSpawnPoolData
};

/**
 * Selects a random Pokémon ID from a pool using weights.
 */
export function selectFromPool<T extends string>(pool: readonly T[], rates: number[]): T {
  if (!pool.length) throw new Error('[encounterHelpers] Cannot select from an empty encounter pool');
  const totalRate = rates.reduce((a, b) => a + b, ENCOUNTER_INITIAL_CUMULATIVE_RATE);
  const rand = Math.random() * totalRate;
  let cumulative = ENCOUNTER_INITIAL_CUMULATIVE_RATE;
  
  for (let i = FIRST_POOL_INDEX; i < pool.length; i++) {
    cumulative += rates[i] || ENCOUNTER_INITIAL_CUMULATIVE_RATE;
    const selected = pool[i];
    if (selected && rand <= cumulative) return selected;
  }
  const first = pool[FIRST_POOL_INDEX];
  if (!first) throw new Error('[encounterHelpers] Encounter pool became empty during selection');
  return first;
}

/**
 * Checks for special, non-wild override encounters (debug overrides, rival, defender battles, guardians).
 */
export function checkSpecialEncounters(
  locId: MapRouteId,
  state: EncounterState,
  options: EncounterOptions,
  allMapIds: MapRouteId[]
): Encounter | null {
  const win = (typeof window !== 'undefined' ? window : null) as (Window & {
    __VITE_DEBUG__?: ViteDebugEncounterConfig;
  }) | null;
  const debug = win?.__VITE_DEBUG__;

  const forced = checkDebugForcedEncounter(debug);
  if (forced) return forced;

  const hasTrainerOverride = debug?.trainerChancePct !== undefined && debug?.trainerChancePct !== null;
  const trainerOverrideChance = hasTrainerOverride
    ? (debug!.trainerChancePct! / 100)
    : (debug?.trainerChance50 ? (DEBUG_TRAINER_CHANCE_PERCENT / 100) : null);
  if (!options.forceEncounter && trainerOverrideChance !== null) {
    if (Math.random() < trainerOverrideChance) {
      return { type: 'trainer' };
    }
  }

  const rival = checkRivalSpecialEncounter(debug, state, options);
  if (rival) return rival;

  const defender = checkDefenderSpecialEncounter(debug, locId, state, options);
  if (defender) return defender;

  const guardian = checkGuardianSpecialEncounter(debug, locId, state, options, allMapIds);
  if (guardian) return guardian;

  return null;
}

/**
 * Handles repel filters and normalizes repellent encounter rules.
 */
export function handleRepellentEncounter(
  loc: MapLocation,
  cycle: DayPhase,
  state: EncounterState,
  options: EncounterOptions,
  activeEvents: GameEvent[]
): Encounter | null {
  if (Math.random() < GAME_RATIOS.encounters.trainerRepel) {
    return { type: 'trainer' };
  }
  
  const weather = options.weather || 'clear';
  const { pool, rates: rawRates } = getEncounterPool(loc, cycle, weather, activeEvents);
  const rates = rawRates.map(r => r === -1 ? VISITOR_WEIGHT_REPLACEMENT_VALUE : r); 
  clampLegendaryRates(pool, rates); 

  const firstPokemon = state.team?.[0];

  for (let attempt = 0; attempt < REPELLENT_MAX_ATTEMPTS; attempt++) {
    const selectedId = selectFromPool(pool, rates);
    const minLv = loc.lv[0] || DEFAULT_WILD_MIN_LEVEL;
    const maxLv = loc.lv[1] || DEFAULT_WILD_MAX_LEVEL;
    const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;

    if (!firstPokemon || level >= firstPokemon.level) {
      return { 
        type: 'wild', 
        pokemon: makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon 
      };
    }
  }
  return { type: 'trainer' };
}

/**
 * Handles archaeology node drops and details.
 */
export function generateArchaeologyEncounter(
  loc: MapLocation,
  options: EncounterOptions
): Encounter | null {
  if (!loc.archaeology) return null;
  const archPool = loc.archaeology.pool;
  const archRates = loc.archaeology.rates;
  const selectedId = selectFromPool(archPool, archRates);
  const minLv = loc.archaeology.lv[0] || DEFAULT_ARCHAEOLOGY_MIN_LEVEL;
  const maxLv = loc.archaeology.lv[1] || DEFAULT_ARCHAEOLOGY_MAX_LEVEL;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  const totalRate = archRates.reduce((a: number, b: number) => a + b, 0);
  const rateIdx = archPool.indexOf(selectedId);
  const rateVal = archRates[rateIdx];
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * PERCENTAGE_MULTIPLIER_FACTOR;
  
  return {
    type: 'archaeology',
    pokemon: makePokemon(selectedId, level, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
    rarity
  };
}

/**
 * Calculates weights for ground, fishing, and archaeology encounter methods.
 */
const RAINY_WEATHERS: readonly WeatherId[] = ['rain', 'heavy_rain', 'storm', 'thunderstorm'];

import {
  getEffectiveLeaderAbility,
  getEncounterRateMultiplier,
  getFishingWeightMultiplier
} from '@/logic/pokemon/pokemonFieldAbilities';

export function calculateEncounterTypeWeights(
  loc: MapLocation,
  weather: WeatherId,
  state: EncounterState,
  options: EncounterOptions
): { groundWeight: number; fishingWeight: number; archWeight: number; totalWeight: number } {
  const win = (typeof window !== 'undefined' ? window : null) as (Window & {
    __VITE_DEBUG__?: {
      fishingChancePct?: number | null;
      archaeologyChancePct?: number | null;
    };
  }) | null;
  const debug = win?.__VITE_DEBUG__;

  const leaderAbility = getEffectiveLeaderAbility(state.team);
  const encounterRateMult = getEncounterRateMultiplier(leaderAbility, weather);
  const abilityFishingMult = getFishingWeightMultiplier(leaderAbility);

  const isRainy = RAINY_WEATHERS.includes(weather);
  const climateFishingMultiplier = isRainy ? RAINY_WEATHER_FISHING_MULTIPLIER : DEFAULT_WEATHER_MULTIPLIER_NORMAL;
  const fishingBonus = (options.eventFishingBonus || 1) * climateFishingMultiplier * abilityFishingMult;

  const groundWeight = GROUND_ENCOUNTER_BASE_WEIGHT * encounterRateMult;

  let fishingWeight = 0;
  if (loc.fishing) {
    const hasFishingOverride = debug?.fishingChancePct !== undefined && debug?.fishingChancePct !== null;
    const baseFishing = hasFishingOverride ? (debug!.fishingChancePct! / 100) : GAME_RATIOS.encounters.fishing;
    fishingWeight = baseFishing * FISHING_WEIGHT_SCALE * fishingBonus;
    if ((state.fishingRodSecs || 0) > 0) {
      fishingWeight += EQUIPPED_TOOL_ENCOUNTER_BONUS_WEIGHT;
    }
  }

  let archWeight = 0;
  if (loc.archaeology) {
    const isCave = !!loc.isCave;
    const isMountain = !!loc.isMountain;
    const hasArchOverride = debug?.archaeologyChancePct !== undefined && debug?.archaeologyChancePct !== null;
    if (hasArchOverride) {
      archWeight = (debug!.archaeologyChancePct! / 100) * FISHING_WEIGHT_SCALE;
    } else {
      archWeight = isCave ? CAVE_ARCHAEOLOGY_WEIGHT : (isMountain ? MOUNTAIN_ARCHAEOLOGY_WEIGHT : 0);
    }
    if ((state.pickaxeSecs || 0) > 0 || (state.brushSecs || 0) > 0) {
      archWeight += EQUIPPED_TOOL_ENCOUNTER_BONUS_WEIGHT;
    }
  }

  return {
    groundWeight,
    fishingWeight,
    archWeight,
    totalWeight: groundWeight + fishingWeight + archWeight
  };
}


