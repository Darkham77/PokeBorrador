/**
 * test_aventura/config/brushConfig.ts
 *
 * SSoT configuration constants for the Continent Map Brush, bounded dirty-rect
 * compilation, flood-fill caps, GSAP focus timings, and mobile touch UX.
 */

/** Default healing brush radius in tiles when no explicit radius is provided (2 -> 5x5). */
export const DEFAULT_BRUSH_RADIUS = 2 as const;

/** Default discrete brush side size in tiles (5 -> 5x5). */
export const DEFAULT_BRUSH_SIZE = 5 as const;

/** Padding margin in tiles around mutated cells for local autotile neighbor stabilization. */
export const DIRTY_REBUILD_MARGIN_TILES = 4 as const;

/** Overscan padding in tiles for partial dirty-rect canvas blit compilation (handles 2.5D overhangs). */
export const DIRTY_BLIT_OVERSCAN_TILES = 4 as const;

/** Vertical overhang search margin in tiles for multi-cell tree canopies and roof sprites. */
export const CANOPY_OVERHANG_BUFFER_TILES = 4 as const;

/** Padding margin in tiles for updating macro-biome containment buffer strips. */
export const BIOME_BUFFER_MARGIN_TILES = 3 as const;

/** Safety cap for bounded BFS flood-fill operations on main thread. */
export const MAX_FLOOD_FILL_CELLS = 4096 as const;

/** Minimum allowed elevation tier for manual brush sculpting. */
export const MIN_BRUSH_ELEVATION_TIER = 0 as const;

/** Maximum allowed elevation tier for manual brush sculpting. */
export const MAX_BRUSH_ELEVATION_TIER = 4 as const;

/** Upward visual pointer offset in pixels on coarse touch screens so fingers do not obscure target tiles. */
export const TOUCH_RETICLE_Y_OFFSET_PX = 48 as const;

/** Duration in seconds for smooth GSAP camera centering onto selected autotile defects. */
export const CAMERA_FOCUS_ANIM_SEC = 0.35 as const;

/** Duration in seconds for GSAP entrance and transition animations in RegionalBrushDock. */
export const DOCK_ANIM_SEC = 0.22 as const;

/** Minimum zoom multiplier applied when focusing camera on a defect marker. */
export const MIN_DEFECT_FOCUS_ZOOM = 1.15 as const;
