/**
 * test_aventura/config/archipelagoConfig.ts
 *
 * ARCHIPELAGO & OFFSHORE ISLANDS CONFIGURATION (SSoT)
 * Centralizes noise seeds, island templates, sector bounding ratios,
 * clearance buffers, and organic deformation factors for archipelagoGenerator.ts.
 */

export const ARCHIPELAGO_NOISE_SEED_OFFSET = 6655 as const;

// --- Port City Island (Cinnabar Island Anchor) ---
export const PORT_ISLAND_MASSIVE_RX = 11 as const;
export const PORT_ISLAND_DEFAULT_RX = 8 as const;
export const PORT_ISLAND_MASSIVE_RY = 9 as const;
export const PORT_ISLAND_DEFAULT_RY = 7 as const;
export const PORT_ISLAND_MASSIVE_CLEARANCE = 12 as const;
export const PORT_ISLAND_DEFAULT_CLEARANCE = 8 as const;
export const PORT_ISLAND_SECTOR_MIN_X = 0.40 as const;
export const PORT_ISLAND_SECTOR_MAX_X = 0.94 as const;
export const PORT_ISLAND_SECTOR_MIN_Y = 0.50 as const;
export const PORT_ISLAND_SECTOR_MAX_Y = 0.94 as const;

// --- Sea Cave Island (Seafoam Islands Anchor) ---
export const CAVE_ISLAND_MASSIVE_RX = 9 as const;
export const CAVE_ISLAND_DEFAULT_RX = 7 as const;
export const CAVE_ISLAND_MASSIVE_RY = 8 as const;
export const CAVE_ISLAND_DEFAULT_RY = 6 as const;
export const CAVE_ISLAND_MASSIVE_CLEARANCE = 12 as const;
export const CAVE_ISLAND_DEFAULT_CLEARANCE = 8 as const;
export const CAVE_ISLAND_SECTOR_MIN_X = 0.06 as const;
export const CAVE_ISLAND_SECTOR_MAX_X = 0.50 as const;
export const CAVE_ISLAND_SECTOR_MIN_Y = 0.50 as const;
export const CAVE_ISLAND_SECTOR_MAX_Y = 0.94 as const;

// --- Lighthouse Island ---
export const LIGHTHOUSE_ISLAND_MASSIVE_RX = 8 as const;
export const LIGHTHOUSE_ISLAND_DEFAULT_RX = 6 as const;
export const LIGHTHOUSE_ISLAND_MASSIVE_RY = 7 as const;
export const LIGHTHOUSE_ISLAND_DEFAULT_RY = 5 as const;
export const LIGHTHOUSE_ISLAND_MASSIVE_CLEARANCE = 12 as const;
export const LIGHTHOUSE_ISLAND_DEFAULT_CLEARANCE = 8 as const;
export const LIGHTHOUSE_ISLAND_SECTOR_MIN_X = 0.60 as const;
export const LIGHTHOUSE_ISLAND_SECTOR_MAX_X = 0.94 as const;
export const LIGHTHOUSE_ISLAND_SECTOR_MIN_Y = 0.20 as const;
export const LIGHTHOUSE_ISLAND_SECTOR_MAX_Y = 0.70 as const;

// --- Abyss Shrine Island ---
export const SHRINE_ISLAND_MASSIVE_RX = 7 as const;
export const SHRINE_ISLAND_DEFAULT_RX = 5 as const;
export const SHRINE_ISLAND_MASSIVE_RY = 7 as const;
export const SHRINE_ISLAND_DEFAULT_RY = 5 as const;
export const SHRINE_ISLAND_MASSIVE_CLEARANCE = 12 as const;
export const SHRINE_ISLAND_DEFAULT_CLEARANCE = 8 as const;
export const SHRINE_ISLAND_SECTOR_MIN_X = 0.25 as const;
export const SHRINE_ISLAND_SECTOR_MAX_X = 0.75 as const;
export const SHRINE_ISLAND_SECTOR_MIN_Y = 0.65 as const;
export const SHRINE_ISLAND_SECTOR_MAX_Y = 0.94 as const;

// --- Coral Atoll Island ---
export const ATOLL_ISLAND_MASSIVE_RX = 6 as const;
export const ATOLL_ISLAND_DEFAULT_RX = 5 as const;
export const ATOLL_ISLAND_MASSIVE_RY = 6 as const;
export const ATOLL_ISLAND_DEFAULT_RY = 5 as const;
export const ATOLL_ISLAND_MASSIVE_CLEARANCE = 10 as const;
export const ATOLL_ISLAND_DEFAULT_CLEARANCE = 7 as const;
export const ATOLL_ISLAND_SECTOR_MIN_X = 0.06 as const;
export const ATOLL_ISLAND_SECTOR_MAX_X = 0.40 as const;
export const ATOLL_ISLAND_SECTOR_MIN_Y = 0.25 as const;
export const ATOLL_ISLAND_SECTOR_MAX_Y = 0.65 as const;

// --- Noise Scales & Organic Shaping Factors ---
export const ARCHIPELAGO_COARSE_NOISE_SCALE = 0.05 as const;
export const ARCHIPELAGO_FINE_NOISE_SCALE = 0.22 as const;
export const ARCHIPELAGO_FINE_NOISE_WEIGHT = 0.20 as const;
export const ISLAND_CORE_GRASS_THRESHOLD = 0.65 as const;
