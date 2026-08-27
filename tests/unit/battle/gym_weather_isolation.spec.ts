import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useBattleAtmosphere } from '@/composables/battle/useBattleAtmosphere'
import type { BattleState } from '@/types/battle/battle'

describe('Gym & Indoor Weather and Cycle Isolation (useBattleAtmosphere)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should strictly isolate gym battles from outdoor map weather and day/night transitions', () => {
    const mapStore = useMapStore()
    
    // Simulate outdoor map state (e.g. night, rain)
    mapStore.setGlobalCycle('night')
    mapStore.setGlobalWeather('rain')

    const gymBattle = ref<Partial<BattleState>>({
      isGym: true,
      locationId: 'gym',
      isIndoors: true,
      isCave: false,
      isCrystalCave: false,
      weather: { type: 'none', visual: 'clear', turns: -1 },
      fieldConditions: {},
      enemySideConditions: {},
      playerSideConditions: {}
    }) as unknown as { value: BattleState }

    const {
      isInteriorCombat,
      effectiveCycle,
      computedWeather,
      effectiveBattleVisual,
      isAtmosphereLayerVisible,
      arenaAtmosphereStyles
    } = useBattleAtmosphere(gymBattle)

    // 1. In Gym battle, natural rain and night cycle are completely blocked
    expect(isInteriorCombat.value).toBe(true)
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

    // 3. Extreme outdoor weather (fog, sandstorm, snow) does NOT leak into Gym
    mapStore.setGlobalWeather('sandstorm')
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')
    expect(isAtmosphereLayerVisible.value).toBe(false)

    // 4. When an in-combat move/ability casts Rain Dance inside the gym
    gymBattle.value.weather = { type: 'rain', visual: 'rain', turns: 5 }
    expect(computedWeather.value).toBe('rain')
    expect(effectiveBattleVisual.value).toBe('rain')
    expect(isAtmosphereLayerVisible.value).toBe(true)
    expect(arenaAtmosphereStyles.value['--atmosphere-filter']).not.toBe('none')
    expect(arenaAtmosphereStyles.value['--weather-filter']).not.toBe('none')

    // 5. When in-combat weather expires, returns cleanly to clear indoor environment
    gymBattle.value.weather = { type: 'clear', visual: 'clear', turns: -1 }
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')
    expect(effectiveCycle.value).toBe('day')
    expect(isAtmosphereLayerVisible.value).toBe(false)
    expect(arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none')
    expect(arenaAtmosphereStyles.value['--weather-filter']).toBe('none')
  })

  it('should reactively update atmosphere and cycle on normal outdoor route battles', () => {
    const mapStore = useMapStore()
    
    // Start on Route 1 during daytime
    mapStore.setGlobalCycle('day')
    mapStore.setGlobalWeather(null)

    const routeBattle = ref<Partial<BattleState>>({
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
    }) as unknown as { value: BattleState }

    const {
      isInteriorCombat,
      effectiveCycle,
      computedWeather,
      effectiveBattleVisual,
      isAtmosphereLayerVisible
    } = useBattleAtmosphere(routeBattle)

    expect(isInteriorCombat.value).toBe(false)
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
  })
})
