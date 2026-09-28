import { BaseMapEnvironment, type MapEnvironmentBoundaries } from './baseMapEnvironment.ts';
import {
  OutdoorEnvironment,
  SubterraneanCaveEnvironment,
  InteriorFacilityEnvironment,
  StadiumEnvironment
} from './concreteEnvironments.ts';
import { FIRE_RED_MAPS } from '@/data/world/maps.ts';
import type { MapLocation } from '@/types/pokemon/encounters.ts';
import type { GymId } from '@/data/world/gyms.ts';
import { MAP_ROUTE_MAPPING, getAvailableCyclesForMap, isMapRouteId, type MapRouteId } from '@/data/world/map-assets.ts';
import { ROUTE_WEATHER_TABLES, isWeatherTableRouteId, WEATHER_SEASON_IDS } from '@/data/world/weather-tables.ts';
import { isWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry.ts';
import { DAY_PHASES, type DayPhase } from '@/types/system/time.ts';

export interface EnvironmentResolutionOptions {
  readonly isGym?: boolean;
  readonly gymId?: GymId;
  readonly isPvP?: boolean;
  readonly isCave?: boolean;
  readonly isIndoors?: boolean;
}

const DEFAULT_CITY_ALLOWED_WEATHERS: readonly WeatherId[] = ['clear', 'none'] as const;
const DEFAULT_CITY_ALLOWED_SET: ReadonlySet<WeatherId> = new Set<WeatherId>(DEFAULT_CITY_ALLOWED_WEATHERS); // runtime-set: Fast O(1) membership lookup set

function collectWeathersFromTable(routeId: MapRouteId, target: Set<WeatherId>): void {
  if (!isWeatherTableRouteId(routeId)) return;
  const table = ROUTE_WEATHER_TABLES[routeId];
  for (const season of WEATHER_SEASON_IDS) {
    const seasonData = table[season];
    if (!seasonData) continue;
    for (const phase of DAY_PHASES) {
      const phaseData = seasonData[phase];
      if (!phaseData) continue;
      for (const w of Object.keys(phaseData)) {
        if (isWeatherId(w)) target.add(w);
      }
    }
  }
}

function deriveAllowedWeathers(loc: MapLocation): ReadonlySet<WeatherId> {
  const allowed = new Set<WeatherId>();
  allowed.add('clear');
  allowed.add('none');

  if (loc.allowedWeathers) {
    for (const w of loc.allowedWeathers) {
      allowed.add(w);
    }
  }

  if (loc.weather) {
    for (const w of Object.keys(loc.weather)) {
      if (isWeatherId(w)) allowed.add(w);
    }
  }

  collectWeathersFromTable(loc.id, allowed);
  return allowed;
}

function buildBoundariesFromMapLocation(loc: MapLocation): MapEnvironmentBoundaries {
  const allowedWeathers = deriveAllowedWeathers(loc);
  
  let weatherEnabled: boolean;
  if (loc.weatherEnabled !== undefined) {
    weatherEnabled = loc.weatherEnabled;
  } else {
    const nonClear = Array.from(allowedWeathers).some(w => w !== 'clear' && w !== 'none');
    weatherEnabled = nonClear;
  }

  const supportedCycles: readonly DayPhase[] = loc.supportedCycles && loc.supportedCycles.length > 0
    ? loc.supportedCycles
    : (() => {
        const available = getAvailableCyclesForMap(loc.id);
        if (available.length > 0) return available;
        if (loc.fixedCycle) return [loc.fixedCycle] as const;
        return DAY_PHASES;
      })();

  const isCave = Boolean(loc.isCave || loc.isCrystalCave);
  const isIndoors = Boolean(loc.isIndoors || loc.id === 'stadium' || loc.id === 'power_plant' || loc.id === 'pokemon_tower' || loc.id === 'mansion');

  return {
    id: loc.id,
    name: loc.name,
    weatherEnabled,
    allowedWeathers,
    supportedCycles,
    fixedCycle: loc.fixedCycle,
    fixedWeather: loc.fixedWeather,
    isCave,
    isIndoors
  };
}

function createEnvironmentFromBoundaries(boundaries: MapEnvironmentBoundaries): BaseMapEnvironment {
  if (boundaries.id === 'stadium') {
    return new StadiumEnvironment(boundaries);
  }
  if (boundaries.isCave) {
    return new SubterraneanCaveEnvironment(boundaries);
  }
  if (boundaries.isIndoors) {
    return new InteriorFacilityEnvironment(boundaries);
  }
  return new OutdoorEnvironment(boundaries);
}

function initializeRegistry(): ReadonlyMap<string, BaseMapEnvironment> {
  const map = new Map<string, BaseMapEnvironment>();

  // 1. Instanciar todas las ubicaciones canónicas de FIRE_RED_MAPS
  for (const loc of FIRE_RED_MAPS) {
    const boundaries = buildBoundariesFromMapLocation(loc);
    map.set(loc.id, createEnvironmentFromBoundaries(boundaries));
  }

  // 2. Instanciar ubicaciones de MAP_ROUTE_MAPPING no registradas previamente (ej. ciudades)
  for (const rawKey of Object.keys(MAP_ROUTE_MAPPING)) {
    if (!isMapRouteId(rawKey)) continue;
    const key: MapRouteId = rawKey;
    if (!map.has(key)) {
      if (key === 'gym' && map.has('stadium')) {
        map.set('gym', map.get('stadium')!);
        continue;
      }
      const availableCycles = getAvailableCyclesForMap(key);
      const boundaries: MapEnvironmentBoundaries = {
        id: key,
        name: key,
        weatherEnabled: true,
        allowedWeathers: DEFAULT_CITY_ALLOWED_SET,
        supportedCycles: availableCycles.length > 0 ? availableCycles : DAY_PHASES,
        isCave: false,
        isIndoors: false
      };
      map.set(key, new OutdoorEnvironment(boundaries));
    }
  }

  return Object.freeze(map);
}

const REGISTRY: ReadonlyMap<string, BaseMapEnvironment> = initializeRegistry();

/**
 * Resolves the immutable BaseMapEnvironment instance for the given location and context.
 * The environment rules (weather, lighting, terrain) belong 100% to the map itself,
 * meaning any game mode (PvP, PvE, Gym, Wild) respects the map it is currently hosted in.
 * Strict zero-fallback policy: fails loudly with descriptive error if locationId is invalid or unregistered.
 */
export function getMapEnvironment(
  locationId: MapRouteId | GymId,
  _options?: EnvironmentResolutionOptions
): BaseMapEnvironment {
  if (!locationId || typeof locationId !== 'string' || locationId.trim() === '') {
    throw new Error('[MapEnvironmentRegistry] locationId no especificado o inválido. Se prohíben fallbacks silenciosos.');
  }

  // Si se pasa gym como locationId, mapea canónicamente al estadio
  const resolvedId = locationId === 'gym' ? 'stadium' : locationId;

  // Búsqueda canónica directa por el locationId del mapa
  const env = REGISTRY.get(resolvedId);
  if (!env) {
    throw new Error(`[MapEnvironmentRegistry] Entorno no registrado para locationId: "${locationId}". Se rechazan fallbacks silenciosos.`);
  }

  return env;
}
