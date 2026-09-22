const LEAF_WEATHER_STORM_WIND_COUNT = 15 as const;
const LEAF_WEATHER_WIND_COUNT = 8 as const;
const ATMOSPHERE_SEED_Y_MULTIPLIER = 300 as const;
const BASE_CARD_SPEED = 0.6 as const;
const CARD_SPEED_FACTOR = 1.0 as const;
const SEED_PERCENT_MULTIPLIER = 100 as const;

const _ATMOSPHERE_LAYER_DEPTHS = ['all', 'ambient', 'particles'] as const;
export type AtmosphereLayerDepth = (typeof _ATMOSPHERE_LAYER_DEPTHS)[number];

const ATMOSPHERE_RAIN_WEATHERS = ['rain', 'storm', 'heavy_rain', 'thunderstorm'] as const;
type AtmosphereRainWeather = (typeof ATMOSPHERE_RAIN_WEATHERS)[number];
const ATMOSPHERE_RAIN_WEATHERS_SET: ReadonlySet<AtmosphereRainWeather> = new Set(ATMOSPHERE_RAIN_WEATHERS);

const ATMOSPHERE_LIGHTNING_WEATHERS = ['storm', 'thunderstorm'] as const;
type AtmosphereLightningWeather = (typeof ATMOSPHERE_LIGHTNING_WEATHERS)[number];
const ATMOSPHERE_LIGHTNING_WEATHERS_SET: ReadonlySet<AtmosphereLightningWeather> = new Set(ATMOSPHERE_LIGHTNING_WEATHERS);

const ATMOSPHERE_SNOW_WEATHERS = ['snow', 'blizzard', 'hail'] as const;
type AtmosphereSnowWeather = (typeof ATMOSPHERE_SNOW_WEATHERS)[number];
const ATMOSPHERE_SNOW_WEATHERS_SET: ReadonlySet<AtmosphereSnowWeather> = new Set(ATMOSPHERE_SNOW_WEATHERS);

const ATMOSPHERE_SANDSTORM_WEATHERS = ['sandstorm', 'strong_winds', 'dust_storm'] as const;
type AtmosphereSandstormWeather = (typeof ATMOSPHERE_SANDSTORM_WEATHERS)[number];
const ATMOSPHERE_SANDSTORM_WEATHERS_SET: ReadonlySet<AtmosphereSandstormWeather> = new Set(ATMOSPHERE_SANDSTORM_WEATHERS);

const ATMOSPHERE_CANVAS_WEATHERS = [
  'fog',
  'mist',
  'wind',
  'strong_winds',
  'dust_storm',
  'sandstorm',
  'sun',
  'intense_sun',
  'heatwave'
] as const;
type AtmosphereCanvasWeather = (typeof ATMOSPHERE_CANVAS_WEATHERS)[number];
const ATMOSPHERE_CANVAS_WEATHERS_SET: ReadonlySet<AtmosphereCanvasWeather> = new Set(ATMOSPHERE_CANVAS_WEATHERS);

const ATMOSPHERE_HEAT_WEATHERS = ['sun', 'intense_sun', 'heatwave'] as const;
type AtmosphereHeatWeather = (typeof ATMOSPHERE_HEAT_WEATHERS)[number];
const ATMOSPHERE_HEAT_WEATHERS_SET: ReadonlySet<AtmosphereHeatWeather> = new Set(ATMOSPHERE_HEAT_WEATHERS);

export function isRainWeather(weather?: string): boolean {
  return weather !== undefined && ATMOSPHERE_RAIN_WEATHERS_SET.has(weather as AtmosphereRainWeather);
}

export function isLightningWeather(weather?: string): boolean {
  return weather !== undefined && ATMOSPHERE_LIGHTNING_WEATHERS_SET.has(weather as AtmosphereLightningWeather);
}

export function isSnowWeather(weather?: string): boolean {
  return weather !== undefined && ATMOSPHERE_SNOW_WEATHERS_SET.has(weather as AtmosphereSnowWeather);
}

export function isSandstormWeather(weather?: string): boolean {
  return weather !== undefined && ATMOSPHERE_SANDSTORM_WEATHERS_SET.has(weather as AtmosphereSandstormWeather);
}

export function isHeatWeather(weather?: string): boolean {
  return weather !== undefined && ATMOSPHERE_HEAT_WEATHERS_SET.has(weather as AtmosphereHeatWeather);
}

export function isCanvasWeather(weather?: string): boolean {
  return weather !== undefined && ATMOSPHERE_CANVAS_WEATHERS_SET.has(weather as AtmosphereCanvasWeather);
}

export function resolveSnowLayerClass(weather: string): string {
  return weather === 'hail' ? 'hail-layer' : 'snow-layer';
}

export function calculateLeafCount(weather?: string, isLowPower: boolean = false): number {
  let count = 0;
  if (weather === 'storm' || weather === 'strong_winds') {
    count = LEAF_WEATHER_STORM_WIND_COUNT;
  } else if (weather === 'wind') {
    count = LEAF_WEATHER_WIND_COUNT;
  }

  if (isLowPower) {
    return Math.round(count / 2);
  }
  return count;
}

export interface AtmosphereOverlayStyleOptions {
  zIndex?: number | string;
  animSeed: number;
  direction: number;
}

export function resolveWeatherOverlayStyles(options: AtmosphereOverlayStyleOptions): Record<string, string | number> {
  const finalZ = options.zIndex !== undefined && options.zIndex !== ''
    ? (typeof options.zIndex === 'number' ? `calc(${options.zIndex} + 1)` : options.zIndex)
    : 'var(--z-map-weather, 8)';

  return {
    '--atmo-z-final': finalZ,
    '--card-seed': options.animSeed,
    '--card-speed': BASE_CARD_SPEED + (options.animSeed * CARD_SPEED_FACTOR),
    '--atmo-dir': options.direction,
    '--seed-x': (options.animSeed * SEED_PERCENT_MULTIPLIER) % SEED_PERCENT_MULTIPLIER,
    '--seed-y': (options.animSeed * ATMOSPHERE_SEED_Y_MULTIPLIER) % SEED_PERCENT_MULTIPLIER
  };
}
