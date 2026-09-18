
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { WEATHER_ATMOSPHERE_FILTERS, MIN_NIGHT_BRIGHTNESS_CAP, WEATHER_EFFECT_PRESETS } from '@/logic/constants/visuals'

export interface WeatherVisualOptions {
  weather: MaybeRefOrGetter<string>
  cycle: MaybeRefOrGetter<string>
}

/**
 * useWeatherVisuals
 * Reuses the exact atmospheric filter logic from the Map system to ensure visual parity
 * in the Battle Arena and other UI components.
 */
interface VisualModifiers {
  brightness: number
  contrast: number
  saturate: number
  hue: number
}

const DEFAULT_MODIFIERS: Readonly<VisualModifiers> = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  hue: 0,
}

const STATIC_WEATHER_MODIFIERS: Readonly<Record<string, VisualModifiers>> = {
  electricterrain: {
    brightness: WEATHER_EFFECT_PRESETS.ELECTRIC_TERRAIN.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.ELECTRIC_TERRAIN.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.ELECTRIC_TERRAIN.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.ELECTRIC_TERRAIN.HUE,
  },
  grassyterrain: {
    brightness: WEATHER_EFFECT_PRESETS.GRASSY_TERRAIN.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.GRASSY_TERRAIN.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.GRASSY_TERRAIN.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.GRASSY_TERRAIN.HUE,
  },
  mistyterrain: {
    brightness: WEATHER_EFFECT_PRESETS.MISTY_TERRAIN.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.MISTY_TERRAIN.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.MISTY_TERRAIN.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.MISTY_TERRAIN.HUE,
  },
  psychicterrain: {
    brightness: WEATHER_EFFECT_PRESETS.PSYCHIC_TERRAIN.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.PSYCHIC_TERRAIN.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.PSYCHIC_TERRAIN.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.PSYCHIC_TERRAIN.HUE,
  },
  trickroom: {
    brightness: WEATHER_EFFECT_PRESETS.TRICK_ROOM.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.TRICK_ROOM.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.TRICK_ROOM.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.TRICK_ROOM.HUE,
  },
  gravity: {
    brightness: WEATHER_EFFECT_PRESETS.GRAVITY.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.GRAVITY.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.GRAVITY.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.GRAVITY.HUE,
  },
  stealthrock: {
    brightness: WEATHER_EFFECT_PRESETS.STEALTH_ROCK.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.STEALTH_ROCK.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.STEALTH_ROCK.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.STEALTH_ROCK.HUE,
  },
  toxicspikes: {
    brightness: WEATHER_EFFECT_PRESETS.TOXIC_SPIKES.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.TOXIC_SPIKES.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.TOXIC_SPIKES.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.TOXIC_SPIKES.HUE,
  },
  primal: {
    brightness: WEATHER_EFFECT_PRESETS.PRIMAL.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.PRIMAL.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.PRIMAL.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.PRIMAL.HUE,
  },
  desolateland: {
    brightness: WEATHER_EFFECT_PRESETS.PRIMAL.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.PRIMAL.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.PRIMAL.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.PRIMAL.HUE,
  },
  primordialsea: {
    brightness: WEATHER_EFFECT_PRESETS.PRIMAL.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.PRIMAL.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.PRIMAL.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.PRIMAL.HUE,
  },
  terastallize: {
    brightness: WEATHER_EFFECT_PRESETS.TERASTALLIZE.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.TERASTALLIZE.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.TERASTALLIZE.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.TERASTALLIZE.HUE,
  },
  dynamax: {
    brightness: WEATHER_EFFECT_PRESETS.DYNAMAX.BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.DYNAMAX.SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.DYNAMAX.CONTRAST,
    hue: WEATHER_EFFECT_PRESETS.DYNAMAX.HUE,
  },
}

function resolveCycleBase(cycle: string, weatherOnly: boolean): VisualModifiers {
  if (weatherOnly) {
    return { ...DEFAULT_MODIFIERS }
  }
  if (cycle === 'night') {
    return {
      brightness: WEATHER_ATMOSPHERE_FILTERS.NIGHT_BRIGHTNESS,
      contrast: WEATHER_ATMOSPHERE_FILTERS.NIGHT_CONTRAST,
      saturate: WEATHER_ATMOSPHERE_FILTERS.NIGHT_SATURATE,
      hue: 0,
    }
  }
  if (cycle === 'dusk') {
    return {
      brightness: WEATHER_ATMOSPHERE_FILTERS.DUSK_BRIGHTNESS,
      contrast: WEATHER_ATMOSPHERE_FILTERS.DUSK_CONTRAST,
      saturate: 1.0,
      hue: WEATHER_ATMOSPHERE_FILTERS.DUSK_HUE,
    }
  }
  if (cycle === 'morning') {
    return {
      brightness: WEATHER_ATMOSPHERE_FILTERS.MORNING_BRIGHTNESS,
      contrast: 1.0,
      saturate: WEATHER_ATMOSPHERE_FILTERS.MORNING_SATURATE,
      hue: WEATHER_ATMOSPHERE_FILTERS.MORNING_HUE,
    }
  }
  return { ...DEFAULT_MODIFIERS }
}

