/**
 * test_aventura/config/continentSculptingConfig.ts
 *
 * SSoT Named constants for graph-based continent sculpting, envelope buffers, and coastal erosion.
 */

export const CONTINENT_SCULPT = {
  SURF_NOISE_SCALE: 0.05,
  SURF_MIN_RADIUS: 8,
  SURF_BASE_RADIUS: 14,
  SURF_NOISE_AMP: 4.0,
  SURF_NODE_MARGIN: 4,

  // BFS Proximity & Envelope buffers
  NETWORK_BFS_MAX_BUFFER: 55,
  NETWORK_BASE_BUFFER: 28,
  OCEAN_PERIMETER_MARGIN: 8,
  LAKE_SEARCH_MARGIN: 8,

  // Fractal coastline noise
  FRACTAL_OCTAVE_1_SCALE: 0.025,
  FRACTAL_OCTAVE_1_WEIGHT: 8.5,
  FRACTAL_OCTAVE_2_SCALE: 0.07,
  FRACTAL_OCTAVE_2_WEIGHT: 4.0,

  // Graph envelope defaults & padding
  DEFAULT_GRAPH_OCEAN_RATIO: 0.32,
  NODE_TERRESTRIAL_PADDING: 4,
  VARIABLE_BEACH_MIN_DIM: 80,
  ORPHAN_MIN_TILES: 4,
  ARCHIPELAGO_MIN_DIM: 200,
  DEFAULT_ISLAND_COUNT: 4,
  RIVER_GRAPH_MIN_DIMENSION: 128
} as const;
