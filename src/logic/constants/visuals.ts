/**
 * Z-Index Layers (Project Standard)
 * Centralized source of truth for layering hierarchy.
 */

export const Z_LAYERS = {
  BASE: 0,
  LOW: 50,
  
  // World Space (Map)
  MAP_FLOOR: 1,
  MAP_SHADOWS: 3,
  MAP_GRASS_BACK: 5,
  MAP_SPAWNS: 10,
  MAP_GROUND_FX: 15,
  MAP_GRASS_FRONT: 15,
  MAP_WEATHER: 18,
  MAP_UI: 20,

  // HUD & Navigation
  HUD: 1000,
  NAVIGATION: 5000,
  
  // Overlays & Modals
  OVERLAY: 10000,
  MODAL_BASE: 11000,
  MODAL_STEP: 100, // Increment per stacked modal
  
  // Global Critical
  TOOLTIP: 15000,
  TOAST: 20000,
  MAX: 100000,
  CRITICAL: 999999
} as const;

export type ZLayer = keyof typeof Z_LAYERS;