function resolveStormModifiers(cleanWeather: string, isNight: boolean, isDusk: boolean): VisualModifiers {
  const darknessFactor = isNight ? 1.0 : (isDusk ? WEATHER_EFFECT_PRESETS.STORM_DUSK_FACTOR : WEATHER_EFFECT_PRESETS.STORM_DAY_FACTOR)
  const isThunder = cleanWeather === 'thunderstorm'
  return {
    brightness: isThunder ? (darknessFactor * WEATHER_EFFECT_PRESETS.STORM_THUNDER_BRIGHTNESS) : darknessFactor,
    saturate: isThunder ? WEATHER_EFFECT_PRESETS.STORM_THUNDER_SATURATE : WEATHER_EFFECT_PRESETS.STORM_STANDARD_SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.STORM_CONTRAST,
    hue: 0,
  }
}

function resolveRainModifiers(cleanWeather: string): VisualModifiers {
  const isHeavy = cleanWeather === 'heavy_rain'
  return {
    brightness: isHeavy ? WEATHER_EFFECT_PRESETS.RAIN_HEAVY_BRIGHTNESS : WEATHER_EFFECT_PRESETS.RAIN_STANDARD_BRIGHTNESS,
    saturate: isHeavy ? WEATHER_EFFECT_PRESETS.RAIN_HEAVY_SATURATE : WEATHER_EFFECT_PRESETS.RAIN_STANDARD_SATURATE,
    contrast: isHeavy ? WEATHER_EFFECT_PRESETS.RAIN_HEAVY_CONTRAST : WEATHER_EFFECT_PRESETS.RAIN_STANDARD_CONTRAST,
    hue: 0,
  }
}

function resolveFogMistModifiers(cleanWeather: string, isNight: boolean): VisualModifiers {
  if (cleanWeather === 'fog') {
    return {
      brightness: isNight ? WEATHER_EFFECT_PRESETS.FOG_NIGHT_BRIGHTNESS : WEATHER_EFFECT_PRESETS.FOG_DAY_BRIGHTNESS,
      contrast: WEATHER_EFFECT_PRESETS.FOG_CONTRAST,
      saturate: WEATHER_EFFECT_PRESETS.FOG_SATURATE,
      hue: 0,
    }
  }
  return {
    brightness: isNight ? WEATHER_EFFECT_PRESETS.MIST_NIGHT_BRIGHTNESS : WEATHER_EFFECT_PRESETS.MIST_DAY_BRIGHTNESS,
    contrast: WEATHER_EFFECT_PRESETS.MIST_CONTRAST,
    saturate: WEATHER_EFFECT_PRESETS.MIST_SATURATE,
    hue: 0,
  }
}

function resolveSnowModifiers(cleanWeather: string): VisualModifiers {
  if (cleanWeather === 'blizzard') {
    return {
      brightness: WEATHER_EFFECT_PRESETS.BLIZZARD_BRIGHTNESS,
      saturate: WEATHER_EFFECT_PRESETS.BLIZZARD_SATURATE,
      contrast: WEATHER_EFFECT_PRESETS.BLIZZARD_CONTRAST,
      hue: 0,
    }
  }
  if (cleanWeather === 'hail') {
    return {
      brightness: WEATHER_EFFECT_PRESETS.HAIL_BRIGHTNESS,
      saturate: WEATHER_EFFECT_PRESETS.HAIL_SATURATE,
      contrast: WEATHER_EFFECT_PRESETS.HAIL_CONTRAST,
      hue: 0,
    }
  }
  if (cleanWeather === 'coldwave') {
    return {
      brightness: WEATHER_EFFECT_PRESETS.COLDWAVE_BRIGHTNESS,
      saturate: WEATHER_EFFECT_PRESETS.SNOW_SATURATE,
      contrast: WEATHER_EFFECT_PRESETS.SNOW_CONTRAST,
      hue: 0,
    }
  }
  return {
    brightness: WEATHER_EFFECT_PRESETS.SNOW_BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.SNOW_SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.SNOW_CONTRAST,
    hue: 0,
  }
}

