import { describe, it, expect } from 'vitest';
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts';
import { BaseMapEnvironment } from '@/logic/environment/map/baseMapEnvironment.ts';
import { WEATHER_IDS, requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry.ts';
import { mapVisualToOfficialWeather } from '@/logic/weather/weatherGenerationProvider.ts';
import { ACTIVE_GENERATION } from '@/data/system/constants.ts';
import type { DayPhase } from '@/types/system/time.ts';
import type { MapRouteId } from '@/data/world/map-assets.ts';

describe('Map Environment Class Architecture & Weather Immunization Matrix (RED -> GREEN)', () => {
  const FORBIDDEN_MAP_TYPES = [
    { label: 'Cueva (Mt. Moon)', locationId: 'mt_moon', options: { isCave: true } },
    { label: 'Cueva (Diglett Cave)', locationId: 'diglett_cave', options: { isCave: true } },
    { label: 'Interior / Edificio (Power Plant)', locationId: 'power_plant', options: { isIndoors: true } },
    { label: 'Interior / Edificio (Pokemon Tower)', locationId: 'pokemon_tower', options: { isIndoors: true } },
    { label: 'Gimnasio por ID (Pewter Gym)', locationId: 'pewter_city', options: { isGym: true, gymId: 'pewter' as const } },
    { label: 'Gimnasio por ID (Cerulean Gym)', locationId: 'cerulean_city', options: { isGym: true, gymId: 'cerulean' as const } },
    { label: 'Gimnasio genérico (locationId: gym)', locationId: 'gym', options: { isGym: true } },
    { label: 'Estadio PvP (locationId: pvp)', locationId: 'pvp', options: { isPvP: true } }
  ] as const;

  const PERMITTED_MAP_TYPES = [
    { label: 'Ruta Exterior (Ruta 1)', locationId: 'route1', options: {} },
    { label: 'Ruta Exterior (Bosque Viridian)', locationId: 'forest', options: {} },
    { label: 'Ciudad Exterior (Pueblo Paleta)', locationId: 'pallet_town', options: {} }
  ] as const;

  describe('1. Matriz Exhaustiva de Climas Prohibidos (Cero Fugas)', () => {
    for (const mapTarget of FORBIDDEN_MAP_TYPES) {
      describe(`Entorno: ${mapTarget.label}`, () => {
        it('debe declarar isWeatherAllowed() como false e inmutabilidad garantizada', () => {
          const env = getMapEnvironment(mapTarget.locationId, mapTarget.options);
          expect(env).toBeInstanceOf(BaseMapEnvironment);
          expect(env.isWeatherAllowed()).toBe(false);
          expect(Object.isFrozen(env)).toBe(true);
        });

        // Test absolutamente todos los 22 climas para este entorno cerrado
        for (const weather of WEATHER_IDS) {
          it(`debe suprimir completamente el clima "${weather}" devolviendo type: "none" y visual: "clear"`, () => {
            const env = getMapEnvironment(mapTarget.locationId, mapTarget.options);
            const resolved = env.resolveCombatWeather(weather as WeatherId);
            expect(resolved).toEqual({
              type: 'none',
              visual: 'clear',
              turns: -1
            });
          });
        }
      });
    }
  });

  describe('2. Matriz Exhaustiva de Climas Permitidos en Rutas Exteriores', () => {
    for (const mapTarget of PERMITTED_MAP_TYPES) {
      describe(`Entorno Exterior: ${mapTarget.label}`, () => {
        it('debe declarar isWeatherAllowed() como true e inmutabilidad garantizada', () => {
          const env = getMapEnvironment(mapTarget.locationId, mapTarget.options);
          expect(env).toBeInstanceOf(BaseMapEnvironment);
          expect(env.isWeatherAllowed()).toBe(true);
          expect(Object.isFrozen(env)).toBe(true);
        });

        for (const weather of WEATHER_IDS) {
          it(`debe resolver y aceptar el clima exterior "${weather}" preservando visual y mapeando a Showdown`, () => {
            const env = getMapEnvironment(mapTarget.locationId, mapTarget.options);
            const resolved = env.resolveCombatWeather(weather as WeatherId);
            if (weather === 'none' || weather === 'clear' || weather === 'null') {
              expect(resolved.type).toBe('none');
              expect(resolved.visual).toBe('clear');
            } else {
              expect(resolved.visual).toBe(weather);
              // Showdown mapping is verified against the official generation mapping converted to canonical WeatherId
              const expectedOfficial = mapVisualToOfficialWeather(weather as WeatherId, ACTIVE_GENERATION);
              expect(resolved.type).toBe(requireWeatherId(expectedOfficial));
            }
          });
        }
      });
    }
  });

  describe('3. Ciclos de Iluminación y Horarios Encapsulados', () => {
    const CYCLES: readonly DayPhase[] = ['morning', 'day', 'dusk', 'night'] as const;

    it('Gimnasios y PvP deben forzar iluminación fija diurna ("day") independientemente del ciclo exterior', () => {
      const gymEnv = getMapEnvironment('pewter_city', { isGym: true, gymId: 'pewter' });
      const pvpEnv = getMapEnvironment('pvp', { isPvP: true });

      for (const cycle of CYCLES) {
        expect(gymEnv.resolveEffectiveLighting(cycle)).toBe('day');
        expect(pvpEnv.resolveEffectiveLighting(cycle)).toBe('day');
      }
    });

    it('Cuevas deben forzar iluminación fija nocturna / oscura ("night") independientemente del ciclo exterior', () => {
      const caveEnv = getMapEnvironment('mt_moon', { isCave: true });
      for (const cycle of CYCLES) {
        expect(caveEnv.resolveEffectiveLighting(cycle)).toBe('night');
      }
    });

    it('Rutas exteriores deben respetar la iluminación dinámica del mundo', () => {
      const routeEnv = getMapEnvironment('route1', {});
      for (const cycle of CYCLES) {
        expect(routeEnv.resolveEffectiveLighting(cycle)).toBe(cycle);
      }
    });

    it('debe exponer getSupportedCycles() coherentes para cada tipo de entorno', () => {
      const gymEnv = getMapEnvironment('pewter_city', { isGym: true, gymId: 'pewter' });
      const caveEnv = getMapEnvironment('mt_moon', { isCave: true });
      const indoorEnv = getMapEnvironment('power_plant', { isIndoors: true });
      const routeEnv = getMapEnvironment('route1', {});

      expect(gymEnv.getSupportedCycles().length).toBeGreaterThanOrEqual(1);
      expect(caveEnv.getSupportedCycles().length).toBeGreaterThanOrEqual(1);
      expect(indoorEnv.getSupportedCycles().length).toBeGreaterThanOrEqual(1);
      expect(routeEnv.getSupportedCycles().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Mandato de Cero Fallbacks y Errores Ruidosos (Fail Loudly)', () => {
    it('debe lanzar un error descriptivo inmediato si locationId está vacío o es nulo', () => {
      expect(() => getMapEnvironment('' as unknown as MapRouteId, {})).toThrowError(/\[MapEnvironmentRegistry\]/);
      expect(() => getMapEnvironment(null as unknown as MapRouteId, {})).toThrowError(/\[MapEnvironmentRegistry\]/);
      expect(() => getMapEnvironment(undefined as unknown as MapRouteId, {})).toThrowError(/\[MapEnvironmentRegistry\]/);
    });

    it('debe lanzar un error descriptivo si locationId no está registrado en el catálogo', () => {
      expect(() => getMapEnvironment('non_existent_alien_dimension' as unknown as MapRouteId, {})).toThrowError(
        /\[MapEnvironmentRegistry\] Entorno no registrado para locationId: "non_existent_alien_dimension"/
      );
    });

    it('no debe recurrir a "route1" silenciosamente cuando la ubicación no existe', () => {
      try {
        getMapEnvironment('ruta_falsa' as unknown as MapRouteId, {});
        expect.unreachable('Debería haber lanzado un error ruidoso');
      } catch (err: unknown) {
        expect((err as Error).message).toContain('[MapEnvironmentRegistry]');
        expect((err as Error).message).not.toContain('route1');
      }
    });
  });

  describe('5. Flexibilidad de Modos: PvP en Cualquier Mapa', () => {
    it('PvP en el Estadio Gimnasio ("gym") debe adoptar las reglas del gimnasio (clima prohibido, luz diurna)', () => {
      const env = getMapEnvironment('gym', { isPvP: true });
      expect(env.isWeatherAllowed()).toBe(false);
      expect(env.resolveCombatWeather('rain' as WeatherId)).toEqual({ type: 'none', visual: 'clear', turns: -1 });
      expect(env.resolveEffectiveLighting('night')).toBe('day');
    });

    it('PvP en una Cueva ("mt_moon") debe adoptar las reglas de la cueva (clima prohibido, oscuridad)', () => {
      const env = getMapEnvironment('mt_moon', { isPvP: true });
      expect(env.isWeatherAllowed()).toBe(false);
      expect(env.isCave()).toBe(true);
      expect(env.resolveCombatWeather('fog' as WeatherId)).toEqual({ type: 'none', visual: 'clear', turns: -1 });
      expect(env.resolveEffectiveLighting('day')).toBe('night');
    });

    it('PvP en Ruta 1 ("route1") debe adoptar las reglas de la ruta (clima permitido, iluminación dinámica)', () => {
      const env = getMapEnvironment('route1', { isPvP: true });
      expect(env.isWeatherAllowed()).toBe(true);
      expect(env.resolveCombatWeather('rain' as WeatherId).visual).toBe('rain');
      expect(env.resolveEffectiveLighting('night')).toBe('night');
      expect(env.resolveEffectiveLighting('morning')).toBe('morning');
    });
  });
});
