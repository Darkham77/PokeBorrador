import { requirePokemonSpeciesId, type PokemonSpeciesId, isLegendaryPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getWeatherFamily } from '@/data/system/weatherFamilies.ts';
import { redistributeWeatherSpawns } from '@/logic/utils/routeSpawnHelpers';
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils';
import { DAY_PHASES, type DayPhase } from '@/logic/utils/timeUtils';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine';
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry';
import {
  DEFAULT_EXCLUSIVE_SPAWN_WEIGHT,
  DEFAULT_VISITOR_SPAWN_WEIGHT,
  LEGENDARY_RATE_CAP_DENOMINATOR,
  DEFAULT_SPAWN_RATE_WEIGHT,
  DEFAULT_WEATHER_MULTIPLIER_NORMAL
} from '@/logic/constants/encounters';

export type WeightedSpeciesSource = PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>> | Record<string, number>;

export function getSpeciesEntries(source: WeightedSpeciesSource): Array<{ id: PokemonSpeciesId; weight?: number }> {
  if (Array.isArray(source)) return source.map(id => ({ id }));
  return Object.entries(source).map(([rawId, weight]) => ({
    id: requirePokemonSpeciesId(rawId),
    weight,
  }));
}

function requireWeatherFamilyId(weather: WeatherId): WeatherId {
  const family = getWeatherFamily(weather);
  if (!family) throw new Error(`[routeSpawnMath] Weather '${weather}' has no registered family`);
  return requireWeatherId(family);
}

export function getEncounterPool(
  loc: MapLocation,
  cycle: DayPhase,
  weather: WeatherId,
  activeEvents: GameEvent[] = []
): { pool: PokemonSpeciesId[]; rates: number[] } {
  const pool: PokemonSpeciesId[] = [];
  const rates: number[] = [];

  // 1. Población base
  const cyclePool = loc.wild?.[cycle] || loc.wild?.day || [];
  const cycleRates = loc.rates?.[cycle] || loc.rates?.day || [];

  cyclePool.forEach((id: PokemonSpeciesId, index: number) => {
    pool.push(id);
    rates.push(cycleRates[index] !== undefined ? cycleRates[index] : DEFAULT_SPAWN_RATE_WEIGHT);
  });

  let wConfig = loc.weather?.[weather];
  if (!wConfig && weather !== 'clear') {
    const family = requireWeatherFamilyId(weather);
    if (loc.weather?.[family]) {
      wConfig = loc.weather[family];
    }
  }

  if (weather !== 'clear' && wConfig) {
    if (wConfig.exclusive) {
      const exclusives = getSpeciesEntries(wConfig.exclusive);
      exclusives.forEach(({ id, weight }) => {
        if (id === 'castform' && cycle === 'night' && getWeatherFamily(weather) === 'sun') {
          return;
        }
        if (!pool.includes(id)) {
          pool.push(id);
          rates.push(weight ?? DEFAULT_EXCLUSIVE_SPAWN_WEIGHT);
        }
      });
    }

    if (wConfig.visitors) {
      const visitors = getSpeciesEntries(wConfig.visitors);
      visitors.forEach(({ id, weight }) => {
        if (id === 'castform' && cycle === 'night' && getWeatherFamily(weather) === 'sun') {
          return;
        }
        if (!pool.includes(id)) {
          pool.push(id);
          rates.push(weight !== undefined ? weight : DEFAULT_VISITOR_SPAWN_WEIGHT);
        }
      });
    }
  }

  // 2. Inyección por Eventos Dinámicos
  if (activeEvents && activeEvents.length > 0) {
    activeEvents.forEach(ev => {
      const cfg = (typeof ev.config === 'string' ? JSON.parse(ev.config) : ev.config) as EventConfig | undefined;
      if (ev.active && cfg?.ignoreTimeRestrictions && cfg.species) {
        const eventSpecies = cfg.species.split(',').map((s: string) => requirePokemonSpeciesId(s.trim().toLowerCase()));
        eventSpecies.forEach((spId: PokemonSpeciesId) => {
          if (!pool.includes(spId)) {
            const wild = loc.wild || {};
            for (const c of DAY_PHASES) {
              const cp = wild[c];
              if (!cp) continue;
              const idx = cp.indexOf(spId);
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
  }

  return { pool, rates };
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
  if (sumOtherRates === 0) return;

  const cap = sumOtherRates / LEGENDARY_RATE_CAP_DENOMINATOR;

  legendaryIndices.forEach(idx => {
    if ((rates[idx] || 0) > cap) {
      rates[idx] = cap;
    }
  });
}

/**
 * Returns the final, fully adjusted pool and rates for ground encounters.
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
  const isVisitor = Boolean(weatherCfg?.visitors && visitors.includes(selectedId));
  const isExclusive = Boolean(weatherCfg?.exclusive && exclusives.includes(selectedId));
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
    return { generic: [], specific: [], rates: {} };
  }

  const { pool, rates } = getEncounterPool(loc, cycle, activeWeather, activeEvents);

  const baseWild = loc.wild[cycle] || loc.wild.day || [];
  const generic: PokemonSpeciesId[] = [];
  const specific: PokemonSpeciesId[] = [];
  const ratesMap: Partial<Record<PokemonSpeciesId, number>> = {};

  pool.forEach((id: PokemonSpeciesId, index: number) => {
    ratesMap[id] = rates[index] || DEFAULT_SPAWN_RATE_WEIGHT;
    if (baseWild.includes(id)) {
      generic.push(id);
    } else {
      specific.push(id);
    }
  });

  if (loc.fishing) {
    loc.fishing.pool.forEach((id: PokemonSpeciesId, index: number) => {
      if (!generic.includes(id) && !specific.includes(id)) {
        generic.push(id);
        ratesMap[id] = loc.fishing!.rates[index] || DEFAULT_SPAWN_RATE_WEIGHT;
      }
    });
  }

  return { generic, specific, rates: ratesMap };
}
