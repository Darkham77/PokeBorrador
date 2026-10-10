/**
 * test_aventura/config/spritePipelineConfig.ts
 *
 * SSoT Named constants for unsupervised sprite sheet ingestion, slicing and classification.
 */

export const SPRITE_PIPELINE = {
  DEFAULT_CHROMA_TOLERANCE: 25,
  CORNER_ALPHA_TRANSPARENT_LIMIT: 10,
  NON_TRANSPARENT_ALPHA_THRESHOLD: 20,
  OPAQUE_ALPHA_FALLBACK: 255,

  // Slicing thresholds
  MIN_CLUSTER_AREA: 16,
  MIN_SPRITE_DIMENSION: 4,

  // Snow / Ice luminance
  SNOW_LUMINANCE_MIN_RG: 210,
  SNOW_LUMINANCE_MIN_B: 220,

  // Water dominance ratios
  WATER_DOMINANCE_BLUE_TO_RED: 1.25,
  WATER_DOMINANCE_BLUE_TO_GREEN: 1.05,

  // Tree aspect ratio & green dominance
  TREE_ASPECT_RATIO_MIN: 1.2,
  TREE_GREEN_DOMINANCE_MIN: 1.05,

  // Mountain / earthy rock color checks
  MOUNTAIN_RED_TO_BLUE: 1.1,
  MOUNTAIN_GREEN_TO_BLUE: 0.9,
  MOUNTAIN_MAX_RED_PRIMARY: 180,
  MOUNTAIN_NEUTRAL_CHANNEL_DIFF: 30,
  MOUNTAIN_MAX_RED_NEUTRAL: 140,

  // Structural dimensions
  BUILDING_MIN_WIDTH: 56,
  BUILDING_MIN_HEIGHT: 48,
  PROP_MAX_DIMENSION: 32
} as const;
