import { describe, it, expect } from 'vitest';
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts';
import { BaseMapEnvironment } from '@/logic/environment/map/baseMapEnvironment.ts';
import { WEATHER_IDS, type WeatherId } from '@/logic/weather/weatherRegistry.ts';
import { DAY_PHASES } from '@/types/system/time.ts';
import type { MapRouteId } from '@/data/world/map-assets.ts';
import { FIRE_RED_MAPS } from '@/data/world/maps.ts';
import { ROUTE_WEATHER_TABLES, isWeatherTableRouteId, WEATHER_SEASON_IDS } from '@/data/world/weather-tables.ts';

describe('Map Environment Boundaries & Universal Dynamic Matrix (Data-Driven SSoT)', () => {
  describe('1. Verificación Dinámica Exhaustiva de Todos los Mapas en FIRE_RED_MAPS', () => {
    for (const loc of FIRE_RED_MAPS) {
      describe(`Mapa: "${loc.id}" (${loc.name})`, () => {
        it('debe instanciar un BaseMapEnvironment congelado y alineado con sus metadatos', () => {
          const env = getMapEnvironment(loc.id);
          expect(env).toBeInstanceOf(BaseMapEnvironment);
          expect(env.id).toBe(loc.id);
          expect(env.name).toBe(loc.name);
          expect(Object.isFrozen(env)).toBe(true);

          const expectedCave = Boolean(loc.isCave || loc.isCrystalCave);
          expect(env.isCave()).toBe(expectedCave);

          const expectedIndoors = Boolean(
            loc.isIndoors ||
            loc.id === 'stadium' ||
            loc.id === 'power_plant' ||
            loc.id === 'pokemon_tower' ||
            loc.id === 'mansion'
          );
          expect(env.isIndoors()).toBe(expectedIndoors);
        });

        it('debe resolver la iluminación dinámica o fija estrictamente según sus límites', () => {
          const env = getMapEnvironment(loc.id);
          for (const phase of DAY_PHASES) {
            const resolvedLighting = env.resolveEffectiveLighting(phase);
            if (loc.fixedCycle) {
              expect(resolvedLighting).toBe(loc.fixedCycle);
            } else if (env.boundaries.supportedCycles.includes(phase)) {
              expect(resolvedLighting).toBe(phase);
            } else {
              expect(env.boundaries.supportedCycles).toContain(resolvedLighting);
            }
          }
        });

        const routeId = loc.id;
        if (isWeatherTableRouteId(routeId)) {
          it('todos los climas generados por la tabla meteorológica deben ser admitidos por los límites del mapa', () => {
            const env = getMapEnvironment(loc.id);
            const table = ROUTE_WEATHER_TABLES[routeId];

            for (const season of WEATHER_SEASON_IDS) {
              const seasonData = table[season];
              if (!seasonData) continue;
              for (const phase of DAY_PHASES) {
                const phaseData = seasonData[phase];
                if (!phaseData) continue;
                for (const [weatherKey, chance] of Object.entries(phaseData)) {
                  if (typeof chance === 'number' && chance > 0) {
                    const weatherId = weatherKey as WeatherId;
                    expect(
                      env.isWeatherTypeAllowed(weatherId),
                      `El mapa "${loc.id}" genera "${weatherId}" en ${season}/${phase} pero no lo permite en sus límites.`
                    ).toBe(true);
                    expect(() => env.assertWeatherAllowed(weatherId)).not.toThrow();
                  }
                }
              }
            }
          });
        }

        const mapWeather = loc.weather;
        if (mapWeather) {
          it('todos los climas con Pokémon visitantes o exclusivos deben ser admitidos por los límites del mapa', () => {
            const env = getMapEnvironment(loc.id);
            for (const weatherKey of Object.keys(mapWeather)) {
              const weatherId = weatherKey as WeatherId;
              expect(
                env.isWeatherTypeAllowed(weatherId),
                `El mapa "${loc.id}" define spawns para "${weatherId}" pero no lo permite en sus límites.`
              ).toBe(true);
              expect(() => env.assertWeatherAllowed(weatherId)).not.toThrow();
            }
          });
        }

        it('debe rechazar ruidosamente cualquier clima activo que viole los límites del mapa', () => {
          const env = getMapEnvironment(loc.id);

          for (const weather of WEATHER_IDS) {
            const isBaseClean = weather === 'none' || weather === 'clear' || weather === 'null';

            if (!env.isWeatherAllowed()) {
              if (isBaseClean) {
                expect(env.isWeatherTypeAllowed(weather)).toBe(true);
                expect(env.resolveCombatWeather(weather)).toEqual({ type: 'none', visual: 'clear', turns: -1 });
              } else {
                expect(env.isWeatherTypeAllowed(weather)).toBe(false);
                expect(() => env.assertWeatherAllowed(weather)).toThrowError(/\[MapEnvironment\] Violación de límites/);
                expect(() => env.resolveCombatWeather(weather)).toThrowError(/\[MapEnvironment\] Violación de límites/);
              }
            } else {
              const isAllowed = env.boundaries.allowedWeathers.has(weather) || isBaseClean;
              expect(env.isWeatherTypeAllowed(weather)).toBe(isAllowed);
              if (isAllowed) {
                expect(() => env.assertWeatherAllowed(weather)).not.toThrow();
                expect(() => env.resolveCombatWeather(weather)).not.toThrow();
              } else {
                expect(() => env.assertWeatherAllowed(weather)).toThrowError(/\[MapEnvironment\] Violación de límites/);
                expect(() => env.resolveCombatWeather(weather)).toThrowError(/\[MapEnvironment\] Violación de límites/);
              }
            }
          }
        });
      });
    }
  });

  describe('2. Estadio Genérico Universal ("stadium")', () => {
    it('el mapa "stadium" debe tener clima deshabilitado y horario fijo diurno', () => {
      const env = getMapEnvironment('stadium');
      expect(env.environmentKind).toBe('stadium');
      expect(env.isWeatherAllowed()).toBe(false);
      expect(env.resolveEffectiveLighting('night')).toBe('day');
      expect(env.resolveEffectiveLighting('morning')).toBe('day');
    });

    it('el alias "gym" debe apuntar al mismo entorno que "stadium"', () => {
      const stadiumEnv = getMapEnvironment('stadium');
      const gymEnv = getMapEnvironment('gym');
      expect(gymEnv).toBe(stadiumEnv);
    });

    it('tanto combates de gimnasio como PvP en "stadium" usan el mismo entorno y respetan sus límites', () => {
      const gymCombatEnv = getMapEnvironment('stadium', { isGym: true, gymId: 'pewter' });
      const pvpCombatEnv = getMapEnvironment('stadium', { isPvP: true });

      expect(gymCombatEnv).toBe(pvpCombatEnv);
      expect(gymCombatEnv.isWeatherAllowed()).toBe(false);
      expect(() => gymCombatEnv.resolveCombatWeather('rain' as WeatherId)).toThrowError(/\[MapEnvironment\] Violación de límites/);
    });
  });

  describe('3. Mandato de Cero Fallbacks y Errores Ruidosos (Fail Loudly)', () => {
    it('debe lanzar un error descriptivo inmediato si locationId está vacío o es nulo', () => {
      expect(() => getMapEnvironment('' as unknown as MapRouteId)).toThrowError(/\[MapEnvironmentRegistry\]/);
      expect(() => getMapEnvironment(null as unknown as MapRouteId)).toThrowError(/\[MapEnvironmentRegistry\]/);
      expect(() => getMapEnvironment(undefined as unknown as MapRouteId)).toThrowError(/\[MapEnvironmentRegistry\]/);
    });

    it('debe lanzar un error descriptivo si locationId no está registrado en el catálogo', () => {
      expect(() => getMapEnvironment('non_existent_alien_dimension' as unknown as MapRouteId)).toThrowError(
        /\[MapEnvironmentRegistry\] Entorno no registrado para locationId: "non_existent_alien_dimension"/
      );
    });

    it('no debe recurrir a "route1" silenciosamente cuando la ubicación no existe', () => {
      try {
        getMapEnvironment('ruta_falsa' as unknown as MapRouteId);
        expect.unreachable('Debería haber lanzado un error ruidoso');
      } catch (err: unknown) {
        expect((err as Error).message).toContain('[MapEnvironmentRegistry]');
        expect((err as Error).message).not.toContain('route1');
      }
    });
  });
});
