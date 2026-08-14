import { isWeatherTableRouteId, ROUTE_WEATHER_TABLES, type WeatherSeasonId } from '@/data/world/weather-tables';
import type { MapRouteId } from '@/data/world/map-assets';
import { getDayCycle, type DayPhase } from '@/logic/utils/timeUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { isWeatherId, requireWeatherId, WEATHER_REGISTRY, type WeatherId } from './weatherRegistry.ts';
import { translateType, type PokemonType } from '@/data/battle/types';
import { ONE_HOUR_MS } from '@/logic/constants/items.ts';
import { CRIMINALITY_DENOMINATOR_FACTOR } from '@/logic/constants/gameplay';
import { DEBUG_TRAINER_CHANCE_PERCENT } from '@/logic/constants/encounters';
import type { PokemonData } from '@/types/system/database';

const WEATHER_BUFF_MULTIPLIER = 1.5;
const WEATHER_DEBUFF_MULTIPLIER = 0.4;
const WEATHER_BLOCK_MULTIPLIER = 0;

import { mulberry32, hashString } from '../utils/math.ts';






import { PROBABILITY_PERCENT_SCALE } from './weatherMath.ts';

/**
 * Deterministically calculates the weather for a given route, season, and epoch hour.
 * 
 * @param {string} mapId - The route identifier.
 * @param {string} seasonId - The season identifier (spring, summer, autumn, winter).
 * @param {number} epochHour - The continuous epoch hour.
 * @param {string} [forcedCycle] - Optional forced cycle for debug/testing.
 * @returns {string} The weather string (e.g., 'clear', 'rain', 'snow').
 */
export function getRouteWeather(
  mapId: MapRouteId,
  seasonId: WeatherSeasonId,
  epochHour: number,
  forcedCycle?: DayPhase
): WeatherId {
  if (!isWeatherTableRouteId(mapId)) {
    if (mapId === 'gym' || mapId === 'pvp') {
      return 'clear';
    }
    throw new Error(`[weatherUtils] Route '${mapId}' has no registered weather table`);
  }
  const routeTables = ROUTE_WEATHER_TABLES[mapId];
  const seasonTable = routeTables[seasonId];
  
  const cycle: DayPhase = forcedCycle || getDayCycle(epochHour * ONE_HOUR_MS);
  const table = seasonTable[cycle];
  
  // 2. Generate Deterministic Seed
  const mapHash = hashString(mapId);
  // Mix map hash and epoch hour to ensure different maps have different weather at the same hour
  const seed = (mapHash + epochHour) >>> 0;
  
  // 3. Initialize PRNG and discard first few values to break seed correlation
  const prng = mulberry32(seed);
  prng();
  prng();
  prng();
  const randNum = prng() * PROBABILITY_PERCENT_SCALE; // 0 to 99.999...
  
  // 4. Iterate and accumulate probabilities
  let cumulative = 0;
  for (const [weather, prob] of Object.entries(table)) {
    if (prob === undefined) continue;
    cumulative += prob;
    if (randNum < cumulative) {
      return requireWeatherId(weather);
    }
  }
  
  throw new Error(`[weatherUtils] Weather table probabilities did not select a weather for route '${mapId}', season '${seasonId}', cycle '${cycle}'`);
}

/**
 * Determina el multiplicador de spawn de una especie basado en el clima actual.
 */
export function getWeatherMultiplier(id: string, weather: string): number {
  let pData: (PokemonData & { type: string | string[] }) | null = null;
  try {
    pData = pokemonDataProvider.getPokemonData(id) as (PokemonData & { type: string | string[] });
  } catch (_err) {
    return 1.0;
  }
  if (!pData || !weather || weather === 'clear') return 1.0;
  
  const types: PokemonType[] = []
  if (Array.isArray(pData.type)) {
    types.push(...pData.type as PokemonType[])
  } else if (pData.type) {
    types.push(pData.type as PokemonType)
  }
  if (pData.type2) {
    types.push(pData.type2 as PokemonType)
  }

  const w = isWeatherId(weather) ? weather : null;
  if (!w) return 1.0;
  
  const entry = WEATHER_REGISTRY[w];
  const mods = entry?.modifiers;
  if (!mods) return 1.0;

  if (mods.block?.some(t => types.includes(t))) return WEATHER_BLOCK_MULTIPLIER;
  if (mods.boost?.some(t => types.includes(t))) return WEATHER_BUFF_MULTIPLIER;
  if (mods.debuff?.some(t => types.includes(t))) return WEATHER_DEBUFF_MULTIPLIER;

  return 1.0;
}

/**
 * Generates the modifiers text block for a weather (boosts, debuffs, blocks).
 */
export function getWeatherModifiersDescription(weather: string): string {
  const w = isWeatherId(weather) ? weather : null;
  if (!w) return '';
  const entry = WEATHER_REGISTRY[w];
  const mods = entry?.modifiers;
  if (!mods) return '';

  const formatList = (list?: readonly PokemonType[]) => (list || []).map(translateType).join(', ');
  
  const lines = [];
  if (mods.boost?.length) lines.push(`▲ ${formatList(mods.boost)}`);
  if (mods.debuff?.length) lines.push(`▼ ${formatList(mods.debuff)}`);
  if (mods.block?.length) lines.push(`🚫 ${formatList(mods.block)}`);
  
  return lines.length ? `\n${lines.join('\n')}` : '';
}

