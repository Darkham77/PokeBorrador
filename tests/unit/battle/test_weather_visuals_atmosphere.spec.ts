import { describe, it, expect } from 'vitest'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import {
  WEATHER_TILE_SNOW_L1_PX,
  WEATHER_TILE_SNOW_L2_PX,
  WEATHER_TILE_HAIL_L1_PX,
  WEATHER_TILE_HAIL_L2_PX,
  WEATHER_TILE_SANDSTORM_PX,
  WEATHER_EFFECT_PRESETS
} from '@/logic/constants/visuals'
import {
  SNOW_L1_BLIZZARD_DRIFT_X,
  SNOW_L2_BLIZZARD_DRIFT_X,
  computeSnowLayer1Config,
  computeSnowLayer2Config
} from '@/components/common/atmosphereSnowHelper'
import {
  DUST_LAYER_ONE_DRIFT_X_PX,
  DUST_LAYER_TWO_DRIFT_X_PX
} from '@/components/common/atmosphereSandstormHelper'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath'

describe('Weather Visuals & Atmospheric Color Integration Tests', () => {
  const LAYER_BLEED_PX = 600

  describe('Atmospheric Lighting Filters', () => {
    it('verifies sandstorm produces calibrated brightness, contrast and saturation', () => {
      const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
        weather: 'sandstorm',
        cycle: 'day'
      })

      expect(atmosphereFilter.value).toContain(`brightness(${WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_BRIGHTNESS})`)
      expect(atmosphereFilter.value).toContain(`contrast(${WEATHER_EFFECT_PRESETS.SANDSTORM_CONTRAST})`)
      expect(weatherOnlyFilter.value).toContain(`brightness(${WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_BRIGHTNESS})`)
    })

    it('verifies blizzard produces calibrated brightness and contrast', () => {
      const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
        weather: 'blizzard',
        cycle: 'day'
      })

      expect(atmosphereFilter.value).toContain(`brightness(${WEATHER_EFFECT_PRESETS.BLIZZARD_BRIGHTNESS})`)
      expect(atmosphereFilter.value).toContain(`contrast(${WEATHER_EFFECT_PRESETS.BLIZZARD_CONTRAST})`)
      expect(weatherOnlyFilter.value).toContain(`brightness(${WEATHER_EFFECT_PRESETS.BLIZZARD_BRIGHTNESS})`)
    })

    it('verifies clear weather retains pure neutral filter', () => {
      const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
        weather: 'clear',
        cycle: 'day'
      })

      expect(atmosphereFilter.value).toBe('brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
      expect(weatherOnlyFilter.value).toBe('brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
    })
  })

  describe('Kinematic Drift Bounds & Bleed Safety', () => {
    it('ensures snow layer 1 displacement matches tile size and stays within bleed', () => {
      const cfg = computeSnowLayer1Config(0.5, true, 1.0)
      expect(Math.abs(SNOW_L1_BLIZZARD_DRIFT_X)).toBe(WEATHER_TILE_SNOW_L1_PX)
      expect(cfg.driftY).toBe(WEATHER_TILE_SNOW_L1_PX)
      expect(cfg.driftY).toBeLessThan(LAYER_BLEED_PX)
    })

    it('ensures snow layer 2 displacement matches tile size and stays within bleed', () => {
      const cfg = computeSnowLayer2Config(0.5, true, 1.0)
      expect(Math.abs(SNOW_L2_BLIZZARD_DRIFT_X)).toBe(WEATHER_TILE_SNOW_L2_PX)
      expect(cfg.driftY).toBe(WEATHER_TILE_SNOW_L2_PX)
      expect(cfg.driftY).toBeLessThan(LAYER_BLEED_PX)
    })

    it('ensures hail drift stays strictly within bleed zone', () => {
      expect(WEATHER_TILE_HAIL_L1_PX).toBeLessThan(LAYER_BLEED_PX)
      expect(WEATHER_TILE_HAIL_L2_PX).toBeLessThan(LAYER_BLEED_PX)
    })

    it('ensures sandstorm drift for both layers matches tile size and never exceeds bleed', () => {
      expect(Math.abs(DUST_LAYER_ONE_DRIFT_X_PX)).toBe(WEATHER_TILE_SANDSTORM_PX)
      expect(Math.abs(DUST_LAYER_TWO_DRIFT_X_PX)).toBe(WEATHER_TILE_SANDSTORM_PX)
      expect(Math.abs(DUST_LAYER_ONE_DRIFT_X_PX)).toBeLessThan(LAYER_BLEED_PX)
      expect(Math.abs(DUST_LAYER_TWO_DRIFT_X_PX)).toBeLessThan(LAYER_BLEED_PX)
    })
  })

  describe('Map & Combat Weather Seed Parity', () => {
    it('ensures getWeatherAnimSeed yields deterministic synced seeds for identical routes', () => {
      const mapSeed = getWeatherAnimSeed('route1')
      const combatSeed = getWeatherAnimSeed('route1')
      expect(mapSeed).toBe(combatSeed)
      expect(mapSeed).toBeGreaterThanOrEqual(0)
      expect(mapSeed).toBeLessThanOrEqual(1)
    })
  })
})
