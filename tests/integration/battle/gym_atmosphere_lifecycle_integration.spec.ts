import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { toRef } from 'vue'
import { useBattleStore } from '@/stores/battle/battle'
import { useMapStore } from '@/stores/map'
import { useGameStore } from '@/stores/game'
import { useBattleAtmosphere } from '@/composables/battle/useBattleAtmosphere'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Integration: Gym vs Normal Route Atmosphere Lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should maintain strict indoor atmosphere isolation in gyms and react dynamically on outdoor routes across time/weather ticks', async () => {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()
    const mapStore = useMapStore()

    const playerMon = makePokemon('charizard', 50) as Pokemon
    gameStore.state.team = [playerMon]

    const brockGeodude = makePokemon('geodude', 12) as Pokemon
    const brockOnix = makePokemon('onix', 14) as Pokemon

    // 1. Challenge Brock at Pewter Gym
    await battleStore.startBattle(brockGeodude, {
      isGym: true,
      isTrainer: true,
      gymId: 'pewter',
      locationId: 'gym',
      trainerName: 'Líder Brock',
      enemyTeam: [brockGeodude, brockOnix],
      cannotEscape: true,
      wasSearching: false
    })

    const battleRef = toRef(battleStore, 'state')
    const atmosphere = useBattleAtmosphere(battleRef)

    // Initial Gym Atmosphere assertions
    expect(atmosphere.isInteriorCombat.value).toBe(true)
    expect(atmosphere.effectiveCycle.value).toBe('day')
    expect(atmosphere.computedWeather.value).toBe('clear')
    expect(atmosphere.isAtmosphereLayerVisible.value).toBe(false)
    expect(atmosphere.arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none')
    expect(atmosphere.arenaAtmosphereStyles.value['--weather-filter']).toBe('none')

    // 2. Simulate Real-Time Clock Ticker advancing to 22:00 (Night) and Severe Weather outside
    mapStore.currentEpochHour = 496609
    mapStore.setGlobalCycle('night')
    mapStore.setGlobalWeather('thunderstorm')

    // Verify Gym STILL has 100% clean indoor daylight and zero weather intrusion
    expect(atmosphere.isInteriorCombat.value).toBe(true)
    expect(atmosphere.effectiveCycle.value).toBe('day')
    expect(atmosphere.computedWeather.value).toBe('clear')
    expect(atmosphere.isAtmosphereLayerVisible.value).toBe(false)
    expect(atmosphere.arenaAtmosphereStyles.value['--atmosphere-filter']).toBe('none')
    expect(atmosphere.arenaAtmosphereStyles.value['--weather-filter']).toBe('none')

    // 3. Cast in-battle move weather (e.g. Rain Dance) inside the Gym
    if (battleStore.state) {
      battleStore.state.weather = { type: 'rain', visual: 'rain', turns: 5 }
    }
    expect(atmosphere.computedWeather.value).toBe('rain')
    expect(atmosphere.effectiveBattleVisual.value).toBe('rain')
    expect(atmosphere.isAtmosphereLayerVisible.value).toBe(true)
    expect(atmosphere.arenaAtmosphereStyles.value['--atmosphere-filter']).not.toBe('none')

    // 4. Reset Gym weather
    if (battleStore.state) {
      battleStore.state.weather = { type: 'none', visual: 'clear', turns: -1 }
    }
    expect(atmosphere.computedWeather.value).toBe('clear')
    expect(atmosphere.isAtmosphereLayerVisible.value).toBe(false)

    // 5. Start a Wild Battle on Route 1
    const wildPidgey = makePokemon('pidgey', 3) as Pokemon

    await battleStore.startBattle(wildPidgey, {
      isGym: false,
      isTrainer: false,
      locationId: 'route1',
      wasSearching: true
    })

    // Assert that Route 1 battle reflects the outdoor night cycle and severe weather
    expect(atmosphere.isInteriorCombat.value).toBe(false)
    expect(atmosphere.effectiveCycle.value).toBe('night')
    expect(atmosphere.computedWeather.value).toBe('thunderstorm')
    expect(atmosphere.effectiveBattleVisual.value).toBe('thunderstorm')
    expect(atmosphere.isAtmosphereLayerVisible.value).toBe(true)
    expect(atmosphere.arenaAtmosphereStyles.value['--atmosphere-filter']).not.toBe('none')
  })
})
