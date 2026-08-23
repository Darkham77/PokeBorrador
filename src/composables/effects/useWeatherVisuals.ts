
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
export function useWeatherVisuals(options: WeatherVisualOptions) {
  const atmosphereFilter = computed(() => {
    return calculateAtmosphereFilter(toValue(options.cycle), toValue(options.weather), false)
  })

  const weatherOnlyFilter = computed(() => {
    return calculateAtmosphereFilter(toValue(options.cycle), toValue(options.weather), true)
  })

  function calculateAtmosphereFilter(cycle: string, weather: string, weatherOnly: boolean) {
    const isNight = cycle === 'night'
    const isDusk = cycle === 'dusk'
    const isMorning = cycle === 'morning'

    let brightness = 1.0
    let contrast = 1.0
    let saturate = 1.0
    let hue = 0

    // 1. Cycle base values (Ignored if weatherOnly is true)
    if (!weatherOnly) {
      if (isNight) {
        brightness = WEATHER_ATMOSPHERE_FILTERS.NIGHT_BRIGHTNESS;
        contrast = WEATHER_ATMOSPHERE_FILTERS.NIGHT_CONTRAST;
        saturate = WEATHER_ATMOSPHERE_FILTERS.NIGHT_SATURATE;
      } else if (isDusk) {
        brightness = WEATHER_ATMOSPHERE_FILTERS.DUSK_BRIGHTNESS;
        contrast = WEATHER_ATMOSPHERE_FILTERS.DUSK_CONTRAST;
        hue = WEATHER_ATMOSPHERE_FILTERS.DUSK_HUE;
      } else if (isMorning) {
        brightness = WEATHER_ATMOSPHERE_FILTERS.MORNING_BRIGHTNESS;
        saturate = WEATHER_ATMOSPHERE_FILTERS.MORNING_SATURATE;
        hue = WEATHER_ATMOSPHERE_FILTERS.MORNING_HUE;
      }
    }

    // 2. Weather modifiers
    let wBrightness = 1.0
    let wSaturate = 1.0
    let wContrast = 1.0
    let wHue = 0

    const cleanWeather = (weather || '').toLowerCase()

    if (cleanWeather === 'storm' || cleanWeather === 'thunderstorm') { 
      const darknessFactor = isNight ? 1.0 : (isDusk ? WEATHER_EFFECT_PRESETS.STORM_DUSK_FACTOR : WEATHER_EFFECT_PRESETS.STORM_DAY_FACTOR)
      wBrightness = cleanWeather === 'thunderstorm' ? (darknessFactor * WEATHER_EFFECT_PRESETS.STORM_THUNDER_BRIGHTNESS) : darknessFactor; 
      wSaturate = cleanWeather === 'thunderstorm' ? WEATHER_EFFECT_PRESETS.STORM_THUNDER_SATURATE : WEATHER_EFFECT_PRESETS.STORM_STANDARD_SATURATE; 
      wContrast = WEATHER_EFFECT_PRESETS.STORM_CONTRAST; 
    }
    else if (cleanWeather === 'snow' || cleanWeather === 'blizzard' || cleanWeather === 'hail' || cleanWeather === 'coldwave' || cleanWeather === 'cold') { 
      wBrightness = cleanWeather === 'coldwave' ? WEATHER_EFFECT_PRESETS.COLDWAVE_BRIGHTNESS : WEATHER_EFFECT_PRESETS.SNOW_BRIGHTNESS; 
      wSaturate = WEATHER_EFFECT_PRESETS.SNOW_SATURATE; 
      wContrast = WEATHER_EFFECT_PRESETS.SNOW_CONTRAST; 
    }
    else if (cleanWeather === 'rain' || cleanWeather === 'heavy_rain' || cleanWeather === 'raindance') { 
      wBrightness = cleanWeather === 'heavy_rain' ? WEATHER_EFFECT_PRESETS.RAIN_HEAVY_BRIGHTNESS : WEATHER_EFFECT_PRESETS.RAIN_STANDARD_BRIGHTNESS; 
      wSaturate = cleanWeather === 'heavy_rain' ? WEATHER_EFFECT_PRESETS.RAIN_HEAVY_SATURATE : WEATHER_EFFECT_PRESETS.RAIN_STANDARD_SATURATE; 
      wContrast = cleanWeather === 'heavy_rain' ? WEATHER_EFFECT_PRESETS.RAIN_HEAVY_CONTRAST : WEATHER_EFFECT_PRESETS.RAIN_STANDARD_CONTRAST;
    }
    else if (cleanWeather === 'fog') { 
      wBrightness = isNight ? WEATHER_EFFECT_PRESETS.FOG_NIGHT_BRIGHTNESS : WEATHER_EFFECT_PRESETS.FOG_DAY_BRIGHTNESS; 
      wContrast = WEATHER_EFFECT_PRESETS.FOG_CONTRAST; 
      wSaturate = WEATHER_EFFECT_PRESETS.FOG_SATURATE; 
    }
    else if (cleanWeather === 'mist' || cleanWeather === 'mistyterrain') { 
      wBrightness = isNight ? WEATHER_EFFECT_PRESETS.MIST_NIGHT_BRIGHTNESS : WEATHER_EFFECT_PRESETS.MIST_DAY_BRIGHTNESS; 
      wContrast = WEATHER_EFFECT_PRESETS.MIST_CONTRAST; 
      wSaturate = WEATHER_EFFECT_PRESETS.MIST_SATURATE; 
      if (cleanWeather === 'mistyterrain') wHue = WEATHER_EFFECT_PRESETS.MISTY_TERRAIN_HUE;
    }
    else if (cleanWeather === 'sandstorm' || cleanWeather === 'dust_storm') { 
      wBrightness = cleanWeather === 'dust_storm' ? WEATHER_EFFECT_PRESETS.SANDSTORM_DUST_BRIGHTNESS : WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_BRIGHTNESS; 
      wSaturate = cleanWeather === 'dust_storm' ? WEATHER_EFFECT_PRESETS.SANDSTORM_DUST_SATURATE : WEATHER_EFFECT_PRESETS.SANDSTORM_STANDARD_SATURATE; 
      wContrast = WEATHER_EFFECT_PRESETS.SANDSTORM_CONTRAST; 
    }
    else if (cleanWeather === 'heatwave' || cleanWeather === 'intense_sun' || cleanWeather === 'sun' || cleanWeather === 'sunnyday') { 
      wBrightness = cleanWeather === 'intense_sun' ? WEATHER_EFFECT_PRESETS.INTENSE_SUN_BRIGHTNESS : WEATHER_EFFECT_PRESETS.SUN_STANDARD_BRIGHTNESS; 
      wSaturate = cleanWeather === 'intense_sun' ? WEATHER_EFFECT_PRESETS.INTENSE_SUN_SATURATE : WEATHER_EFFECT_PRESETS.SUN_STANDARD_SATURATE; 
      wContrast = WEATHER_EFFECT_PRESETS.SUN_CONTRAST; 
    }
    else if (cleanWeather === 'electricterrain') {
      const p = WEATHER_EFFECT_PRESETS.ELECTRIC_TERRAIN;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'grassyterrain') {
      const p = WEATHER_EFFECT_PRESETS.GRASSY_TERRAIN;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'mistyterrain') {
      const p = WEATHER_EFFECT_PRESETS.MISTY_TERRAIN;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'psychicterrain') {
      const p = WEATHER_EFFECT_PRESETS.PSYCHIC_TERRAIN;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'trickroom') {
      const p = WEATHER_EFFECT_PRESETS.TRICK_ROOM;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'gravity') {
      const p = WEATHER_EFFECT_PRESETS.GRAVITY;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'stealthrock') {
      const p = WEATHER_EFFECT_PRESETS.STEALTH_ROCK;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'toxicspikes') {
      const p = WEATHER_EFFECT_PRESETS.TOXIC_SPIKES;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'primal' || cleanWeather === 'desolateland' || cleanWeather === 'primordialsea') {
      const p = WEATHER_EFFECT_PRESETS.PRIMAL;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'terastallize') {
      const p = WEATHER_EFFECT_PRESETS.TERASTALLIZE;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }
    else if (cleanWeather === 'dynamax') {
      const p = WEATHER_EFFECT_PRESETS.DYNAMAX;
      wBrightness = p.BRIGHTNESS; wSaturate = p.SATURATE; wContrast = p.CONTRAST; wHue = p.HUE;
    }

    // 3. Final mix
    const finalBrightness = (!weatherOnly && isNight) 
      ? Math.max(MIN_NIGHT_BRIGHTNESS_CAP, brightness * wBrightness) 
      : (brightness * wBrightness)
    const finalSaturate = saturate * wSaturate
    const finalContrast = contrast * wContrast
    const finalHue = hue + wHue

    return `brightness(${finalBrightness}) contrast(${finalContrast}) saturate(${finalSaturate}) hue-rotate(${finalHue}deg)`
  }

  return {
    atmosphereFilter,
    weatherOnlyFilter
  }
}
