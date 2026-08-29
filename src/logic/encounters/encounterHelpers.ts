const ENCOUNTER_INITIAL_CUMULATIVE_RATE = 0;
const FIRST_POOL_INDEX = 0;

import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { getActivePinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData } from '@/logic/war/guardianEngine';
import { GUARDIAN_ENCOUNTER_CHANCE_PERCENT } from '@/logic/constants/gameplay';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { Event as GameEvent } from '@/logic/events/eventEngine';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import { requireGymId, type GymId } from '@/data/world/gyms';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import {
  DEBUG_TRAINER_CHANCE_PERCENT,
  DEBUG_GUARDIAN_CHANCE_PERCENT,
  PERCENTAGE_MULTIPLIER_FACTOR,
  ENTRENATOR_DOUBLE_RIVAL_CLASS_LEVEL,
  ENTRENADOR_RIVAL_CHANCE_MULTIPLIER,
  DEFENDER_ENCOUNTER_CHANCE,
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
  DEBUG_MOCK_MAGIKARP_STATS,
  DEBUG_MOCK_KABUTO_STATS,
  DEBUG_MOCK_PIDGEY_STATS
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
  // 0. Debug: configurable encounter overrides
  const win = (typeof window !== 'undefined' ? window : null) as (Window & {
    __VITE_DEBUG__?: {
      forceEncounterType?: string;
      forceRival?: boolean;
      trainerChance50?: boolean;
      forceGuardian80?: boolean;
      trainerChancePct?: number | null;
      rivalChancePct?: number | null;
      guardianChancePct?: number | null;
      defenderChancePct?: number | null;
    };
  }) | null;
  const debug = win?.__VITE_DEBUG__;
  
  const DEBUG_MOCK_MAGIKARP_UID = 'magikarp-fishing-debug';

  if (debug?.forceEncounterType && debug.forceEncounterType !== 'none') {
    if (debug.forceEncounterType === 'fishing') {
      const p = makePokemon('magikarp', DEBUG_MOCK_MAGIKARP_STATS.LEVEL, { bypassWhitelist: true }) as Pokemon;
      p.uid = DEBUG_MOCK_MAGIKARP_UID;
      return { type: 'fishing', pokemon: p };
    }
    if (debug.forceEncounterType === 'archaeology') {
      const p = makePokemon('kabuto', DEBUG_MOCK_KABUTO_STATS.LEVEL, { bypassWhitelist: true }) as Pokemon;
      p.uid = 'kabuto-archaeology-1234'; // no-magic
      return { type: 'archaeology', pokemon: p };
    }
    if (debug.forceEncounterType === 'trainer') {
      return { type: 'trainer' };
    }
    if (debug.forceEncounterType === 'rival') {
      return { type: 'rival' };
    }
    if (debug.forceEncounterType === 'wild') {
      const p = makePokemon('pidgey', DEBUG_MOCK_PIDGEY_STATS.LEVEL, { bypassWhitelist: true }) as Pokemon;
      p.uid = 'pidgey-wild-1234'; // no-magic
      return { type: 'wild', pokemon: p };
    }
  }

  if (debug?.forceRival || debug?.rivalChancePct === 100) {
    return { type: 'rival' };
  }

  const hasTrainerOverride = debug?.trainerChancePct !== undefined && debug?.trainerChancePct !== null;
  const trainerOverrideChance = hasTrainerOverride ? (debug!.trainerChancePct! / 100) : (debug?.trainerChance50 ? (DEBUG_TRAINER_CHANCE_PERCENT / 100) : null);
  if (!options.forceEncounter && trainerOverrideChance !== null) {
    if (Math.random() < trainerOverrideChance) {
      return { type: 'trainer' };
    }
  }

  const hasGuardianOverride = debug?.guardianChancePct !== undefined && debug?.guardianChancePct !== null;
  const guardianOverrideChance = hasGuardianOverride ? (debug!.guardianChancePct! / 100) : (debug?.forceGuardian80 ? (DEBUG_GUARDIAN_CHANCE_PERCENT / 100) : null);
  if (!options.forceEncounter && guardianOverrideChance !== null) {
    const dailyCaptures = state.dailyGuardianCaptures || (getActivePinia() ? useGameStore().dailyGuardianCaptures : []);
    const capturedToday = (dailyCaptures || []).includes(locId);
    if (!capturedToday && Math.random() < guardianOverrideChance) {
      const guardian = getGuardianData(locId, allMapIds);
      if (guardian) {
        return { 
          type: 'guardian', 
          pokemon: makePokemon(guardian.id, guardian.lv, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
          pts: guardian.pts
        };
      }
    }
  }

  // 0. Especial: Rival Azul
  if (!options.forceEncounter) {
    let rivalChance = GAME_RATIOS.encounters.rival;
    const hasRivalRateOverride = debug?.rivalChancePct !== undefined && debug?.rivalChancePct !== null;
    if (hasRivalRateOverride) {
      rivalChance = debug!.rivalChancePct! / 100;
    } else {
      const eventRivalBonus = options.eventRivalBonus || 1;
      rivalChance *= eventRivalBonus;

      if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= ENTRENATOR_DOUBLE_RIVAL_CLASS_LEVEL) {
        const gymIds = (['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'] as const satisfies readonly GymId[]).map(requireGymId);
        const allGymsHard = gymIds.every(id => state.gymProgress?.[id]?.hard === true);
        if (allGymsHard) {
          rivalChance *= ENTRENADOR_RIVAL_CHANCE_MULTIPLIER;
        }
      }
    }

    if (Math.random() < rivalChance) {
      return { type: 'rival' };
    }
  }
  
  // 1. Especial: Fase de Dominancia (Finde) - Batallas de Defensores
  if (!isDisputePhase() && !options.forceEncounter) {
    const hasDefenderOverride = debug?.defenderChancePct !== undefined && debug?.defenderChancePct !== null;
    const defenderChance = hasDefenderOverride ? (debug!.defenderChancePct! / 100) : DEFENDER_ENCOUNTER_CHANCE;
    if (Math.random() < defenderChance && state.faction) {
      const dominance = (options.dominanceData || {})[requireMapRouteId(locId)];
      const winner = dominance?.winner || null;
      if (winner && winner !== state.faction) {
        return { type: 'defender', faction: winner };
      }
    }
  }

  // 2. Especial: Guardianes (Pokémon Alfa)
  const guardian = getGuardianData(locId, allMapIds);
  if (guardian && !options.forceEncounter) {
    const dailyCaptures = state.dailyGuardianCaptures || (getActivePinia() ? useGameStore().dailyGuardianCaptures : []);
    const capturedToday = (dailyCaptures || []).includes(locId);
    if (!capturedToday && Math.random() < GUARDIAN_ENCOUNTER_CHANCE_PERCENT) {
      return { 
        type: 'guardian', 
        pokemon: makePokemon(guardian.id, guardian.lv, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
        pts: guardian.pts
      };
    }
  }

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