function resolveSandstormModifiers(cleanWeather: string): VisualModifiers {
  if (cleanWeather === 'dust_storm') {
    return {
      brightness: WEATHER_EFFECT_PRESETS.SANDSTORM_DUST_BRIGHTNESS,
      saturate: WEATHER_EFFECT_PRESETS.SANDSTORM_DUST_SATURATE,
      contrast: WEATHER_EFFECT_PRESETS.SANDSTORM_CONTRAST,
      hue: 0,
    }
  }
  if (cleanWeather === 'strong_winds') {
    return {
      brightness: WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_BRIGHTNESS,
      saturate: WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_SATURATE,
      contrast: WEATHER_EFFECT_PRESETS.SANDSTORM_CONTRAST,
      hue: 0,
    }
  }
  return {
    brightness: WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_BRIGHTNESS,
    saturate: WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.SANDSTORM_CONTRAST,
    hue: 0,
  }
}

function resolveSunModifiers(cleanWeather: string): VisualModifiers {
  const isIntense = cleanWeather === 'intense_sun'
  return {
    brightness: isIntense ? WEATHER_EFFECT_PRESETS.INTENSE_SUN_BRIGHTNESS : WEATHER_EFFECT_PRESETS.SUN_STANDARD_BRIGHTNESS,
    saturate: isIntense ? WEATHER_EFFECT_PRESETS.INTENSE_SUN_SATURATE : WEATHER_EFFECT_PRESETS.SUN_STANDARD_SATURATE,
    contrast: WEATHER_EFFECT_PRESETS.SUN_CONTRAST,
    hue: 0,
  }
}

const WEATHER_DYNAMIC_HANDLERS: Readonly<Record<string, (weather: string, isNight: boolean, isDusk: boolean) => VisualModifiers>> = {
  storm: resolveStormModifiers,
  thunderstorm: resolveStormModifiers,
  snow: (w) => resolveSnowModifiers(w),
  blizzard: (w) => resolveSnowModifiers(w),
  hail: (w) => resolveSnowModifiers(w),
  coldwave: (w) => resolveSnowModifiers(w),
  cold: (w) => resolveSnowModifiers(w),
  rain: (w) => resolveRainModifiers(w),
  heavy_rain: (w) => resolveRainModifiers(w),
  raindance: (w) => resolveRainModifiers(w),
  fog: (w, n) => resolveFogMistModifiers(w, n),
  mist: (w, n) => resolveFogMistModifiers(w, n),
  sandstorm: (w) => resolveSandstormModifiers(w),
  dust_storm: (w) => resolveSandstormModifiers(w),
  strong_winds: (w) => resolveSandstormModifiers(w),
  heatwave: (w) => resolveSunModifiers(w),
  intense_sun: (w) => resolveSunModifiers(w),
  sun: (w) => resolveSunModifiers(w),
  sunnyday: (w) => resolveSunModifiers(w),
}

function resolveWeatherModifiers(cleanWeather: string, isNight: boolean, isDusk: boolean): VisualModifiers {
  const staticMatch = STATIC_WEATHER_MODIFIERS[cleanWeather]
  if (staticMatch) {
    return staticMatch
  }
  const handler = WEATHER_DYNAMIC_HANDLERS[cleanWeather]
  if (handler) {
    return handler(cleanWeather, isNight, isDusk)
  }
  return { ...DEFAULT_MODIFIERS }
}

function calculateAtmosphereFilter(cycle: string, weather: string, weatherOnly: boolean): string {
  const isNight = cycle === 'night'
  const isDusk = cycle === 'dusk'
  const cleanWeather = (weather || '').toLowerCase()

  const base = resolveCycleBase(cycle, weatherOnly)
  const wm = resolveWeatherModifiers(cleanWeather, isNight, isDusk)

  const finalBrightness = (!weatherOnly && isNight)
    ? Math.max(MIN_NIGHT_BRIGHTNESS_CAP, base.brightness * wm.brightness)
    : (base.brightness * wm.brightness)
  const finalSaturate = base.saturate * wm.saturate
  const finalContrast = base.contrast * wm.contrast
  const finalHue = base.hue + wm.hue

  return `brightness(${finalBrightness}) contrast(${finalContrast}) saturate(${finalSaturate}) hue-rotate(${finalHue}deg)`
}

/**
 * useWeatherVisuals
 * Reuses the exact atmospheric filter logic from the Map system to ensure visual parity
 * in the Battle Arena and other UI components.
 */
export function useWeatherVisuals(options: WeatherVisualOptions) {
  const atmosphereFilter = computed(() => {
    return calculateAtmosphereFilter(toValue(options.cycle), toValue(options.weather), false)
  })

  const weatherOnlyFilter = computed(() => {
    return calculateAtmosphereFilter(toValue(options.cycle), toValue(options.weather), true)
  })

  return {
    atmosphereFilter,
    weatherOnlyFilter,
  }
}
