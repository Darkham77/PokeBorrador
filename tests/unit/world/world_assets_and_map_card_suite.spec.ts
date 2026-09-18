/**
 * tests/unit/world/world_assets_and_map_card_suite.spec.ts
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import fs from 'node:fs';
import path from 'node:path';

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import * as resolver from '@/logic/utils/assetResolver';
import { normalizeFaction, checkPlayerWinner, calculateSpawnGrid, isMapExtortable } from '@/logic/map/mapCardHelper';
import MapCard from '@/components/map/MapCard.vue';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { useMapStore } from '@/stores/map';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getMapBiomeAndTags } from '@/logic/battle/biomeHelper';
import { restoreFossil } from '@/logic/items/fossilEngine';
import { getNpcEncounterChances } from '@/logic/weather/weatherUtils';

// Mock vue-router for MapCard navigation
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Global mock for ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Global mock for IntersectionObserver to simulate visibility in tests
global.IntersectionObserver = class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly scrollMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback) {
    callback([{ isIntersecting: true } as IntersectionObserverEntry], this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

interface MapCardInstance {
  processedGuardian: {
    name: string;
    isSeen: boolean;
    isCaught: boolean;
    typeInfo: string;
  };
  processedGrid: Array<{
    id: string;
    isSeen: boolean;
    isCaught: boolean;
    name: string;
  }>;
}

describe('World Domain: Assets, Map Card & World Helpers Suite', () => {
  describe('AssetService & Resolver', () => {
    beforeEach(() => {
      vi.stubGlobal('innerWidth', 1200);
      vi.clearAllMocks();
    });

    describe('AssetService: Pokemon Routing', () => {
      it('debe resolver sprites base desde PokeAPI usando el mapeo interno (localizado)', () => {
        expect(getAssetUrl(ASSET_TYPES.POKEMON, 'bulbasaur'))
          .toBe('/assets/sprites/pokemon/static/1.webp');
      });

      it('debe soportar variantes Shiny (localizado)', () => {
        expect(getAssetUrl(ASSET_TYPES.POKEMON, 'pikachu', { isShiny: true }))
          .toBe('/assets/sprites/pokemon/static/shiny/25.webp');
      });

      it('debe soportar variantes de espalda (Back) (localizado)', () => {
        expect(getAssetUrl(ASSET_TYPES.POKEMON, 'mew', { isBack: true }))
          .toBe('/assets/sprites/pokemon/static/back/151.webp');
      });

      it('debe combinar Shiny + Back correctamente (localizado)', () => {
        expect(getAssetUrl(ASSET_TYPES.POKEMON, 'charizard', { isShiny: true, isBack: true }))
          .toBe('/assets/sprites/pokemon/static/back/shiny/6.webp');
      });

      it('debe manejar huevos como ítems especiales (localizado)', () => {
        expect(getAssetUrl(ASSET_TYPES.POKEMON, 'egg_water'))
          .toBe('/assets/sprites/egg.webp');
      });
    });

    describe('AssetService: Map Routing', () => {
      it('debe resolver mapas normales', () => {
        expect(getAssetUrl(ASSET_TYPES.MAP, 'ruta1', { cycle: 'day' }))
          .toBe('/assets/maps/ruta1_dia.webp');
      });

      it('debe agregar el sufijo _mobile si isLowPower está activo', () => {
        expect(getAssetUrl(ASSET_TYPES.MAP, 'ruta1', { cycle: 'day', isLowPower: true }))
          .toBe('/assets/maps/ruta1_dia_mobile.webp');
      });
    });

    describe('AssetService: Item Routing', () => {
      it('debe resolver la URL del sprite a partir de su ID de ítem en inglés o ruta relativa', () => {
        expect(getAssetUrl(ASSET_TYPES.ITEM, 'superpotion'))
          .toBe('/assets/sprites/crafting/tier3/superpotion.webp');
        expect(getAssetUrl(ASSET_TYPES.ITEM, 'healthmochi'))
          .toBe('/assets/sprites/crafting/tier3/healthmochi.webp');
        expect(getAssetUrl(ASSET_TYPES.ITEM, 'crafting/tier0/coalore'))
          .toBe('/assets/sprites/crafting/tier0/coalore.webp');
      });

      it('debe devolver la ruta estándar en tier3 si no está en SHOP_ITEMS', () => {
        expect(getAssetUrl(ASSET_TYPES.ITEM, 'custom_item'))
          .toBe('/assets/sprites/crafting/tier3/custom_item.webp');
      });
    });

    describe('AssetService: Trainer Routing', () => {
      it('debe usar activos locales para líderes de gimnasio (anteriormente externos)', () => {
        expect(getAssetUrl(ASSET_TYPES.TRAINER, 'brock'))
          .toBe('/assets/sprites/npc/brock.webp');
      });

      it('debe usar activos locales para otros entrenadores (sin LOD)', () => {
        vi.stubGlobal('innerWidth', 400);
        expect(getAssetUrl(ASSET_TYPES.TRAINER, 'hero'))
          .toBe('/assets/sprites/npc/hero.webp');
      });
    });

    describe('AssetService: Raw URLs and Test Paths', () => {
      it('debe devolver la URL o ruta intacta si empieza con http, data:, o /test aventura/', () => {
        expect(getAssetUrl(ASSET_TYPES.MAP, 'https://example.com/image.png')).toBe('https://example.com/image.png');
        expect(getAssetUrl(ASSET_TYPES.POKEMON, 'data:image/png;base64,123')).toBe('data:image/png;base64,123');
        expect(getAssetUrl(ASSET_TYPES.MAP, '/test aventura/imagenes/Pallet_Town_FRLG.png')).toBe('/test aventura/imagenes/Pallet_Town_FRLG.png');
      });
    });

    describe('AssetResolver', () => {
      it('no debe devolver sufijo independientemente del ancho', () => {
        vi.stubGlobal('innerWidth', 400);
        expect(resolver.getResolutionSuffix()).toBe('');
        
        vi.stubGlobal('innerWidth', 1200);
        expect(resolver.getResolutionSuffix()).toBe('');
      });

      it('debe devolver la URL original codificada', () => {
        const url = '/assets/maps/ruta 1.webp';
        expect(resolver.resolveAsset(url)).toBe('/assets/maps/ruta%201.webp');
      });
    });
  });

  describe('MapCard Helper Logic', () => {
    describe('normalizeFaction', () => {
      it('should normalize Spanish and English faction names', () => {
        expect(normalizeFaction('PODER')).toBe('power');
        expect(normalizeFaction('power')).toBe('power');
        expect(normalizeFaction('UNIÓN')).toBe('union');
        expect(normalizeFaction('union')).toBe('union');
        expect(normalizeFaction('Neutral')).toBe('neutral');
        expect(normalizeFaction(null)).toBe('');
      });
    });

    describe('checkPlayerWinner', () => {
      it('should return true when factions match (any language)', () => {
        expect(checkPlayerWinner('power', 'poder')).toBe(true);
        expect(checkPlayerWinner('union', 'UNIÓN')).toBe(true);
        expect(checkPlayerWinner('poder', 'power')).toBe(true);
      });

      it('should return false when factions do not match', () => {
        expect(checkPlayerWinner('power', 'union')).toBe(false);
        expect(checkPlayerWinner('none', 'power')).toBe(false);
        expect(checkPlayerWinner(null, 'power')).toBe(false);
      });
    });

    describe('calculateSpawnGrid', () => {
      it('should return 2x3 grid for small counts (<= 6)', () => {
        const grid = calculateSpawnGrid(4);
        expect(grid.rows).toBe(2);
        expect(grid.cols).toBe(3);
        expect(grid.totalSlots).toBe(6);
      });

      it('should return dynamic grid for larger counts', () => {
        const grid9 = calculateSpawnGrid(9);
        expect(grid9.rows).toBe(3);
        expect(grid9.cols).toBe(3);

        const grid10 = calculateSpawnGrid(10);
        expect(grid10.cols).toBe(4);
        expect(grid10.rows).toBe(3);
        expect(grid10.totalSlots).toBe(12);
      });
      
      it('should handle zero spawns', () => {
        const grid = calculateSpawnGrid(0);
        expect(grid.totalSlots).toBe(0);
      });
    });

    describe('isMapExtortable', () => {
      it('should return true for a valid wild encounter map like route or forest', () => {
        const mockMap = {
          id: 'route1',
          name: 'Bosque Viridian',
          wild: { morning: ['pikachu'] }
        };
        expect(isMapExtortable(mockMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(true);
      });

      it('should return false for cities, gyms, and leagues', () => {
        const cityMap = { id: 'pallet_town', wild: { morning: ['pikachu'] } };
        const gymMap = { id: 'pewter_gym', wild: { morning: ['pikachu'] } };
        const leagueMap = { id: 'indigo_plateau_league', wild: { morning: ['pikachu'] } };
        
        expect(isMapExtortable(cityMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false);
        expect(isMapExtortable(gymMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false);
        expect(isMapExtortable(leagueMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false);
      });

      it('should return false if map has no wild spawns', () => {
        const noWildMap = { id: 'route1', wild: {} };
        expect(isMapExtortable(noWildMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false);
      });
    });
  });

  describe('MapCard Discovery Logic', () => {
    let uiStore: ReturnType<typeof useUIStore>;
    let gameStore: ReturnType<typeof useGameStore>;
    let pokeDataSpy: ReturnType<typeof vi.spyOn> | null = null;

    beforeEach(() => {
      setActivePinia(createPinia());
      uiStore = useUIStore();
      gameStore = useGameStore();
      
      gameStore.state = {
        pokedex: [] as string[],
        seenPokedex: [] as string[],
        faction: 'power'
      } as unknown as typeof gameStore.state;

      pokeDataSpy = vi.spyOn(pokemonDataProvider, 'getPokemonData').mockImplementation((id: string) => ({
        id,
        name: id.toUpperCase(),
        type: 'normal'
      } as unknown as ReturnType<typeof pokemonDataProvider.getPokemonData>));
    });

    afterEach(() => {
      if (pokeDataSpy) {
        pokeDataSpy.mockRestore();
        pokeDataSpy = null;
      }
      vi.restoreAllMocks();
    });

    const defaultProps = {
      map: { id: 'route1', name: 'Route 1', lv: 1 },
      dominance: {
        guardian: { id: 'pidgey', captured: false },
        winner: 'neutral'
      },
      spawnPool: { generic: ['pidgey', 'rattata'], specific: [] as string[], rates: {} as Record<string, number> }
    };

    it('renders guardian as silhouette if not seen', async () => {
      const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] });
      await wrapper.vm.$nextTick();
      const guardianImg = wrapper.find('.guardian-mini-sprite');
      const vm = wrapper.vm as unknown as MapCardInstance;
      
      expect(guardianImg.classes()).toContain('spawn-silhouette');
      expect(vm.processedGuardian.name).toBe('Desconocido');
    });

    it('reveals guardian name and sprite if seen in combat (but not caught)', async () => {
      const guardianId = requirePokemonSpeciesId(defaultProps.dominance.guardian.id);
      gameStore.state.seenPokedex = [guardianId];
      gameStore.state.pokedex = [];
      
      const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] });
      const vm = wrapper.vm as unknown as MapCardInstance;
      
      expect(vm.processedGuardian.isSeen).toBe(true);
      expect(vm.processedGuardian.name).toBe(guardianId.toUpperCase());
      expect(vm.processedGuardian.typeInfo).toContain('NORMAL');
    });

    it('shows ??? if never seen', async () => {
      gameStore.state.seenPokedex = [];
      gameStore.state.pokedex = [];
      
      const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] });
      const vm = wrapper.vm as unknown as MapCardInstance;
      
      expect(vm.processedGuardian.isSeen).toBe(false);
      expect(vm.processedGuardian.name).toBe('Desconocido');
    });

    it('reveals info but keeps silhouettes in "seen" debug mode', async () => {
      uiStore.debugPokedexMode = 'seen';
      const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] });
      await wrapper.vm.$nextTick();
      const guardianImg = wrapper.find('.guardian-mini-sprite');
      const vm = wrapper.vm as unknown as MapCardInstance;
      
      expect(guardianImg.classes()).toContain('spawn-silhouette');
      expect(vm.processedGuardian.name).toBe('PIDGEY');
      
      const spawns = vm.processedGrid.filter((s: { id: string }) => s.id);
      expect(spawns[0]!.isSeen).toBe(true);
      expect(spawns[0]!.isCaught).toBe(false);
      expect(spawns[0]!.name).not.toBe('Desconocido');
    });

    it('removes silhouettes and adds badges in "caught" debug mode', async () => {
      uiStore.debugPokedexMode = 'caught';
      const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] });
      await wrapper.vm.$nextTick();
      const guardianImg = wrapper.find('.guardian-mini-sprite');
      const vm = wrapper.vm as unknown as MapCardInstance;
      
      expect(guardianImg.classes()).not.toContain('spawn-silhouette');
      expect(vm.processedGuardian.isCaught).toBe(true);
      
      const spawns = vm.processedGrid.filter((s: { id: string }) => s.id);
      expect(spawns[0]!.isCaught).toBe(true);
    });
  });

  describe('World Helpers & Subsystems', () => {
    describe('biomeHelper - getMapBiomeAndTags', () => {
      it('should return default biome and empty tags if location does not exist', () => {
        const res = getMapBiomeAndTags('non-existent-location' as unknown as import('@/data/world/map-assets').MapRouteId);
        expect(res.activeBiome).toBe('isPlains');
        expect(res.mapTags).toEqual([]);
      });

      it('should resolve correct biome from map data hierarchy', () => {
        const plainsRes = getMapBiomeAndTags('route1');
        expect(plainsRes.activeBiome).toBeDefined();
        expect(Array.isArray(plainsRes.mapTags)).toBe(true);
      });
    });

    describe('Fossil Engine', () => {
      beforeEach(() => {
        const storage: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
          getItem: vi.fn((key: string) => (storage[key] as string | undefined) || null),
          setItem: vi.fn((key: string, val: string | number) => { storage[key] = val.toString(); }),
          clear: vi.fn(() => { for (const k in storage) delete storage[k]; })
        });
        setActivePinia(createPinia());
      });

      it('should restore a fossil and add it to the team if there is space', () => {
        const state = {
          team: [],
          box: [],
          pokedex: [],
          seenPokedex: []
        };

        const result = restoreFossil('omanyte', state as unknown as Parameters<typeof restoreFossil>[1]);
        
        expect(result.pokemon.id).toBe('omanyte');
        expect(result.pokemon.level).toBe(1);
        expect(result.sentTo).toBe('team');
        expect(state.team.length).toBe(1);
        expect(state.pokedex).toContain('omanyte');
      });

      it('should send restored pokemon to box if team is full', () => {
        const state = {
          team: [{}, {}, {}, {}, {}, {}],
          box: [],
          pokedex: [],
          seenPokedex: []
        };

        const result = restoreFossil('aerodactyl', state as unknown as Parameters<typeof restoreFossil>[1]);
        
        expect(result.sentTo).toBe('box');
        expect(state.box.length).toBe(1);
        expect(state.team.length).toBe(6);
      });
    });

    describe('Decoupled Battle Weather Flow', () => {
      beforeEach(() => {
        setActivePinia(createPinia());
      });

      it('debe priorizar clima del combate y luego restaurar al clima actual del mapa (avanzando la hora)', () => {
        const mapStore = useMapStore();
        
        const mapWeatherSource = ref('clear');
        mapStore.setGlobalWeather(null);

        const battleState = ref({
          weather: { type: 'clear', visual: 'clear', turns: -1 },
          locationId: 'route1'
        });

        const computedWeather = computed(() => {
          if (battleState.value?.weather && battleState.value.weather.type !== 'clear' && battleState.value.weather.type !== 'none') {
            return battleState.value.weather.visual || battleState.value.weather.type;
          }
          return mapStore.globalWeather || mapWeatherSource.value;
        });

        expect(computedWeather.value).toBe('clear');

        battleState.value.weather = { type: 'rain', visual: 'rain', turns: 5 };
        
        expect(computedWeather.value).toBe('rain');
        expect(mapStore.globalWeather).toBeNull();

        mapWeatherSource.value = 'sandstorm';

        expect(computedWeather.value).toBe('rain');

        battleState.value.weather = { type: 'clear', visual: 'clear', turns: -1 };

        expect(computedWeather.value).toBe('sandstorm');
      });
    });

    describe('AtmosphereLayer Weather Textures Repro', () => {
      it('should verify that weather noise textures exist in public/ and are correctly resolved via assetService', () => {
        const url1 = getAssetUrl(ASSET_TYPES.FX, 'pattern-noise-1');
        const url2 = getAssetUrl(ASSET_TYPES.FX, 'pattern-noise-2');

        expect(url1).toBe('/assets/fx/pattern-noise-1.webp');
        expect(url2).toBe('/assets/fx/pattern-noise-2.webp');

        const publicPath1 = path.resolve(process.cwd(), 'public', url1.replace(/^\//, ''));
        const publicPath2 = path.resolve(process.cwd(), 'public', url2.replace(/^\//, ''));

        expect(fs.existsSync(publicPath1)).toBe(true);
        expect(fs.existsSync(publicPath2)).toBe(true);
      });

      it('AtmosphereLayer component source should not reference nonexistent noise_texture_1.png', () => {
        const componentPath = path.resolve(process.cwd(), 'src/components/common/AtmosphereLayer.vue');
        const source = fs.readFileSync(componentPath, 'utf-8');

        expect(source.includes('noise_texture_1.png')).toBe(false);
        expect(source.includes('noise_texture_2.png')).toBe(false);
        expect(source.includes('pattern-noise-1')).toBe(true);
        expect(source.includes('pattern-noise-2')).toBe(true);
      });
    });

    describe('Npc Encounter Chances', () => {
      it('debe calcular correctamente los chances de entrenador común', () => {
        const state = {
          faction: 'poder' as const,
          trainerChance: 8,
          playerClass: 'entrenador' as const,
          classLevel: 10
        };
        const chances = getNpcEncounterChances('route1', state as unknown as Parameters<typeof getNpcEncounterChances>[1], {}, []);
        const trainerInfo = chances.find(c => c.type === 'trainer');
        expect(trainerInfo).toBeDefined();
        expect(trainerInfo?.chance).toBe(8);
      });

      it('debe calcular los de oficial de policía si es Rocket con criminalidad máxima', () => {
        const state = {
          faction: 'union' as const,
          trainerChance: 5,
          playerClass: 'rocket' as const,
          classLevel: 50,
          classData: { criminality: 120 }
        };
        const chances = getNpcEncounterChances('route1', state as unknown as Parameters<typeof getNpcEncounterChances>[1], {}, []);
        const policeInfo = chances.find(c => c.type === 'police');
        expect(policeInfo).toBeDefined();
        expect(policeInfo?.chance).toBe(12);
      });
    });
  });
});
