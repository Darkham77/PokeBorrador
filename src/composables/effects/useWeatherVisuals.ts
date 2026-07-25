
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

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
      if (isNight) { brightness = 0.6; contrast = 1.1; saturate = 0.8; }
      else if (isDusk) { brightness = 0.8; contrast = 1.2; hue = -10; }
      else if (isMorning) { brightness = 1.1; saturate = 0.9; hue = 5; }
    }

    // 2. Weather modifiers
    let wBrightness = 1.0
    let wSaturate = 1.0
    let wContrast = 1.0
    let wHue = 0

    const cleanWeather = (weather || '').toLowerCase()

    if (cleanWeather === 'storm' || cleanWeather === 'thunderstorm') { 
      const darknessFactor = isNight ? 1.0 : (isDusk ? 0.75 : 0.6)
      wBrightness = cleanWeather === 'thunderstorm' ? (darknessFactor * 0.8) : darknessFactor; 
      wSaturate = cleanWeather === 'thunderstorm' ? 0.4 : 0.6; 
      wContrast = 1.3; 
    }
    else if (cleanWeather === 'snow' || cleanWeather === 'blizzard' || cleanWeather === 'hail' || cleanWeather === 'coldwave' || cleanWeather === 'cold') { 
      wBrightness = cleanWeather === 'coldwave' ? 0.75 : 0.85; 
      wSaturate = 0.5; 
      wContrast = 1.2; 
    }
    else if (cleanWeather === 'rain' || cleanWeather === 'heavy_rain' || cleanWeather === 'raindance') { 
      wBrightness = cleanWeather === 'heavy_rain' ? 0.65 : 0.8; 
      wSaturate = cleanWeather === 'heavy_rain' ? 0.5 : 0.7; 
      wContrast = cleanWeather === 'heavy_rain' ? 1.2 : 1.0;
    }
    else if (cleanWeather === 'fog') { 
      wBrightness = isNight ? 0.75 : 0.9; 
      wContrast = 0.8; 
      wSaturate = 0.15; 
    }
    else if (cleanWeather === 'mist' || cleanWeather === 'mistyterrain') { 
      wBrightness = isNight ? 0.8 : 0.95; 
      wContrast = 0.9; 
      wSaturate = 1.0; 
      if (cleanWeather === 'mistyterrain') wHue = 310;
    }
    else if (cleanWeather === 'sandstorm' || cleanWeather === 'dust_storm') { 
      wBrightness = cleanWeather === 'dust_storm' ? 0.8 : 0.85; 
      wSaturate = cleanWeather === 'dust_storm' ? 1.1 : 1.2; 
      wContrast = 1.1; 
    }
    else if (cleanWeather === 'heatwave' || cleanWeather === 'intense_sun' || cleanWeather === 'sun' || cleanWeather === 'sunnyday') { 
      wBrightness = cleanWeather === 'intense_sun' ? 1.2 : 1.1; 
      wSaturate = cleanWeather === 'intense_sun' ? 1.4 : 1.3; 
      wContrast = 1.1; 
    }
    else if (cleanWeather === 'electricterrain') {
      wBrightness = 1.1; wSaturate = 1.4; wContrast = 1.15; wHue = 45;
    }
    else if (cleanWeather === 'grassyterrain') {
      wBrightness = 1.05; wSaturate = 1.35; wContrast = 1.05; wHue = 100;
    }
    else if (cleanWeather === 'psychicterrain') {
      wBrightness = 1.1; wSaturate = 1.4; wContrast = 1.2; wHue = 280;
    }
    else if (cleanWeather === 'trickroom') {
      wBrightness = 0.85; wSaturate = 1.3; wContrast = 1.25; wHue = 260;
    }
    else if (cleanWeather === 'gravity') {
      wBrightness = 0.8; wSaturate = 1.2; wContrast = 1.3; wHue = 210;
    }

    // 3. Final mix
    const finalBrightness = (!weatherOnly && isNight) 
      ? Math.max(0.4, brightness * wBrightness) 
      : (brightness * wBrightness)
    const finalSaturate = saturate * wSaturate
    const finalContrast = contrast * wContrast
    const finalHue = hue + wHue

    return `Brightness(${finalBrightness}) Contrast(${finalContrast}) Saturate(${finalSaturate}) hue-rotate(${finalHue}deg)`
  }

  return {
    atmosphereFilter,
    weatherOnlyFilter
  }
}
