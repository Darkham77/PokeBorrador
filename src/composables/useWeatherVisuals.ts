
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
    const wHue = 0

    if (weather === 'storm' || weather === 'thunderstorm') { 
      const darknessFactor = isNight ? 1.0 : (isDusk ? 0.75 : 0.6)
      wBrightness = weather === 'thunderstorm' ? (darknessFactor * 0.8) : darknessFactor; 
      wSaturate = weather === 'thunderstorm' ? 0.4 : 0.6; 
      wContrast = 1.3; 
    }
    else if (weather === 'snow' || weather === 'blizzard' || weather === 'hail' || weather === 'coldwave' || weather === 'cold') { 
      wBrightness = weather === 'coldwave' ? 0.75 : 0.85; 
      wSaturate = 0.5; 
      wContrast = 1.2; 
    }
    else if (weather === 'rain' || weather === 'heavy_rain') { 
      wBrightness = weather === 'heavy_rain' ? 0.65 : 0.8; 
      wSaturate = weather === 'heavy_rain' ? 0.5 : 0.7; 
      wContrast = weather === 'heavy_rain' ? 1.2 : 1.0;
    }
    else if (weather === 'fog') { 
      wBrightness = isNight ? 0.75 : 0.9; 
      wContrast = 0.8; 
      wSaturate = 0.15; 
    }
    else if (weather === 'mist') { 
      wBrightness = isNight ? 0.8 : 0.95; 
      wContrast = 0.9; 
      wSaturate = 1.0; 
    }
    else if (weather === 'sandstorm' || weather === 'dust_storm') { 
      wBrightness = weather === 'dust_storm' ? 0.8 : 0.85; 
      wSaturate = weather === 'dust_storm' ? 1.1 : 1.2; 
      wContrast = 1.1; 
    }
    else if (weather === 'heatwave' || weather === 'intense_sun' || weather === 'sun') { 
      wBrightness = weather === 'intense_sun' ? 1.2 : 1.1; 
      wSaturate = weather === 'intense_sun' ? 1.4 : 1.3; 
      wContrast = 1.1; 
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
