import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { mapVisualToOfficialWeather, getLocalizedWeatherName, mapOfficialToVisualWeather } from '@/logic/weather/weatherGenerationProvider';
import { useMapStore } from '@/stores/map';
import { useBattleAtmosphere } from '@/composables/battle/useBattleAtmosphere';
import type { BattleState } from '@/types/battle/battle';

describe('Battle Weather, Field Conditions & Atmosphere Isolation Suite', () => {
  describe('Weather Generation Provider & Format Mappings', () => {
    describe('mapVisualToOfficialWeather', () => {
      it('should map visual climates correctly in Gen 3', () => {
        expect(mapVisualToOfficialWeather('rain', 3)).toBe('raindance');
        expect(mapVisualToOfficialWeather('storm', 3)).toBe('raindance');
        expect(mapVisualToOfficialWeather('heavy_rain', 3)).toBe('raindance');

        expect(mapVisualToOfficialWeather('sun', 3)).toBe('sunnyday');
        expect(mapVisualToOfficialWeather('heatwave', 3)).toBe('sunnyday');
        expect(mapVisualToOfficialWeather('intense_sun', 3)).toBe('sunnyday');

        expect(mapVisualToOfficialWeather('sandstorm', 3)).toBe('sandstorm');
        expect(mapVisualToOfficialWeather('dust_storm', 3)).toBe('sandstorm');

        expect(mapVisualToOfficialWeather('snow', 3)).toBe('hail');
        expect(mapVisualToOfficialWeather('hail', 3)).toBe('hail');
        expect(mapVisualToOfficialWeather('blizzard', 3)).toBe('hail');
        expect(mapVisualToOfficialWeather('cold', 3)).toBe('hail');

        expect(mapVisualToOfficialWeather('fog', 3)).toBe('none');
        expect(mapVisualToOfficialWeather('mist', 3)).toBe('none');

        expect(mapVisualToOfficialWeather('clear', 3)).toBe('none');
        expect(mapVisualToOfficialWeather(null, 3)).toBe('none');
      });

      it('should map visual climates correctly in Gen 6', () => {
        expect(mapVisualToOfficialWeather('rain', 6)).toBe('raindance');
        expect(mapVisualToOfficialWeather('heavy_rain', 6)).toBe('primordialsea');
        expect(mapVisualToOfficialWeather('intense_sun', 6)).toBe('desolateland');
        expect(mapVisualToOfficialWeather('strong_winds', 6)).toBe('deltastream');
        expect(mapVisualToOfficialWeather('snow', 6)).toBe('hail');
        expect(mapVisualToOfficialWeather('fog', 6)).toBe('fog');
        expect(mapVisualToOfficialWeather('mist', 6)).toBe('fog');
        expect(mapVisualToOfficialWeather('clear', 6)).toBe('none');
      });

      it('should map visual climates correctly in Gen 9', () => {
        expect(mapVisualToOfficialWeather('rain', 9)).toBe('raindance');
        expect(mapVisualToOfficialWeather('heavy_rain', 9)).toBe('primordialsea');
        expect(mapVisualToOfficialWeather('intense_sun', 9)).toBe('desolateland');
        expect(mapVisualToOfficialWeather('strong_winds', 9)).toBe('deltastream');
        expect(mapVisualToOfficialWeather('snow', 9)).toBe('snow');
        expect(mapVisualToOfficialWeather('fog', 9)).toBe('fog');
        expect(mapVisualToOfficialWeather('mist', 9)).toBe('fog');
        expect(mapVisualToOfficialWeather('clear', 9)).toBe('none');
      });
    });

    describe('getLocalizedWeatherName', () => {
      it('should translate weather IDs correctly based on generation', () => {
        expect(getLocalizedWeatherName('sunnyday', 3)).toBe('Sol');
        expect(getLocalizedWeatherName('raindance', 3)).toBe('Lluvia');
        expect(getLocalizedWeatherName('sandstorm', 3)).toBe('T. Arena');
        expect(getLocalizedWeatherName('hail', 3)).toBe('Granizo');
        expect(getLocalizedWeatherName('hail', 9)).toBe('Nieve');
        expect(getLocalizedWeatherName('snow', 9)).toBe('Nieve');
        expect(getLocalizedWeatherName('desolateland', 6)).toBe('Sol Abrasador');
        expect(getLocalizedWeatherName('primordialsea', 6)).toBe('Lluvia Torrencial');
        expect(getLocalizedWeatherName('deltastream', 6)).toBe('Turbulencias');
        expect(getLocalizedWeatherName('none', 3)).toBe('Despejado');
        expect(getLocalizedWeatherName('clear', 3)).toBe('Despejado');
      });
    });

    describe('mapOfficialToVisualWeather', () => {
      it('should translate Showdown weather IDs back to visual environmental weather types', () => {
        expect(mapOfficialToVisualWeather('raindance', 3)).toBe('rain');
        expect(mapOfficialToVisualWeather('SunnyDay', 3)).toBe('sun');
        expect(mapOfficialToVisualWeather('sandstorm', 3)).toBe('sandstorm');
        expect(mapOfficialToVisualWeather('hail', 3)).toBe('hail');
        expect(mapOfficialToVisualWeather('hail', 9)).toBe('snow');
        expect(mapOfficialToVisualWeather('snow', 9)).toBe('snow');
        expect(mapOfficialToVisualWeather('desolateland', 6)).toBe('intense_sun');
        expect(mapOfficialToVisualWeather('primordialsea', 6)).toBe('heavy_rain');
        expect(mapOfficialToVisualWeather('deltastream', 6)).toBe('strong_winds');
        expect(mapOfficialToVisualWeather('fog', 6)).toBe('fog');
        expect(mapOfficialToVisualWeather('rain', 3)).toBe('rain');
        expect(mapOfficialToVisualWeather('sun', 3)).toBe('sun');
        expect(mapOfficialToVisualWeather('none', 3)).toBe('clear');
        expect(mapOfficialToVisualWeather(null, 3)).toBe('clear');
      });
    });
  });

  describe('Gym & Map Cycle/Weather Isolation (useBattleAtmosphere)', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
    });

    it('should enforce constant day lighting and block outdoor weather for Gyms and single-sprite arenas', () => {
      const mapStore = useMapStore();
      
      // Simulate outdoor map state (e.g. night, rain)
      mapStore.setGlobalCycle('night');
      mapStore.setGlobalWeather('rain');

      const gymBattle = ref<BattleState>({
        player: null,
        enemy: null,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [],
        isTrainer: false,
        turnCount: 0,
        over: false,
        escapeAttempts: 0,
        isGym: true,
        locationId: 'gym' as unknown as BattleState['locationId'],
        isIndoors: true,
        isCave: false,
        isCrystalCave: false,
        weather: { type: 'none', visual: 'clear', turns: -1 },
        fieldConditions: {},
        enemySideConditions: {},
        playerSideConditions: {}
      });

      const {
        isGymOrPvP,
        mapSupportsCycles,
        effectiveCycle,
        computedWeather,
        effectiveBattleVisual,
        isAtmosphereLayerVisible,
        arenaAtmosphereStyles
      } = useBattleAtmosphere(gymBattle);

      // 1. In Gym battle, background has no cycle variants -> constant day lighting & no natural weather
      expect(isGymOrPvP.value).toBe(true);
      expect(mapSupportsCycles.value).toBe(false);
      expect(effectiveCycle.value).toBe('day');
      expect(computedWeather.value).toBe('clear');
      expect(effectiveBattleVisual.value).toBe('clear');
      expect(isAtmosphereLayerVisible.value).toBe(false);
      expect(arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none');
      expect(arenaAtmosphereStyles.value['--weather-filter']).toBe('none');

      // 2. Cycle transitions (morning, dusk, night) do NOT affect Gym interior
      mapStore.setGlobalCycle('morning');
      expect(effectiveCycle.value).toBe('day');
      mapStore.setGlobalCycle('dusk');
      expect(effectiveCycle.value).toBe('day');
      mapStore.setGlobalCycle('night');
      expect(effectiveCycle.value).toBe('day');

      // 3. Outdoor weather does NOT leak into Gym
      mapStore.setGlobalWeather('sandstorm');
      expect(computedWeather.value).toBe('clear');
      expect(effectiveBattleVisual.value).toBe('clear');
      expect(isAtmosphereLayerVisible.value).toBe(false);

      // 4. In-combat moves/abilities (e.g. Rain Dance) inside the gym activate properly
      gymBattle.value.weather = { type: 'rain', visual: 'rain', turns: 5 };
      expect(computedWeather.value).toBe('rain');
      expect(effectiveBattleVisual.value).toBe('rain');
      expect(isAtmosphereLayerVisible.value).toBe(true);
      expect(arenaAtmosphereStyles.value['--atmosphere-filter']).not.toBe('none');

      // 5. Expiration reverts to clear indoor environment
      gymBattle.value.weather = { type: 'clear', visual: 'clear', turns: -1 };
      expect(computedWeather.value).toBe('clear');
      expect(effectiveBattleVisual.value).toBe('clear');
      expect(effectiveCycle.value).toBe('day');
      expect(isAtmosphereLayerVisible.value).toBe(false);
      expect(arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none');
    });

    it('should reactively update atmosphere and cycle on maps with cycle-specific backgrounds (outdoor routes & multi-sprite interiors)', () => {
      const mapStore = useMapStore();
      
      // Start on Route 1 during daytime
      mapStore.setGlobalCycle('day');
      mapStore.setGlobalWeather(null);

      const routeBattle = ref<BattleState>({
        player: null,
        enemy: null,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [],
        turnCount: 0,
        over: false,
        escapeAttempts: 0,
        isGym: false,
        isTrainer: false,
        locationId: 'route1',
        isIndoors: false,
        isCave: false,
        isCrystalCave: false,
        weather: { type: 'clear', visual: 'clear', turns: -1 },
        fieldConditions: {},
        enemySideConditions: {},
        playerSideConditions: {}
      });

      const {
        isGymOrPvP,
        mapSupportsCycles,
        effectiveCycle,
        computedWeather,
        effectiveBattleVisual,
        isAtmosphereLayerVisible
      } = useBattleAtmosphere(routeBattle);

      expect(isGymOrPvP.value).toBe(false);
      expect(mapSupportsCycles.value).toBe(true);
      expect(effectiveCycle.value).toBe('day');
      expect(isAtmosphereLayerVisible.value).toBe(true);

      // 1. Transition outdoor battle from day to night
      mapStore.setGlobalCycle('night');
      expect(effectiveCycle.value).toBe('night');

      // 2. Set global rain on outdoor route
      mapStore.setGlobalWeather('rain');
      expect(computedWeather.value).toBe('rain');
      expect(effectiveBattleVisual.value).toBe('rain');
      expect(isAtmosphereLayerVisible.value).toBe(true);

      // 3. Multi-sprite interior map (mansionpokemon) supports cycles
      const mansionBattle = ref<BattleState>({
        player: null,
        enemy: null,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [],
        turnCount: 0,
        over: false,
        escapeAttempts: 0,
        isGym: false,
        isTrainer: false,
        locationId: 'mansion',
        isIndoors: true,
        weather: { type: 'clear', visual: 'clear', turns: -1 },
        fieldConditions: {},
        enemySideConditions: {},
        playerSideConditions: {}
      });

      const mansionAtmosphere = useBattleAtmosphere(mansionBattle);
      expect(mansionAtmosphere.mapSupportsCycles.value).toBe(true);
      expect(mansionAtmosphere.effectiveCycle.value).toBe('night');
    });

    it('should support explicit fixedCycle and fixedWeather configuration overrides for custom Gyms and Battles', () => {
      const mapStore = useMapStore();
      mapStore.setGlobalCycle('day');
      mapStore.setGlobalWeather(null);

      // A custom Ghost/Dark Gym or Battle configured with permanent NIGHT
      const ghostGymBattle = ref<BattleState>({
        player: null,
        enemy: null,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [],
        turnCount: 0,
        over: false,
        escapeAttempts: 0,
        isGym: true,
        isTrainer: false,
        gymId: 'pewter',
        locationId: 'gym' as unknown as BattleState['locationId'],
        fixedCycle: 'night',
        fixedWeather: 'fog',
        weather: { type: 'none', visual: 'clear', turns: -1 },
        fieldConditions: {},
        enemySideConditions: {},
        playerSideConditions: {}
      });

      const atmosphere = useBattleAtmosphere(ghostGymBattle);

      // Reflects the explicit fixedCycle and fixedWeather overrides
      expect(atmosphere.effectiveCycle.value).toBe('night');
      expect(atmosphere.computedWeather.value).toBe('fog');
      expect(atmosphere.effectiveBattleVisual.value).toBe('fog');
      expect(atmosphere.isAtmosphereLayerVisible.value).toBe(true);
    });
  });
});
