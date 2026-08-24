const ENCOUNTER_INITIAL_CUMULATIVE_RATE = 0;
const FIRST_POOL_INDEX = 0;

import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { getActivePinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData } from '@/logic/war/guardianEngine';
import { GUARDIAN_ENCOUNTER_CHANCE_PERCENT } from '@/logic/constants/gameplay';
import { getWeatherFamily } from '@/data/system/weatherFamilies.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters';
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine';
import { isLegendaryPokemonSpeciesId, requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { redistributeWeatherSpawns } from '@/logic/utils/routeSpawnHelpers';
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils';
import { DAY_PHASES, type DayPhase } from '@/logic/utils/timeUtils';
import { requireGymId, type GymId } from '@/data/world/gyms';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry';
import {
  DEFAULT_FISHING_RATE_WEIGHT,
  DEFAULT_EXCLUSIVE_SPAWN_WEIGHT,
  DEFAULT_VISITOR_SPAWN_WEIGHT,
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
  LEGENDARY_RATE_CAP_DENOMINATOR,
  VISITOR_WEIGHT_REPLACEMENT_VALUE,
  DEFAULT_SPAWN_RATE_WEIGHT,
  DEFAULT_WEATHER_MULTIPLIER_NORMAL,
  DEBUG_MOCK_MAGIKARP_STATS,
  DEBUG_MOCK_KABUTO_STATS,
  DEBUG_MOCK_PIDGEY_STATS
} from '@/logic/constants/encounters';

type WeightedSpeciesSource = PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>>;

export function getSpeciesEntries(source: WeightedSpeciesSource): Array<{ id: PokemonSpeciesId; weight?: number }> {
  if (Array.isArray(source)) return source.map(id => ({ id }));
  return Object.entries(source).map(([rawId, weight]) => ({
    id: requirePokemonSpeciesId(rawId),
    weight,
  }));
}

function requireWeatherFamilyId(weather: WeatherId): WeatherId {
  const family = getWeatherFamily(weather);
  if (!family) throw new Error(`[encounterHelpers] Weather '${weather}' has no registered family`);
  return requireWeatherId(family);
}

/**
 * Gets the valid pool of Pokémon for a location and time cycle.
 * Incorporates active events.
 */
export function getEncounterPool(loc: MapLocation, cycle: DayPhase, weather: WeatherId = 'clear', activeEvents: GameEvent[]) {
  if (!loc || !loc.wild) return { pool: Array<PokemonSpeciesId>(), rates: Array<number>() };
  
  const pool = [...(loc.wild[cycle] || loc.wild.day || [])];
  const rates = [...((loc.rates && (loc.rates[cycle] || loc.rates.day)) ? (loc.rates[cycle] || loc.rates.day) : []) as number[]];
  
  // Ensure rates match pool length before transformations
  while (rates.length < pool.length) rates.push(DEFAULT_FISHING_RATE_WEIGHT);
 
  // 1. Inyección por Clima (Visitantes y Exclusivos)
  let wConfig = loc.weather?.[weather];
  
  // Fallback to weather family if exact weather configuration does not exist
  if (!wConfig && weather !== 'clear') {
    const family = requireWeatherFamilyId(weather);
    if (loc.weather?.[family]) {
      wConfig = loc.weather[family];
    }
  }

  if (weather !== 'clear' && wConfig) {
    // Especies Exclusivas (Pesos dinámicos o base 5)
    if (wConfig.exclusive) {
      const exclusives = getSpeciesEntries(wConfig.exclusive);
      exclusives.forEach(({ id, weight }) => {
        // Castform no debe aparecer en forma soleado si es de noche
        if (id === 'castform' && cycle === 'night' && getWeatherFamily(weather) === 'sun') {
          return;
        }
        if (!pool.includes(id)) {
          pool.push(id);
          rates.push(weight ?? DEFAULT_EXCLUSIVE_SPAWN_WEIGHT); 
        }
      });
    }

    // Visitantes (Marcados con peso negativo para normalización proporcional)
    if (wConfig.visitors) {
      const visitors = getSpeciesEntries(wConfig.visitors);
      visitors.forEach(({ id, weight }) => {
        // Castform no debe aparecer en forma soleado si es de noche
        if (id === 'castform' && cycle === 'night' && getWeatherFamily(weather) === 'sun') {
          return;
        }
        if (!pool.includes(id)) {
          pool.push(id);
          rates.push(weight !== undefined ? -weight : -DEFAULT_VISITOR_SPAWN_WEIGHT); 
        }
      });
    }
  }


  // 2. Apply Event Injections
  activeEvents.forEach(ev => {
    const cfg = (typeof ev.config === 'string' ? JSON.parse(ev.config) : ev.config) as EventConfig | undefined;
    if (ev.active && cfg?.ignoreTimeRestrictions && cfg.species) {
      const eventSpecies = cfg.species.split(',').map((s: string) => requirePokemonSpeciesId(s.trim().toLowerCase()));
      eventSpecies.forEach((spId: PokemonSpeciesId) => {
        if (!pool.includes(spId)) {
          // Check if species exists in other cycles for this map
          const wild = loc.wild || {};
          for (const c of DAY_PHASES) {
            const cyclePool = wild[c];
            if (!cyclePool) continue;
            const idx = cyclePool.indexOf(spId);
            if (idx !== -1) {
              pool.push(spId);
              const originalRates = loc.rates?.[c] || [];
              rates.push(originalRates[idx] || DEFAULT_VISITOR_SPAWN_WEIGHT);
              break;
            }
          }
        }
      });
    }
  });
  
  clampLegendaryRates(pool, rates);
  return { pool, rates };
}

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

  const isRainy = RAINY_WEATHERS.includes(weather);
  const climateFishingMultiplier = isRainy ? RAINY_WEATHER_FISHING_MULTIPLIER : DEFAULT_WEATHER_MULTIPLIER_NORMAL;
  const fishingBonus = (options.eventFishingBonus || 1) * climateFishingMultiplier;

  const groundWeight = GROUND_ENCOUNTER_BASE_WEIGHT;

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

/**
 * Caps the weight/rate of legendary species so that their final probability does not exceed 1%.
 * Balances the other rates proportionally.
 */
export function clampLegendaryRates(pool: PokemonSpeciesId[], rates: number[]): void {
  const legendaryIndices: number[] = [];
  let sumOtherRates = 0;

  for (let i = 0; i < pool.length; i++) {
    const spId = pool[i];
    if (spId && isLegendaryPokemonSpeciesId(spId)) {
      legendaryIndices.push(i);
    } else {
      sumOtherRates += rates[i] || 0;
    }
  }

  if (legendaryIndices.length === 0) return;

  // If there are only legendaries in the pool (e.g. Cerulean Cave inner circle with ticket),
  // they can have higher rates, but if other species exist, we cap each to 1% final prob.
  if (sumOtherRates === 0) return;

  // To guarantee final probability <= 1% for each legendary:
  // rate(L) / (sumOtherRates + sum_legendary_rates) <= 0.01
  // We can solve for a capped rate for each legendary.
  // Set cap = sumOtherRates / LEGENDARY_RATE_CAP_DENOMINATOR.
  const cap = sumOtherRates / LEGENDARY_RATE_CAP_DENOMINATOR;

  legendaryIndices.forEach(idx => {
    if ((rates[idx] || 0) > cap) {
      rates[idx] = cap;
    }
  });
}

/**
 * Returns the final, fully adjusted pool and rates for ground encounters,
 * applying weather multipliers, visitor quotas, and legendary probability caps.
 * This function serves as the single source of truth for both combat and UI.
 */
export function getFinalGroundRates(
  loc: MapLocation,
  cycle: DayPhase,
  weather: WeatherId,
  activeEvents: GameEvent[]
): { pool: PokemonSpeciesId[]; rates: number[] } {
  const { pool, rates } = getEncounterPool(loc, cycle, weather, activeEvents);

  if (weather !== 'clear') {
    let wConfig = loc.weather?.[weather];
    if (!wConfig) {
      const family = requireWeatherFamilyId(weather);
      if (loc.weather?.[family]) {
        wConfig = loc.weather[family];
      }
    }
    const exclusives = wConfig?.exclusive ? getSpeciesEntries(wConfig.exclusive).map(entry => entry.id) : [];
    redistributeWeatherSpawns(rates, pool, weather, exclusives);
  }

  clampLegendaryRates(pool, rates);

  return { pool, rates };
}

export function applyAtmosphericStatus(pokemon: Pokemon, loc: MapLocation, weather: WeatherId, selectedId: PokemonSpeciesId): void {
  let weatherCfg = loc.weather?.[weather];
  if (!weatherCfg && weather !== 'clear') {
    const family = requireWeatherFamilyId(weather);
    if (loc.weather?.[family]) {
      weatherCfg = loc.weather[family];
    }
  }
  const visitors = weatherCfg?.visitors ? getSpeciesEntries(weatherCfg.visitors).map(entry => entry.id) : [];
  const exclusives = weatherCfg?.exclusive ? getSpeciesEntries(weatherCfg.exclusive).map(entry => entry.id) : [];
  const isVisitor = !!(weatherCfg?.visitors && (
    visitors.includes(selectedId)
  ));
  const isExclusive = !!(weatherCfg?.exclusive && (
    exclusives.includes(selectedId)
  ));
  const multiplier = getWeatherMultiplier(selectedId, weather);
  const isBuffed = !isVisitor && !isExclusive && multiplier > DEFAULT_WEATHER_MULTIPLIER_NORMAL;
  const isDebuffed = !isVisitor && !isExclusive && multiplier < DEFAULT_WEATHER_MULTIPLIER_NORMAL && multiplier > 0;
  
  if (isVisitor || isExclusive || isBuffed || isDebuffed) {
    pokemon.isAtmospheric = true;
    pokemon.weatherOrigin = weather;
    if (isDebuffed) pokemon.isWeatherStruggling = true;
  }
}

export interface SpawnPoolResult {
  generic: PokemonSpeciesId[]
  specific: PokemonSpeciesId[]
  rates: Partial<Record<PokemonSpeciesId, number>>
}

export function getMapSpawnPoolData(
  loc: MapLocation,
  cycle: DayPhase,
  activeWeather: WeatherId,
  activeEvents: GameEvent[] = []
): SpawnPoolResult {
  if (!loc.wild) {
    return { generic: [], specific: [], rates: {} }
  }

  const { pool, rates } = getEncounterPool(loc, cycle, activeWeather, activeEvents)

  const baseWild = loc.wild[cycle] || loc.wild.day || []
  const generic: PokemonSpeciesId[] = []
  const specific: PokemonSpeciesId[] = []
  const ratesMap: Partial<Record<PokemonSpeciesId, number>> = {}

  pool.forEach((id: PokemonSpeciesId, index: number) => {
    ratesMap[id] = rates[index] || DEFAULT_SPAWN_RATE_WEIGHT
    if (baseWild.includes(id)) {
      generic.push(id)
    } else {
      specific.push(id)
    }
  })

  if (loc.fishing) {
    loc.fishing.pool.forEach((id: PokemonSpeciesId, index: number) => {
      if (!generic.includes(id) && !specific.includes(id)) {
        generic.push(id)
        ratesMap[id] = loc.fishing!.rates[index] || DEFAULT_SPAWN_RATE_WEIGHT
      }
    })
  }

  return { generic, specific, rates: ratesMap }
}
