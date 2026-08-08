// fallow-ignore-file security-sink
/**
 * VISUAL & SCENE CONSTANTS (SINGLE SOURCE OF TRUTH)
 * Centralized constant definitions for rendering, textures, canvas dimensions, and shadow math.
 */

/** Milliseconds in one second (1000 ms). */
export const MILLISECONDS_PER_SECOND = 1000;

/** Full circle angle in radians (2 * Math.PI). */
export const FULL_CIRCLE_RAD = Math.PI * 2;

/** Default gradient stop percent for glow effects (40%). */
export const GLOW_GRADIENT_STOP_PERCENT = 40;

/** Absolute zero opacity level (0). */
export const OPACITY_ZERO = 0;

/** Default base scale factor (1.0). */
export const SCALE_DEFAULT_BASE_FACTOR = 1;

/** Chat message entry animation duration in seconds. */
export const MESSAGE_ANIM_DURATION_SEC = 0.25;

/** Chat message entry animation overshoot easing factor. */
export const MESSAGE_ANIM_OVERSHOOT = 1.7;

/** Base noise/mist texture tile dimension in pixels. */
export const TEXTURE_TILE_SIZE_BASE = 256;

/** Large noise/mist texture tile dimension in pixels. */
export const TEXTURE_TILE_SIZE_LARGE = 512;

/** Huge noise/mist texture tile dimension in pixels. */
export const TEXTURE_TILE_SIZE_HUGE = 1024;

/** Base speed variance factor for Web Worker atmosphere rendering. */
export const ATMOSPHERE_SPEED_VAR_BASE = 0.8;

/** Speed variance scaling factor for Web Worker atmosphere rendering. */
export const ATMOSPHERE_SPEED_VAR_SCALE = 0.4;

/** Bush PRNG seed hash multiplier constant. */
export const BUSH_SEED_MULTIPLIER = 1313;

/** Base scaling factor for procedural map bushes. */
export const BUSH_BASE_SCALE = 0.7;

/** Scaling variance factor for procedural map bushes. */
export const BUSH_VAR_SCALE = 0.6;

/** Scale increment per bush ID for procedural map bushes. */
export const BUSH_ID_SCALE_STEP = 0.05;

/** Offset X range in pixels for procedural map bushes. */
export const BUSH_OFFSET_X_RANGE = 20;

/** Offset X bias in pixels for procedural map bushes. */
export const BUSH_OFFSET_X_BIAS = 10;

/** Default Plains biome bush weight ratio. */
export const DEFAULT_PLAINS_BUSH_WEIGHT = 80;

/** Default horizontal flip chance threshold (50%). */
export const FLIP_CHANCE_PERCENT = 50;

/** Default Plains biome rock weight ratio. */
export const DEFAULT_PLAINS_ROCK_WEIGHT = 20;

/** 50% probability threshold for random horizontal flipping. */
export const FLIP_CHANCE_PROBABILITY = 0.5;

/** Standard biome weight presets for procedural environmental bush/rock distribution. */
export const BIOME_WEIGHT_PRESETS = {
  GUARANTEED: 100,
  DOMINANT: 90,
  MAJORITY: 70,
  HIGH: 60,
  BALANCED: 50,
  MODERATE: 40,
  MEDIUM: 35,
  COMMON: 30,
  REGULAR: 25,
  UNCOMMON: 20,
  OCCASIONAL: 15,
  RARE: 10,
  VERY_RARE: 5,
  TRACE: 1,
} as const;

/** Maximum random seed range for procedural scene generation. */
export const MAX_PRNG_SEED_RANGE = 1000000;

/** Trainer shadow generator horizontal radius in pixels. */
export const TRAINER_SHADOW_RADIUS_X = 10;

/** Trainer shadow generator vertical radius in pixels. */
export const TRAINER_SHADOW_RADIUS_Y = 7;

/** Trainer shadow width scaling ratio relative to entity size. */
export const TRAINER_SHADOW_WIDTH_RATIO = 0.7;

/** Trainer shadow height scaling ratio relative to entity size. */
export const TRAINER_SHADOW_HEIGHT_RATIO = 0.08;

/** Minimum brightness floor for night atmospheric visual filtering. */
export const MIN_NIGHT_BRIGHTNESS_CAP = 0.4;

