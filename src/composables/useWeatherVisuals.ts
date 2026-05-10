
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
    const cycle = toValue(options.cycle)
    const weather = toValue(options.weather)

    const isNight = cycle === 'night'
    const isDusk = cycle === 'dusk'
    const isMorning = cycle === 'morning'

    let brightness = 1.0
    let contrast = 1.0
    let saturate = 1.0
    let hue = 0

    // 1. Cycle base values
    if (isNight) { brightness = 0.6; contrast = 1.1; saturate = 0.8; }
    else if (isDusk) { brightness = 0.8; contrast = 1.2; hue = -10; }
    else if (isMorning) { brightness = 1.1; saturate = 0.9; hue = 5; }

    // 2. Weather modifiers
    let wBrightness = 1.0
    let wSaturate = 1.0
    let wContrast = 1.0
    let wHue = 0

    if (weather === 'storm') { 
      const darknessFactor = isNight ? 1.0 : (isDusk ? 0.75 : 0.6)
      wBrightness = darknessFactor; 
      wSaturate = 0.6; 
      wContrast = 1.3; 
    }
    else if (weather === 'snow' || weather === 'blizzard') { 
      wBrightness = 0.85; 
      wSaturate = 0.5; 
      wContrast = 1.2; 
    }
    else if (weather === 'rain') { 
      wBrightness = 0.8; 
      wSaturate = 0.7; 
    }
    else if (weather === 'fog' || weather === 'mist') { 
      wBrightness = isNight ? 0.75 : 0.9; 
      wContrast = 0.8; 
      wSaturate = 0.2; 
    }
    else if (weather === 'sandstorm') { 
      wBrightness = 0.85; 
      wSaturate = 1.2; 
      wContrast = 1.1; 
    }
    else if (weather === 'heatwave') { 
      wBrightness = 1.1; 
      wSaturate = 1.3; 
      wContrast = 1.1; 
    }

    // 3. Final mix
    const finalBrightness = isNight 
      ? Math.max(0.4, brightness * wBrightness) 
      : (brightness * wBrightness)
    const finalSaturate = saturate * wSaturate
    const finalContrast = contrast * wContrast
    const finalHue = hue + wHue

    return `Brightness(${finalBrightness}) Contrast(${finalContrast}) Saturate(${finalSaturate}) hue-rotate(${finalHue}deg)`
  })

  return {
    atmosphereFilter
  }
}
