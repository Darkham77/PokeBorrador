/**
 * test_aventura/config/continentWorkerConfig.ts
 *
 * CONTINENT GENERATOR WORKER CONFIGURATION (SSoT)
 * Centralizes preview color palettes (RGBA) for in-worker low-res continent rasterization.
 */

export const RGBA_ALPHA_OPAQUE = 255 as const;

// --- Surface Terrain Feature RGBA ---
export const PATH_PREVIEW_RGBA = [212, 163, 115, 255] as const;
export const WATER_PREVIEW_RGBA = [58, 134, 200, 255] as const;
export const SAND_PREVIEW_RGBA = [233, 216, 166, 255] as const;

// --- Elevation & Mountain Massifs ---
export const MOUNTAIN_GRAY_HIGH_ELEV = 140 as const;
export const MOUNTAIN_GRAY_LOW_ELEV = 170 as const;
export const MOUNTAIN_VOLCANIC_HIGH_ELEV = 180 as const;
export const MOUNTAIN_VOLCANIC_LOW_ELEV = 150 as const;
export const MOUNTAIN_VOLCANIC_GREEN = 60 as const;
export const MOUNTAIN_VOLCANIC_BLUE = 50 as const;
export const MOUNTAIN_BROWN_HIGH_ELEV = 140 as const;
export const MOUNTAIN_BROWN_LOW_ELEV = 163 as const;
export const MOUNTAIN_BROWN_GREEN_RATIO = 0.7 as const;
export const MOUNTAIN_BROWN_BLUE_RATIO = 0.5 as const;

// --- Macro Biome RGB Previews ---
export const BIOME_BUFFER_PREVIEW_RGB = [190, 150, 100] as const;
export const BIOME_MINT_HIGHLAND_PREVIEW_RGB = [112, 200, 160] as const;
export const BIOME_ARID_DESERT_PREVIEW_RGB = [223, 177, 91] as const;
export const BIOME_VOLCANIC_PLATEAU_PREVIEW_RGB = [158, 74, 59] as const;
export const BIOME_VIRIDIAN_FOREST_PREVIEW_RGB = [56, 102, 65] as const;
export const BIOME_DEFAULT_PLAIN_PREVIEW_RGB = [88, 129, 87] as const;
