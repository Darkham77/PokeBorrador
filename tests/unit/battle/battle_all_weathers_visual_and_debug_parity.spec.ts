/**
 * tests/unit/battle/battle_all_weathers_visual_and_debug_parity.spec.ts
 * 
 * Tier 1 Unit & Parity Test Suite (RED -> GREEN)
 * Guarantees:
 * 1. 100% of playable weathers in WEATHER_REGISTRY are present in DEBUG_WEATHER_EFFECTS.
 * 2. All weathers have valid visual effects (FX) in combat:
 *    - Cold and coldwave are atmospheric ambient weathers with valid overlay and without particle precipitation.
 *    - All registered weathers render valid atmosphere overlays and useWeatherVisuals filters.
 * 
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  WEATHER_REGISTRY,
  type WeatherId
} from '@/logic/weather/weatherRegistry'
import { DEBUG_WEATHER_EFFECTS } from '@/components/admin/debug/debugConstants'
import { isSnowWeather } from '@/components/common/atmosphereParticleHelper'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'

const NON_PLAYABLE_WEATHER_IDS: readonly WeatherId[] = ['none', 'null', 'mist_visual']
const NON_PLAYABLE_WEATHER_SET: ReadonlySet<WeatherId> = new Set<WeatherId>(NON_PLAYABLE_WEATHER_IDS)

describe('Battle Weather & Debug Controls Parity Suite (RED -> GREEN)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('All playable weathers in WEATHER_REGISTRY must be listed in DEBUG_WEATHER_EFFECTS', () => {
    const registryWeatherIds: readonly WeatherId[] = (Object.keys(WEATHER_REGISTRY) as WeatherId[])
      .filter((id) => !NON_PLAYABLE_WEATHER_SET.has(id))

    const debugWeatherIds: ReadonlySet<WeatherId> = new Set<WeatherId>(DEBUG_WEATHER_EFFECTS.map((item) => item.id))

    const missingInDebug = registryWeatherIds.filter((id) => !debugWeatherIds.has(id))

    // Must include coldwave, cold, and mist
    expect(missingInDebug).toEqual([])
    expect(debugWeatherIds.has('coldwave')).toBe(true)
    expect(debugWeatherIds.has('cold')).toBe(true)
    expect(debugWeatherIds.has('mist')).toBe(true)
  })

  it('cold and coldwave are atmospheric ambient weathers without particle precipitation', () => {
    expect(isSnowWeather('cold')).toBe(false)
    expect(isSnowWeather('coldwave')).toBe(false)
  })

  it('AtmosphereLayer renders overlay with proper classes for cold and coldwave', async () => {
    for (const w of ['cold', 'coldwave'] as const) {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: w,
          isVisible: true,
          isFastMode: false,
          isLowPower: false,
          animSeed: 0.5
        }
      })

      await nextTick()
      await nextTick()

      const overlay = wrapper.find('.weather-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.classes()).toContain(w)

      // Cold and coldwave do NOT have precipitation particle layers
      expect(wrapper.findAll('.snow-layer').length).toBe(0)
      expect(wrapper.findAll('.rain-layer').length).toBe(0)
    }
  })

  it('AtmosphereLayer renders correctly for all 19 playable weathers without throwing', async () => {
    const registryWeatherIds: readonly WeatherId[] = (Object.keys(WEATHER_REGISTRY) as WeatherId[])
      .filter((id) => !NON_PLAYABLE_WEATHER_SET.has(id))

    for (const weather of registryWeatherIds) {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather,
          layer: 'all',
          isVisible: true,
          isFastMode: false,
          isLowPower: false,
          animSeed: 0.5
        }
      })

      await nextTick()

      const container = wrapper.find('.atmosphere-container')
      expect(container.exists()).toBe(true)

      const overlay = wrapper.find('.weather-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.classes()).toContain(weather)
    }
  })

  it('useWeatherVisuals returns valid CSS filters for every playable weather', () => {
    const registryWeatherIds: readonly WeatherId[] = (Object.keys(WEATHER_REGISTRY) as WeatherId[])
      .filter((id) => !NON_PLAYABLE_WEATHER_SET.has(id))

    for (const weather of registryWeatherIds) {
      const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
        weather,
        cycle: 'day'
      })

      expect(atmosphereFilter.value).toBeDefined()
      expect(atmosphereFilter.value).not.toContain('NaN')
      expect(atmosphereFilter.value).not.toContain('undefined')

      expect(weatherOnlyFilter.value).toBeDefined()
      expect(weatherOnlyFilter.value).not.toContain('NaN')
      expect(weatherOnlyFilter.value).not.toContain('undefined')
    }
  })

  it('AtmosphereLayer renders canvas at camera level (particles) and on map (all) for heat weathers', async () => {
    const heatWeathers = ['sun', 'intense_sun', 'heatwave'] as const

    for (const weather of heatWeathers) {
      // In combat at camera level (layer="particles"): canvas must be visible
      const particlesWrapper = mount(AtmosphereLayer, {
        props: {
          weather,
          layer: 'particles',
          isVisible: true,
          isFastMode: false,
          isLowPower: false,
          animSeed: 0.5
        }
      })
      await nextTick()
      const particlesCanvas = particlesWrapper.find('.weather-canvas')
      expect(particlesCanvas.exists()).toBe(true)
      expect(particlesCanvas.isVisible()).toBe(true)

      // On map cards (layer="all"): canvas must be visible
      const allWrapper = mount(AtmosphereLayer, {
        props: {
          weather,
          layer: 'all',
          isVisible: true,
          isFastMode: false,
          isLowPower: false,
          animSeed: 0.5
        }
      })
      await nextTick()
      const allCanvas = allWrapper.find('.weather-canvas')
      expect(allCanvas.exists()).toBe(true)
      expect(allCanvas.isVisible()).toBe(true)

      // In combat background (layer="ambient"): heat canvas must be hidden (delegated to camera overlay)
      const ambientWrapper = mount(AtmosphereLayer, {
        props: {
          weather,
          layer: 'ambient',
          isVisible: true,
          isFastMode: false,
          isLowPower: false,
          animSeed: 0.5
        }
      })
      await nextTick()
      const ambientCanvas = ambientWrapper.find('.weather-canvas')
      expect(ambientCanvas.exists()).toBe(true)
      expect(ambientCanvas.isVisible()).toBe(false)
    }
  })
})
