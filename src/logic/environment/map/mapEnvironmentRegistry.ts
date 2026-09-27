import { BaseMapEnvironment } from './baseMapEnvironment.ts';
import {
  OutdoorRouteEnvironment,
  CaveEnvironment,
  IndoorEnvironment,
  GymEnvironment
} from './concreteEnvironments.ts';
import { FIRE_RED_MAPS } from '@/data/world/maps.ts';
import { GYMS, type Gym, type GymId } from '@/data/world/gyms.ts';
import { MAP_ROUTE_MAPPING, type MapRouteId } from '@/data/world/map-assets.ts';

import { STADIUMS } from '@/data/world/stadiums.ts';

export interface EnvironmentResolutionOptions {
  readonly isGym?: boolean;
  readonly gymId?: GymId;
  readonly isPvP?: boolean;
  readonly isCave?: boolean;
  readonly isIndoors?: boolean;
}

function initializeRegistry(): ReadonlyMap<string, BaseMapEnvironment> {
  const map = new Map<string, BaseMapEnvironment>();

  // 1. Instanciar todas las ubicaciones canónicas de FireRed
  for (const loc of FIRE_RED_MAPS) {
    if (loc.isCave || loc.isCrystalCave) {
      map.set(loc.id, new CaveEnvironment({ id: loc.id, name: loc.name }));
    } else if (loc.isIndoors || loc.id === 'power_plant' || loc.id === 'pokemon_tower' || loc.id === 'mansion') {
      map.set(loc.id, new IndoorEnvironment({
        id: loc.id,
        name: loc.name,
        supportedCycles: loc.supportedCycles
      }));
    } else {
      map.set(loc.id, new OutdoorRouteEnvironment({
        id: loc.id,
        name: loc.name,
        supportedCycles: loc.supportedCycles
      }));
    }
  }

  // 2. Instanciar Gimnasios específicos
  for (const gym of (GYMS as readonly Gym[])) {
    const gymEnv = new GymEnvironment({
      id: gym.id,
      name: gym.name,
      gymId: gym.id,
      leaderName: gym.leader,
      gymType: gym.type,
      fixedCycle: gym.fixedCycle,
      fixedWeather: gym.fixedWeather,
      weatherEnabled: gym.weatherEnabled
    });
    map.set(gym.id, gymEnv);
  }

  // 3. Estadios definidos en la base de datos de estadios (stadiums.ts)
  // Permite configurar reglas de clima, iluminación o tipo de entorno por estadio
  for (const stadium of STADIUMS) {
    map.set(stadium.id, new GymEnvironment({
      id: stadium.id,
      name: stadium.name,
      weatherEnabled: stadium.weatherEnabled,
      fixedWeather: stadium.fixedWeather,
      fixedCycle: stadium.fixedCycle,
      isIndoors: stadium.isIndoors,
      supportedCycles: stadium.supportedCycles
    }));
  }

  // 4. Instanciar Ciudades y ubicaciones de MAP_ROUTE_MAPPING no registradas previamente
  for (const key of Object.keys(MAP_ROUTE_MAPPING)) {
    if (!map.has(key)) {
      map.set(key, new OutdoorRouteEnvironment({
        id: key,
        name: key
      }));
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
  options?: EnvironmentResolutionOptions
): BaseMapEnvironment {
  if (!locationId || typeof locationId !== 'string' || locationId.trim() === '') {
    throw new Error('[MapEnvironmentRegistry] locationId no especificado o inválido. Se prohíben fallbacks silenciosos.');
  }

  // Si se pasa un gimnasio específico por gymId (ej. 'pewter')
  if (options?.gymId && REGISTRY.has(options.gymId)) {
    return REGISTRY.get(options.gymId)!;
  }

  // Búsqueda canónica directa por el locationId del mapa
  const env = REGISTRY.get(locationId);
  if (!env) {
    throw new Error(`[MapEnvironmentRegistry] Entorno no registrado para locationId: "${locationId}". Se rechazan fallbacks silenciosos.`);
  }

  return env;
}
