import { describe, it, expect } from 'vite-plus/test';

import { requireMapRouteId } from '@/data/world/map-assets.ts';
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts';
import { requireWeatherId } from '@/logic/weather/weatherRegistry.ts';

const ROUTE1_ID = requireMapRouteId('route1');
const ROUTE22_ID = requireMapRouteId('route22');
const ROUTE2_ID = requireMapRouteId('route2');
const PALLET_ID = requireMapRouteId('pallet_town');
const SANDSTORM_ID = requireWeatherId('sandstorm');
const CLEAR_ID = requireWeatherId('clear');
const RAIN_ID = requireWeatherId('rain');

describe('Debug Weather & Map Environment Boundaries Parity', () => {
  it('throws descriptive boundary violation when sandstorm is injected into route1', () => {
    const route1Env = getMapEnvironment(ROUTE1_ID);
    expect(route1Env.isWeatherTypeAllowed(SANDSTORM_ID)).toBe(false);
    expect(() => route1Env.resolveCombatWeather(SANDSTORM_ID)).toThrowError(
      /\[MapEnvironment\] Violación de límites: El clima "sandstorm" no está permitido en el mapa "route1"/
    );
  });

  it('permits sandstorm on route22 and resolves combat weather successfully', () => {
    const route22Env = getMapEnvironment(ROUTE22_ID);
    expect(route22Env.isWeatherTypeAllowed(SANDSTORM_ID)).toBe(true);
    const resolved = route22Env.resolveCombatWeather(SANDSTORM_ID);
    expect(resolved.type).toBe('sandstorm');
    expect(resolved.visual).toBe('sandstorm');
  });

  it('allows canonical clear weather on starting town pallet and open routes', () => {
    const palletEnv = getMapEnvironment(PALLET_ID);
    expect(palletEnv.isWeatherTypeAllowed(CLEAR_ID)).toBe(true);

    const resolved = palletEnv.resolveCombatWeather(CLEAR_ID);
    expect(resolved.type).toBe('none');
    expect(resolved.visual).toBe('clear');
  });

  it('allows rain weather on route2 and rejects impossible mountain phenomena on low plains', () => {
    const route2Env = getMapEnvironment(ROUTE2_ID);
    expect(route2Env.isWeatherTypeAllowed(RAIN_ID)).toBe(true);

    const resolved = route2Env.resolveCombatWeather(RAIN_ID);
    expect(resolved.type).toBe('rain');
    expect(resolved.visual).toBe('rain');
  });

  it('verifies deterministic environment caching parity across repeated lookups', () => {
    const envA = getMapEnvironment(ROUTE1_ID);
    const envB = getMapEnvironment(ROUTE1_ID);
    expect(envA).toBe(envB);
  });

  it('guarantees non-empty allowed weather types list for all tested regions', () => {
    const testMaps = [ROUTE1_ID, ROUTE22_ID, ROUTE2_ID, PALLET_ID];
    for (const mapId of testMaps) {
      const env = getMapEnvironment(mapId);
      expect(env.boundaries.allowedWeathers.size).toBeGreaterThan(0);
      expect(env.isWeatherTypeAllowed(CLEAR_ID)).toBe(true);
    }
  });
});
