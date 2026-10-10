/**
 * test_aventura/config/tileProcessorConfig.ts
 *
 * Single Source of Truth for In-Browser Tile & PNG Processing configurations.
 * Governs tile dimensions, PNG chunks, deflate block sizes, CRC/Adler constants,
 * and GBA chroma-key filtering thresholds.
 */

// --- Tile Geometry ---
export const TILE_SIZE = 16 as const;
export const CHANNELS_PER_PIXEL = 4 as const;
export const BITS_PER_BYTE = 8 as const;
export const BITS_PER_SHORT = 16 as const;
export const MAX_CHANNEL_VALUE = 255 as const;
export const PNG_SIGNATURE_LENGTH = 8 as const;

// --- CRC32 & Adler32 ---
export const CRC_TABLE_SIZE = 256 as const;
export const CRC_POLYNOMIAL = 0xedb88320 as const;
export const CRC_INITIAL_MASK = 0xffffffff as const;
export const ADLER32_MOD = 65521 as const;
export const ADLER32_INIT_A = 1 as const;
export const ADLER32_INIT_B = 0 as const;

// --- Deflate & PNG Specification Constants ---
export const DEFLATE_MAX_BLOCK_SIZE = 65535 as const;
export const ZLIB_HEADER_CMF = 0x78 as const;
export const ZLIB_HEADER_FLG = 0x01 as const;

export const PNG_SIGNATURE_BYTES: readonly number[] = [
  137, 80, 78, 71, 13, 10, 26, 10
] as const;

export const PNG_CHUNK_IHDR_BYTES: readonly number[] = [73, 72, 68, 82] as const; // 'IHDR'
export const PNG_CHUNK_IDAT_BYTES: readonly number[] = [73, 68, 65, 84] as const; // 'IDAT'
export const PNG_CHUNK_IEND_BYTES: readonly number[] = [73, 69, 78, 68] as const; // 'IEND'

export const PNG_IHDR_LENGTH = 13 as const;
export const PNG_DEFAULT_BIT_DEPTH = 8 as const;
export const PNG_COLOR_TYPE_RGBA = 6 as const;
export const PNG_COMPRESSION_DEFAULT = 0 as const;
export const PNG_FILTER_NONE = 0 as const;
export const PNG_INTERLACE_NONE = 0 as const;

// --- Chroma-Key & Tile Discarding Thresholds ---
export const ALPHA_TRANSPARENT_THRESHOLD = 10 as const;
export const DISCARD_TRANSPARENT_RATIO = 0.9 as const;
export const MIN_VISIBLE_PIXEL_COUNT = 15 as const;
export const FLAT_COLOR_MAX_RANGE = 2 as const;
export const SOLID_CELL_MIN_VISIBLE_PIXELS = 20 as const;
export const TILE_HASH_SLICE_LENGTH = 10 as const;

// Chroma: Teal background (GBA Emerald / FireRed rips)
export const CHROMA_TEAL_R_MIN = 95 as const;
export const CHROMA_TEAL_R_MAX = 130 as const;
export const CHROMA_TEAL_G_MIN = 180 as const;
export const CHROMA_TEAL_G_MAX = 220 as const;
export const CHROMA_TEAL_B_MIN = 140 as const;
export const CHROMA_TEAL_B_MAX = 180 as const;

// Chroma: Magenta background
export const CHROMA_MAGENTA_R_MIN = 230 as const;
export const CHROMA_MAGENTA_G_MAX = 30 as const;
export const CHROMA_MAGENTA_B_MIN = 230 as const;

// Chroma: Lime background
export const CHROMA_LIME_R_MAX = 30 as const;
export const CHROMA_LIME_G_MIN = 230 as const;
export const CHROMA_LIME_B_MAX = 30 as const;

// Chroma: Cyan background
export const CHROMA_CYAN_R_MAX = 30 as const;
export const CHROMA_CYAN_G_MIN = 230 as const;
export const CHROMA_CYAN_B_MIN = 230 as const;

// --- Structure Collision Types ---
export const STRUCTURE_COLLISION_NONE = 0 as const;
export const STRUCTURE_COLLISION_SOLID = 1 as const;
export const STRUCTURE_COLLISION_WATER = 2 as const;