/** Filter intensity multipliers for day/night atmosphere visual layers. */
export const WEATHER_ATMOSPHERE_FILTERS = {
  NIGHT_BRIGHTNESS: 0.6,
  NIGHT_CONTRAST: 1.1,
  NIGHT_SATURATE: 0.8,
  DUSK_BRIGHTNESS: 0.8,
  DUSK_CONTRAST: 1.2,
  DUSK_HUE: -10,
  MORNING_BRIGHTNESS: 1.1,
  MORNING_SATURATE: 0.9,
  MORNING_HUE: 5,
} as const;

/** Preset values for weather atmosphere CSS filters. */
export const WEATHER_EFFECT_PRESETS = {
  STORM_DUSK_FACTOR: 0.75,
  STORM_DAY_FACTOR: 0.6,
  STORM_THUNDER_BRIGHTNESS: 0.8,
  STORM_THUNDER_SATURATE: 0.4,
  STORM_STANDARD_SATURATE: 0.6,
  STORM_CONTRAST: 1.3,
  COLDWAVE_BRIGHTNESS: 0.75,
  SNOW_BRIGHTNESS: 0.85,
  SNOW_SATURATE: 0.5,
  SNOW_CONTRAST: 1.2,
  RAIN_HEAVY_BRIGHTNESS: 0.65,
  RAIN_STANDARD_BRIGHTNESS: 0.8,
  RAIN_HEAVY_SATURATE: 0.5,
  RAIN_STANDARD_SATURATE: 0.7,
  RAIN_HEAVY_CONTRAST: 1.2,
  RAIN_STANDARD_CONTRAST: 1.0,
  FOG_NIGHT_BRIGHTNESS: 0.75,
  FOG_DAY_BRIGHTNESS: 0.9,
  FOG_CONTRAST: 0.8,
  FOG_SATURATE: 0.15,
  MIST_NIGHT_BRIGHTNESS: 0.8,
  MIST_DAY_BRIGHTNESS: 0.95,
  MIST_CONTRAST: 0.9,
  MIST_SATURATE: 1.0,
  MISTY_TERRAIN_HUE: 310,
  SANDSTORM_DUST_BRIGHTNESS: 0.8,
  SANDSTORM_STANDARD_BRIGHTNESS: 0.85,
  SANDSTORM_DUST_SATURATE: 1.1,
  SANDSTORM_STANDARD_SATURATE: 1.2,
  SANDSTORM_CONTRAST: 1.1,
  INTENSE_SUN_BRIGHTNESS: 1.2,
  SUN_STANDARD_BRIGHTNESS: 1.1,
  INTENSE_SUN_SATURATE: 1.4,
  SUN_STANDARD_SATURATE: 1.3,
  SUN_CONTRAST: 1.1,
  ELECTRIC_TERRAIN: { BRIGHTNESS: 1.1, SATURATE: 1.4, CONTRAST: 1.15, HUE: 45 },
  GRASSY_TERRAIN: { BRIGHTNESS: 1.05, SATURATE: 1.35, CONTRAST: 1.05, HUE: 100 },
  PSYCHIC_TERRAIN: { BRIGHTNESS: 1.1, SATURATE: 1.4, CONTRAST: 1.2, HUE: 280 },
  TRICK_ROOM: { BRIGHTNESS: 0.85, SATURATE: 1.3, CONTRAST: 1.25, HUE: 260 },
  GRAVITY: { BRIGHTNESS: 0.8, SATURATE: 1.2, CONTRAST: 1.3, HUE: 210 },
  STEALTH_ROCK: { BRIGHTNESS: 0.95, SATURATE: 1.1, CONTRAST: 1.1, HUE: 30 },
  TOXIC_SPIKES: { BRIGHTNESS: 0.9, SATURATE: 1.25, CONTRAST: 1.15, HUE: 290 },
  PRIMAL: { BRIGHTNESS: 1.15, SATURATE: 1.5, CONTRAST: 1.3, HUE: 15 },
  TERASTALLIZE: { BRIGHTNESS: 1.2, SATURATE: 1.6, CONTRAST: 1.2, HUE: 180 },
  DYNAMAX: { BRIGHTNESS: 0.85, SATURATE: 1.4, CONTRAST: 1.4, HUE: 340 }
} as const;

/** Z-Index layout layers map for visual component ordering. */
export const Z_LAYERS = {
  BASE: 0,
  MAP_FLOOR: 10,
  LOW: 50,
  MAP_SPAWNS: 50,
  HUD: 1000,
  NAVIGATION: 5000,
  OVERLAY: 10000,
  MODAL: 11000,
  MODAL_STEP: 10,
  TOOLTIP: 15000,
  TOAST: 20000,
  MAX: 100000,
  CRITICAL: 999999,
} as const;
