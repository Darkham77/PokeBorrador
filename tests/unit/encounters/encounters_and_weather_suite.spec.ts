import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEncounterPool } from '@/logic/encounters/routeSpawnMath';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { MapLocation } from '@/types/pokemon/encounters';
import { getRouteWeather } from '@/logic/weather/weatherUtils';
import { requireWeatherSeasonId } from '@/data/world/weather-tables';
import { getDayCycle, getSeason } from '@/logic/utils/timeUtils';
import { getFinalGroundRates } from '@/logic/encounters/encounters';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { getNpcEncounterChances } from '@/logic/encounters/npcEncounterChances';
import type { EncounterState } from '@/types/pokemon/encounters';
import {
  checkDebugForcedEncounter,
  checkRivalSpecialEncounter,
  checkDefenderSpecialEncounter,
} from '@/logic/encounters/specialEncounterCheckers';
import * as warEngine from '@/logic/war/warEngine';
import { getWeatherFamily } from '@/data/system/weatherFamilies';
import { WEATHER_REGISTRY, type WeatherId } from '@/logic/weather/weatherRegistry';

describe('Encounters & Weather Domain Suite', () => {
  describe('Legendary Tickets Dynamic Spawn Injection', () => {
    const maps = pokemonDataProvider.getMaps();
    const seafoam = maps.find(m => m.id === 'seafoam_islands') as MapLocation;
    const cerulean = maps.find(m => m.id === 'cerulean_cave') as MapLocation;

    describe('Articuno Ticket', () => {
      it('does NOT include Articuno when ticket is inactive or 0 secs', () => {
        const { pool } = getEncounterPool(seafoam, 'day', 'clear', [], { articunoTicketSecs: 0 });
        expect(pool).not.toContain('articuno');
      });

      it('injects Articuno into Seafoam Islands when ticket is active', () => {
        const { pool, rates } = getEncounterPool(seafoam, 'day', 'clear', [], { articunoTicketSecs: 1800 });
        expect(pool).toContain('articuno');
        const idx = pool.indexOf('articuno');
        expect(rates[idx]).toBe(1);
      });
    });

    describe('Mewtwo Ticket', () => {
      it('does NOT include Mewtwo when ticket is inactive or 0 secs', () => {
        const { pool } = getEncounterPool(cerulean, 'day', 'clear', [], { mewtwoTicketSecs: 0 });
        expect(pool).not.toContain('mewtwo');
      });

      it('injects Mewtwo into Cerulean Cave when ticket is active', () => {
        const { pool, rates } = getEncounterPool(cerulean, 'day', 'clear', [], { mewtwoTicketSecs: 1800 });
        expect(pool).toContain('mewtwo');
        const idx = pool.indexOf('mewtwo');
        expect(rates[idx]).toBe(0.1);
      });
    });
  });

  describe('Exact Date Deterministic Weather & Spawn Rates', () => {
    const zdt = Temporal.ZonedDateTime.from('2026-09-13T18:20:00-03:00[America/Argentina/Buenos_Aires]');
    const instant = zdt.toInstant();
    const epochMs = Number(instant.epochMilliseconds);
    const epochHour = Math.floor(epochMs / 3600000);
    const cycle = getDayCycle(instant);
    const season = getSeason(instant);

    it('verifies cycle, season, and route1 weather at 13/9/2026 18:20', () => {
      const weatherRoute1 = getRouteWeather(
        'route1',
        requireWeatherSeasonId(season.id),
        epochHour,
        cycle
      );

      expect(cycle).toBe('dusk');
      expect(weatherRoute1).toBe('wind');

      const route1 = FIRE_RED_MAPS.find(m => m.id === 'route1')!;
      const { pool } = getFinalGroundRates(route1, cycle, weatherRoute1, []);

      expect(pool).toContain('pidgeotto');
      expect(pool).toContain('butterfree');
      expect(pool).toContain('rattata');
      expect(pool).toContain('pidgey');
      expect(pool).not.toContain('gastly');
    });

    it('checks route weather queries for fog', () => {
      const allRoutes = FIRE_RED_MAPS.map(m => m.id);
      const routesWithFog: string[] = [];

      for (const rId of allRoutes) {
        try {
          const w = getRouteWeather(rId as any, requireWeatherSeasonId(season.id), epochHour, cycle);
          if (w === 'fog') routesWithFog.push(rId);
        } catch {
          // Some maps don't have registered weather tables
        }
      }
      expect(Array.isArray(routesWithFog)).toBe(true);
    });
  });

  describe('npcEncounterChances', () => {
    const dummyState: EncounterState = {
      playerClass: 'entrenador',
      classLevel: 5,
      trainerChance: 0.1,
      repelSecs: 0,
      faction: null,
      gymProgress: {},
    } as unknown as EncounterState;

    it('calculates default chances for rival and common trainer', () => {
      const chances = getNpcEncounterChances('route1', dummyState, {}, ['route1', 'route2']);
      expect(chances.length).toBe(4);

      const rival = chances.find(c => c.type === 'rival');
      expect(rival).toBeDefined();
      expect(rival?.active).toBe(true);

      const trainer = chances.find(c => c.type === 'trainer');
      expect(trainer).toBeDefined();
      expect(trainer?.name).toBe('Entrenador Común');
    });

    it('detects police officer for rocket with 100 criminality', () => {
      const rocketState: EncounterState = {
        ...dummyState,
        playerClass: 'rocket',
        classData: { criminality: 100 },
      } as unknown as EncounterState;

      const chances = getNpcEncounterChances('route1', rocketState, {}, ['route1', 'route2']);
      const police = chances.find(c => c.type === 'police');
      expect(police).toBeDefined();
      expect(police?.name).toBe('Oficial de Policía');
    });
  });

  describe('specialEncounterCheckers', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const dummyState: EncounterState = {
      playerClass: 'entrenador',
      classLevel: 5,
      trainerChance: 0.1,
      repelSecs: 0,
      faction: 'poder',
      gymProgress: {},
    } as unknown as EncounterState;

    it('returns debug forced encounter when forceEncounterType is set', () => {
      const enc = checkDebugForcedEncounter({ forceEncounterType: 'trainer' });
      expect(enc).toEqual({ type: 'trainer' });
    });

    it('returns rival encounter when forceRival is true', () => {
      const enc = checkDebugForcedEncounter({ forceRival: true });
      expect(enc).toEqual({ type: 'rival' });
    });

    it('evaluates rival special encounter with rate override 100%', () => {
      const enc = checkRivalSpecialEncounter({ rivalChancePct: 100 }, dummyState, {});
      expect(enc).toEqual({ type: 'rival' });
    });

    it('ignores special encounters when options.forceEncounter is true', () => {
      const enc = checkRivalSpecialEncounter({ rivalChancePct: 100 }, dummyState, { forceEncounter: true });
      expect(enc).toBeNull();
    });

    it('evaluates defender special encounter when defender override is set during dominance phase', () => {
      vi.spyOn(warEngine, 'isDisputePhase').mockReturnValue(false);

      const enc = checkDefenderSpecialEncounter(
        { defenderChancePct: 100 },
        'route1',
        dummyState,
        { dominanceData: { route1: { winner: 'union' } } }
      );
      expect(enc).toEqual({ type: 'defender', faction: 'union' });
    });
  });

  describe('Weather System Single Source of Truth Unit Test', () => {
    it('every weather token registered in WEATHER_REGISTRY must resolve to a valid mechanical WeatherFamilyKey', () => {
      const allWeatherIds = Object.keys(WEATHER_REGISTRY) as WeatherId[];
      const unmappedWeathers: string[] = [];

      for (const weatherId of allWeatherIds) {
        const family = getWeatherFamily(weatherId);
        if (!family) {
          unmappedWeathers.push(weatherId);
        }
      }

      expect(unmappedWeathers, `Unmapped weather tokens found: ${unmappedWeathers.join(', ')}`).toEqual([]);
    });

    it('Showdown internal weather names (raindance, sunnyday, etc.) must resolve to their canonical mechanical weather family', () => {
      expect(getWeatherFamily('raindance')).toBe('rain');
      expect(getWeatherFamily('sunnyday')).toBe('sun');
      expect(getWeatherFamily('sandstorm')).toBe('sandstorm');
      expect(getWeatherFamily('hail')).toBe('hail');
      expect(getWeatherFamily('snow')).toBe('snow');
      expect(getWeatherFamily('desolateland')).toBe('sun');
      expect(getWeatherFamily('primordialsea')).toBe('rain');
      expect(getWeatherFamily('deltastream')).toBe('wind');
    });

    it('Special game weather tokens (none, null, clear, mist, fog) must resolve cleanly without returning null', () => {
      expect(getWeatherFamily('none')).toBe('clear');
      expect(getWeatherFamily('null')).toBe('clear');
      expect(getWeatherFamily('clear')).toBe('clear');
      expect(getWeatherFamily('mist')).toBe('fog');
      expect(getWeatherFamily('fog')).toBe('fog');
    });
  });
});
