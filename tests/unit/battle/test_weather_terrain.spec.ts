import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField'
import { getEffectiveSpeed } from '@/logic/battle/battleEngine'
import type { SBCtx } from '@/logic/battle/showdownBridgeCtx'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages, BattleWeather } from '@/types/battle/battle'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/logic/utils/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'night'),
  sleep: vi.fn(async () => {})
}))

describe('Battle Weather and Terrain Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates battle weather in store when handling -weather events', () => {
    const activeBattle = ref({
      weather: { type: 'clear', visual: 'clear', turns: -1 }
    })
    const logs: string[] = []

    const mockCtx = {
      store: {
        activeBattle,
        addLog: (msg: string) => logs.push(msg)
      },
      type: '-weather',
      parts: ['', '-weather', 'SunnyDay'],
      line: '|-weather|SunnyDay',
      getPoke: () => null
    } as unknown as SBCtx

    handleFieldEvents(mockCtx)

    expect(activeBattle.value.weather.type).toBe('sun')
    expect(activeBattle.value.weather.visual).toBe('sun')
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toContain('clima')
  })

  it('correctly calculates speed doubling under Sun for Chlorophyll ability', () => {
    const pokemon = {
      uid: 'p1',
      name: 'Oddish',
      spe: 100,
      ability: 'chlorophyll'
    } as unknown as Pokemon

    const stages: BattleStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    }

    const clearWeather: BattleWeather = { type: 'clear', visual: 'clear', turns: -1 }
    const sunWeather: BattleWeather = { type: 'sun', visual: 'sun', turns: 5 }

    const speedClear = getEffectiveSpeed(pokemon, stages, { weather: clearWeather })
    const speedSun = getEffectiveSpeed(pokemon, stages, { weather: sunWeather })

    expect(speedClear).toBe(100)
    expect(speedSun).toBe(200) // Chlorophyll doubles speed in sun
  })

  it('correctly calculates speed doubling under Rain for Swift Swim ability', () => {
    const pokemon = {
      uid: 'p2',
      name: 'Horsea',
      spe: 100,
      ability: 'swiftswim'
    } as unknown as Pokemon

    const stages: BattleStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    }

    const clearWeather: BattleWeather = { type: 'clear', visual: 'clear', turns: -1 }
    const rainWeather: BattleWeather = { type: 'rain', visual: 'rain', turns: 5 }

    const speedClear = getEffectiveSpeed(pokemon, stages, { weather: clearWeather })
    const speedRain = getEffectiveSpeed(pokemon, stages, { weather: rainWeather })

    expect(speedClear).toBe(100)
    expect(speedRain).toBe(200) // Swift Swim doubles speed in rain
  })
})
