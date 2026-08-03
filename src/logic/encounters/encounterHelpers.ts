import { GAME_RATIOS } from '@/data/system/constants';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { getActivePinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { isDisputePhase } from '@/logic/war/warEngine';
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine';
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
  while (rates.length < pool.length) rates.push(10);
 
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
          rates.push(weight ?? 5); 
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
          rates.push(weight !== undefined ? -weight : -10); 
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
              rates.push(originalRates[idx] || 10);
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
  const totalRate = rates.reduce((a, b) => a + b, 0);
  const rand = Math.random() * totalRate;
  let cumulative = 0;
  
  for (let i = 0; i < pool.length; i++) {
    cumulative += rates[i] || 0;
    const selected = pool[i];
    if (selected && rand <= cumulative) return selected;
  }
  const first = pool[0];
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
  // 0. Debug: 50% trainer override
  const win = (typeof window !== 'undefined' ? window : null) as (Window & {
    __VITE_DEBUG__?: {
      forceEncounterType?: string;
      forceRival?: boolean;
    };
  }) | null;
  const debug = win?.__VITE_DEBUG__;
  
  if (debug?.forceEncounterType) {
    if (debug.forceEncounterType === 'fishing') {
      return {
        type: 'fishing',
        pokemon: {
          id: 'magikarp',
          uid: 'magikarp-fishing-1234',
          name: 'Magikarp',
          level: 10,
          hp: 30,
          maxHp: 30,
          moves: [{ id: 'splash', name: 'Salpicadura', type: 'water', cat: 'status', pp: 40, maxPP: 40, priority: 0, power: null, acc: null, effect: '', target: 'normal' }],
          stats: { hp: 30, atk: 10, def: 10, spa: 15, spd: 15, spe: 20 },
          maxStats: { hp: 30, atk: 10, def: 10, spa: 15, spd: 15, spe: 20 },
          exp: 0,
          nextLevelExp: 100,
          gender: 'm',
          nature: 'hardy',
          ability: 'swiftswim',
          isShiny: false
        } as unknown as Pokemon // domain-ok
      };
    }
    if (debug.forceEncounterType === 'archaeology') {
      return {
        type: 'archaeology',
        pokemon: {
          id: 'kabuto',
          uid: 'kabuto-archaeology-1234',
          name: 'Kabuto',
          level: 10,
          hp: 35,
          maxHp: 35,
          moves: [{ id: 'scratch', name: 'Arañazo', type: 'normal', cat: 'physical', pp: 35, maxPP: 35, priority: 0, power: 40, acc: 100, effect: '', target: 'normal' }],
          stats: { hp: 35, atk: 15, def: 20, spa: 15, spd: 15, spe: 15 },
          maxStats: { hp: 35, atk: 15, def: 20, spa: 15, spd: 15, spe: 15 },
          exp: 0,
          nextLevelExp: 100,
          gender: 'm',
          nature: 'hardy',
          ability: 'battlearmor',
          isShiny: false
        } as unknown as Pokemon // domain-ok
      };
    }
    if (debug.forceEncounterType === 'trainer') {
      return { type: 'trainer' };
    }
    if (debug.forceEncounterType === 'rival') {
      return { type: 'rival' };
    }
    if (debug.forceEncounterType === 'wild') {
      return {
        type: 'wild',
        pokemon: {
          id: 'pidgey',
          uid: 'pidgey-wild-1234',
          name: 'Pidgey',
          level: 5,
          hp: 20,
          maxHp: 20,
          moves: [{ id: 'tackle', name: 'Placaje', type: 'normal', cat: 'physical', pp: 35, maxPP: 35, priority: 0, power: 40, acc: 100, effect: '', target: 'normal' }],
          stats: { hp: 20, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
          maxStats: { hp: 20, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
          exp: 0,
          nextLevelExp: 50,
          gender: 'f',
          nature: 'hardy',
          ability: 'tangledfeet',
          isShiny: false
        } as unknown as Pokemon // domain-ok
      };
    }
  }

  if (debug?.forceRival) {
    return { type: 'rival' };
  }

  if (!options.forceEncounter && debug?.trainerChance50) {
    if (Math.random() < 0.50) {
      return { type: 'trainer' };
    }
  }

  if (!options.forceEncounter && debug?.forceGuardian80) {
    const dailyCaptures = state.dailyGuardianCaptures || (getActivePinia() ? useGameStore().dailyGuardianCaptures : []);
    const capturedToday = (dailyCaptures || []).includes(locId);
    if (!capturedToday && Math.random() < 0.80) {
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
    const eventRivalBonus = options.eventRivalBonus || 1;
    rivalChance *= eventRivalBonus;

    if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= 20) {
      const gymIds = (['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'] as const satisfies readonly GymId[]).map(requireGymId);
      const allGymsHard = gymIds.every(id => state.gymProgress?.[id]?.hard === true);
      if (allGymsHard) {
        rivalChance *= 2;
      }
    }

    if (Math.random() < rivalChance) {
      return { type: 'rival' };
    }
  }
  
  // 1. Especial: Fase de Dominancia (Finde) - Batallas de Defensores
  if (!isDisputePhase() && !options.forceEncounter) {
    if (Math.random() < 0.20 && state.faction) {
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
    if (!capturedToday && Math.random() < GUARDIAN_CHANCE) {
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
  const rates = rawRates.map(r => r === -1 ? 5 : r); 
  clampLegendaryRates(pool, rates); 

  const firstPokemon = state.team?.[0];

  for (let attempt = 0; attempt < 10; attempt++) {
    const selectedId = selectFromPool(pool, rates);
    const minLv = loc.lv[0] || 2;
    const maxLv = loc.lv[1] || 5;
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
  const minLv = loc.archaeology.lv[0] || 15;
  const maxLv = loc.archaeology.lv[1] || 25;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  const totalRate = archRates.reduce((a: number, b: number) => a + b, 0);
  const rateIdx = archPool.indexOf(selectedId);
  const rateVal = archRates[rateIdx];
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * 100;
  
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
  const isRainy = RAINY_WEATHERS.includes(weather);
  const climateFishingMultiplier = isRainy ? 1.20 : 1.0;
  const fishingBonus = (options.eventFishingBonus || 1) * climateFishingMultiplier;

  const groundWeight = 100;

  let fishingWeight = 0;
  if (loc.fishing) {
    fishingWeight = GAME_RATIOS.encounters.fishing * 100 * fishingBonus;
    if ((state.fishingRodSecs || 0) > 0) {
      fishingWeight += 600;
    }
  }

  let archWeight = 0;
  if (loc.archaeology) {
    const isCave = !!loc.isCave;
    const isMountain = !!loc.isMountain;
    archWeight = isCave ? 10 : (isMountain ? 5 : 0);
    if ((state.pickaxeSecs || 0) > 0 || (state.brushSecs || 0) > 0) {
      archWeight += 600;
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
  // Set cap = sumOtherRates / 99.
  const cap = sumOtherRates / 99;

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
  const isBuffed = !isVisitor && !isExclusive && multiplier > 1.0;
  const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0;
  
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
  cycle: 'morning' | 'day' | 'dusk' | 'night',
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
    ratesMap[id] = rates[index] || 10
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
        ratesMap[id] = loc.fishing!.rates[index] || 10
      }
    })
  }

  return { generic, specific, rates: ratesMap }
}