import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData } from '@/logic/war/guardianEngine';
import { GUARDIAN_ENCOUNTER_CHANCE_PERCENT } from '@/logic/constants/gameplay';
import { getActivePinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { GAME_RATIOS } from '@/data/system/constants';
import type { EncounterState, EncounterOptions } from '@/types/pokemon/encounters';
import { GYM_IDS } from '@/data/world/gyms';

export interface NpcChanceInfo {
  name: string;
  chance: number;
  type: string;
  active: boolean;
  details?: string;
}

/**
 * Calcula las probabilidades de encuentros especiales y entrenadores para una ruta.
 */
export function getNpcEncounterChances(
  locId: MapRouteId,
  state: EncounterState,
  options: EncounterOptions = {},
  allMapIds: readonly MapRouteId[]
): NpcChanceInfo[] {
  const result: NpcChanceInfo[] = [];

  // 1. Rival
  const debug = typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined;
  
  let rivalChance = GAME_RATIOS.encounters.rival;
  const eventRivalBonus = options.eventRivalBonus || 1;
  rivalChance *= eventRivalBonus;

  const CLASS_LEVEL_RIVAL_BOOST_MIN_LEVEL = 20;

  if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= CLASS_LEVEL_RIVAL_BOOST_MIN_LEVEL) {
    const allGymsHard = GYM_IDS.every(id => state.gymProgress?.[id]?.hard === true);
    if (allGymsHard) {
      rivalChance *= 2;
    }
  }

  const hasRivalOverride = !!debug?.forceRival;
  const finalRivalChance = hasRivalOverride ? 1.0 : rivalChance;

  result.push({
    name: 'Rival',
    chance: finalRivalChance * 100,
    type: 'rival',
    active: true,
    details: hasRivalOverride ? 'Forzado por Debug' : undefined
  });

  // 2. Defender
  let hasDefender = false;
  if (!isDisputePhase()) {
    if (state.faction) {
      const dominance = (options.dominanceData || {})[locId];
      const winner = dominance?.winner || null;
      if (winner && winner !== state.faction) {
        hasDefender = true;
      }
    }
  }
  const FACTION_DEFENDER_ENCOUNTER_PCT = 20.0;
  result.push({
    name: 'Defensor de Facción',
    chance: hasDefender ? FACTION_DEFENDER_ENCOUNTER_PCT : 0.0,
    type: 'defender',
    active: hasDefender
  });

  // 3. Guardian (Alfa)
  const guardian = getGuardianData(locId, allMapIds);
  let hasGuardian = false;
  if (guardian) {
    const dailyCaptures = state.dailyGuardianCaptures || (getActivePinia() ? useGameStore().dailyGuardianCaptures : []);
    const capturedToday = (dailyCaptures || []).includes(locId);
    if (!capturedToday) {
      hasGuardian = true;
    }
  }
  const isGuardianForced = hasGuardian && !!debug?.forceGuardian80;
  const DEBUG_FORCED_GUARDIAN_PCT = 80.0;
  const finalGuardianChance = isGuardianForced ? DEBUG_FORCED_GUARDIAN_PCT : (hasGuardian ? GUARDIAN_ENCOUNTER_CHANCE_PERCENT * 100 : 0.0);
  result.push({
    name: 'Guardián (Alfa)',
    chance: finalGuardianChance,
    type: 'guardian',
    active: hasGuardian,
    details: isGuardianForced ? 'Forzado por Debug' : undefined
  });

  // 4. Trainer / Policía
  const repelActive = (state.repelSecs || 0) > 0;
  const trainerBonus = options.eventTrainerBonus || 1;
  const criminality = state.classData?.criminality || 0;
  const isRocketMaxCrim = state.playerClass === 'rocket' && criminality >= 100;

  let baseTrainerChance = 0;
  if (repelActive) {
    baseTrainerChance = GAME_RATIOS.encounters.trainerRepel * 100;
  } else if (debug?.trainerChance50) {
    baseTrainerChance = DEBUG_TRAINER_CHANCE_PERCENT;
  } else {
    baseTrainerChance = isRocketMaxCrim
      ? (criminality / CRIMINALITY_DENOMINATOR_FACTOR) * trainerBonus
      : Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus;
  }

  if (isRocketMaxCrim) {
    result.push({
      name: 'Oficial de Policía',
      chance: baseTrainerChance,
      type: 'police',
      active: true,
      details: debug?.trainerChance50 ? 'Forzado por Debug' : (repelActive ? 'Repelente' : `Crim: ${criminality}`)
    });
  } else {
    result.push({
      name: 'Entrenador Común',
      chance: baseTrainerChance,
      type: 'trainer',
      active: true,
      details: debug?.trainerChance50 ? 'Forzado por Debug' : (repelActive ? 'Repelente' : undefined)
    });
  }

  return result;
}
