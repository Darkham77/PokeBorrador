import { describe, it, expect } from 'vitest';
import { FIRE_RED_MAPS, VISIBLE_WORLD_MAPS, getMapLocationById } from '@/data/world/maps.ts';
import { hasMapEncounterSpawns, isMapVisibleInWorld } from '@/logic/encounters/encounterHelpers.ts';
import { generateEncounter } from '@/logic/encounters/encounters.ts';
import type { EncounterState, MapLocation } from '@/types/pokemon/encounters.ts';

describe('Map Visibility and Encounter Pool Integrity', () => {
  it('should mark stadium as not visible in world map and having zero encounter spawns', () => {
    const stadium = getMapLocationById('stadium');
    expect(stadium.visibleInWorldMap).toBe(false);
    expect(hasMapEncounterSpawns(stadium)).toBe(false);
    expect(isMapVisibleInWorld(stadium)).toBe(false);
  });

  it('should maintain exact parity between VISIBLE_WORLD_MAPS and isMapVisibleInWorld filter', () => {
    expect(VISIBLE_WORLD_MAPS.length).toBe(27);
    expect(VISIBLE_WORLD_MAPS.some(m => m.id === 'stadium')).toBe(false);

    const dynamicallyVisibleIds = FIRE_RED_MAPS.filter(isMapVisibleInWorld).map(m => m.id);
    const visibleWorldMapIds = VISIBLE_WORLD_MAPS.map(m => m.id);
    expect(dynamicallyVisibleIds.length).toBe(VISIBLE_WORLD_MAPS.length);
    expect(visibleWorldMapIds).toEqual(dynamicallyVisibleIds);
  });

  it('should ensure all 27 exploration routes and caves have encounter spawns and are visible', () => {
    const wildMaps = FIRE_RED_MAPS.filter(m => m.id !== 'stadium');
    expect(wildMaps.length).toBe(27);

    for (const map of wildMaps) {
      expect(
        hasMapEncounterSpawns(map),
        `El mapa de exploración "${map.id}" (${map.name}) debería tener tablas de encuentros o spawns`
      ).toBe(true);
      expect(
        isMapVisibleInWorld(map),
        `El mapa de exploración "${map.id}" (${map.name}) debería ser visible en el mapa de juego`
      ).toBe(true);
    }
  });

  it('should resolve legacy gym id to canonical stadium location', () => {
    const fromGym = getMapLocationById('gym');
    const fromStadium = getMapLocationById('stadium');
    expect(fromGym).toBe(fromStadium);
    expect(fromGym.id).toBe('stadium');
  });

  it('should safely return null for generateEncounter in stadium without throwing empty pool error', async () => {
    const dummyState: EncounterState = {
      team: [],
      repelSecs: 0,
      incenseSecs: 0,
      incenseType: null,
      playerClass: 'entrenador',
      classData: {},
      faction: 'union',
      pickaxeSecs: 0,
      brushSecs: 0
    };

    const encounter = await generateEncounter('stadium', dummyState);
    expect(encounter).toBeNull();
  });

  it('should correctly evaluate visibility edge cases for synthetic map configurations', () => {
    const hiddenWithSpawns: MapLocation = {
      id: 'route1',
      name: 'Ruta Oculta',
      icon: '🌿',
      desc: 'Oculta manualmente',
      visibleInWorldMap: false,
      wild: { day: ['pidgey'] },
      lv: [2, 4]
    };
    expect(hasMapEncounterSpawns(hiddenWithSpawns)).toBe(true);
    expect(isMapVisibleInWorld(hiddenWithSpawns)).toBe(false);

    const visibleWithoutSpawns: MapLocation = {
      id: 'route2',
      name: 'Ruta Vacía',
      icon: '🌿',
      desc: 'Sin pokémon',
      visibleInWorldMap: true,
      wild: { day: [] },
      lv: [1, 1]
    };
    expect(hasMapEncounterSpawns(visibleWithoutSpawns)).toBe(false);
    expect(isMapVisibleInWorld(visibleWithoutSpawns)).toBe(false);

    const fishingOnlyMap: MapLocation = {
      id: 'route4',
      name: 'Muelle de Pesca',
      icon: '🎣',
      desc: 'Solo pesca',
      fishing: { pool: ['magikarp'], rates: [100], lv: [5, 10] },
      lv: [5, 10]
    };
    expect(hasMapEncounterSpawns(fishingOnlyMap)).toBe(true);
    expect(isMapVisibleInWorld(fishingOnlyMap)).toBe(true);

    const weatherOnlyMap: MapLocation = {
      id: 'route9',
      name: 'Cumbre Nubosa',
      icon: '☁️',
      desc: 'Solo visitantes de clima',
      weather: {
        rain: { visitors: ['castform'] }
      },
      lv: [15, 20]
    };
    expect(hasMapEncounterSpawns(weatherOnlyMap)).toBe(true);
    expect(isMapVisibleInWorld(weatherOnlyMap)).toBe(true);
  });
});
