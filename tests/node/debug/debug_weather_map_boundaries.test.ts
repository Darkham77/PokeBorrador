// test-fragmentation-ok: Isolated single-purpose regression test for debug weather map boundaries
import { describe, it, expect } from 'vitest';
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts';
import { requireWeatherId } from '@/logic/weather/weatherRegistry.ts';
import { requireMapRouteId } from '@/data/world/map-assets.ts';

const ROUTE1_ID = requireMapRouteId('route1');
const ROUTE22_ID = requireMapRouteId('route22');
const SANDSTORM_ID = requireWeatherId('sandstorm');

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
});
