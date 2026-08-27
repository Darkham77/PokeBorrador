import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useBattleAtmosphere } from '@/composables/battle/useBattleAtmosphere'
import type { BattleState } from '@/types/battle/battle'

describe('Gym & Map Cycle/Weather Isolation (useBattleAtmosphere)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should enforce constant day lighting and block outdoor weather for Gyms and single-sprite arenas', () => {
    const mapStore = useMapStore()
    
    // Simulate outdoor map state (e.g. night, rain)
    mapStore.setGlobalCycle('night')
    mapStore.setGlobalWeather('rain')

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
    })

    const {
      isGymOrPvP,
      mapSupportsCycles,
      effectiveCycle,
      computedWeather,
      effectiveBattleVisual,
      isAtmosphereLayerVisible,
      arenaAtmosphereStyles
    } = useBattleAtmosphere(gymBattle)

    // 1. In Gym battle, background has no cycle variants -> constant day lighting & no natural weather
    expect(isGymOrPvP.value).toBe(true)
    expect(mapSupportsCycles.value).toBe(false)
    expect(effectiveCycle.value).toBe('day')
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')
    expect(isAtmosphereLayerVisible.value).toBe(false)
    expect(arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none')
    expect(arenaAtmosphereStyles.value['--weather-filter']).toBe('none')

    // 2. Cycle transitions (morning, dusk, night) do NOT affect Gym interior
    mapStore.setGlobalCycle('morning')
    expect(effectiveCycle.value).toBe('day')
    mapStore.setGlobalCycle('dusk')
    expect(effectiveCycle.value).toBe('day')
    mapStore.setGlobalCycle('night')
    expect(effectiveCycle.value).toBe('day')

    // 3. Outdoor weather does NOT leak into Gym
    mapStore.setGlobalWeather('sandstorm')
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')
    expect(isAtmosphereLayerVisible.value).toBe(false)

    // 4. In-combat moves/abilities (e.g. Rain Dance) inside the gym activate properly
    gymBattle.value.weather = { type: 'rain', visual: 'rain', turns: 5 }
    expect(computedWeather.value).toBe('rain')
    expect(effectiveBattleVisual.value).toBe('rain')
    expect(isAtmosphereLayerVisible.value).toBe(true)
    expect(arenaAtmosphereStyles.value['--atmosphere-filter']).not.toBe('none')

    // 5. Expiration reverts to clear indoor environment
    gymBattle.value.weather = { type: 'clear', visual: 'clear', turns: -1 }
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')
    expect(effectiveCycle.value).toBe('day')
    expect(isAtmosphereLayerVisible.value).toBe(false)
    expect(arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none')
  })

  it('should reactively update atmosphere and cycle on maps with cycle-specific backgrounds (outdoor routes & multi-sprite interiors)', () => {
    const mapStore = useMapStore()
    
    // Start on Route 1 during daytime
    mapStore.setGlobalCycle('day')
    mapStore.setGlobalWeather(null)

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
    })

    const {
      isGymOrPvP,
      mapSupportsCycles,
      effectiveCycle,
      computedWeather,
      effectiveBattleVisual,
      isAtmosphereLayerVisible
    } = useBattleAtmosphere(routeBattle)

    expect(isGymOrPvP.value).toBe(false)
    expect(mapSupportsCycles.value).toBe(true)
    expect(effectiveCycle.value).toBe('day')
    expect(isAtmosphereLayerVisible.value).toBe(true)

    // 1. Transition outdoor battle from day to night
    mapStore.setGlobalCycle('night')
    expect(effectiveCycle.value).toBe('night')

    // 2. Set global rain on outdoor route
    mapStore.setGlobalWeather('rain')
    expect(computedWeather.value).toBe('rain')
    expect(effectiveBattleVisual.value).toBe('rain')
    expect(isAtmosphereLayerVisible.value).toBe(true)

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
    })

    const mansionAtmosphere = useBattleAtmosphere(mansionBattle)
    expect(mansionAtmosphere.mapSupportsCycles.value).toBe(true)
    expect(mansionAtmosphere.effectiveCycle.value).toBe('night')
  })

  it('should support explicit fixedCycle and fixedWeather configuration overrides for custom Gyms and Battles', () => {
    const mapStore = useMapStore()
    // Outdoor is day, clear
    mapStore.setGlobalCycle('day')
    mapStore.setGlobalWeather(null)

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
    })

    const atmosphere = useBattleAtmosphere(ghostGymBattle)

    // Reflects the explicit fixedCycle and fixedWeather overrides!
    expect(atmosphere.effectiveCycle.value).toBe('night')
    expect(atmosphere.computedWeather.value).toBe('fog')
    expect(atmosphere.effectiveBattleVisual.value).toBe('fog')
    expect(atmosphere.isAtmosphereLayerVisible.value).toBe(true)
  })
})
