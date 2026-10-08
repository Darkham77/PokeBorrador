/**
 * scripts/assets/helpers/assetBoundAnalyzer.ts
 *
 * Image bounding box analysis, opaque pixel bounds detection,
 * and foot coordinate anchoring for Pokémon and trainer sprite sheets.
 */

export const ALPHA_PIXEL_THRESHOLD_LIMIT = 50;
export const DEFAULT_FEET_Y = 0.9;
export const DEFAULT_FEET_X = 0.5;
export const DEFAULT_BODY_H = 0.8;
export const DEFAULT_BODY_W = 0.8;

export interface FeetPointsResult {
  readonly feetY: number;
  readonly feetX: number;
}

export interface ImageBoundsResult {
  readonly feetY: number;
  readonly feetX: number;
  readonly bodyH: number;
  readonly bodyW: number;
  readonly bodyRadius: number;
}

function isPixelOpaque(data: Buffer | Uint8Array, index: number, channels: number): boolean {
  const alpha = channels >= 4 ? (data[index + 3] ?? 0) : 255;
  return alpha > ALPHA_PIXEL_THRESHOLD_LIMIT;
}

function scanRowHasOpaque(
  data: Buffer | Uint8Array,
  y: number,
  strideWidth: number,
  scanWidth: number,
  channels: number
): boolean {
  for (let x = 0; x < scanWidth; x++) {
    const idx = (y * strideWidth + x) * channels;
    if (isPixelOpaque(data, idx, channels)) {
      return true;
    }
  }
  return false;
}

function findLowestOpaqueRow(
  data: Buffer | Uint8Array,
  strideWidth: number,
  height: number,
  scanWidth: number,
  channels: number
): number {
  for (let y = height - 1; y >= 0; y--) {
    if (scanRowHasOpaque(data, y, strideWidth, scanWidth, channels)) {
      return y;
    }
  }
  return -1;
}

interface BoundingBoxScan {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly hasOpaque: boolean;
}

function scanBoundingBox(
  data: Buffer | Uint8Array,
  strideWidth: number,
  height: number,
  scanWidth: number,
  channels: number
): BoundingBoxScan {
  let minX = scanWidth;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let hasOpaque = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < scanWidth; x++) {
      const idx = (y * strideWidth + x) * channels;
      if (isPixelOpaque(data, idx, channels)) {
        hasOpaque = true;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, maxX, minY, maxY, hasOpaque };
}

export function findFeetPointsFromBuffer(
  data: Buffer | Uint8Array,
  width: number,
  height: number,
  channels: number
): FeetPointsResult {
  if (channels < 4) {
    return { feetY: DEFAULT_FEET_Y, feetX: DEFAULT_FEET_X };
  }

  const size = Math.min(width, height);
  const bbox = scanBoundingBox(data, width, height, size, channels);
  if (!bbox.hasOpaque) {
    return { feetY: DEFAULT_FEET_Y, feetX: DEFAULT_FEET_X };
  }

  const lowestY = findLowestOpaqueRow(data, width, height, size, channels);
  if (lowestY === -1) {
    return { feetY: DEFAULT_FEET_Y, feetX: DEFAULT_FEET_X };
  }

  const centerX = (bbox.minX + bbox.maxX) / 2;
  return {
    feetY: Number((lowestY / height).toFixed(4)),
    feetX: Number((centerX / size).toFixed(4))
  };
}

export function analyzeImageBufferBounds(
  data: Buffer | Uint8Array,
  size: number,
  channels: number
): ImageBoundsResult {
  const bbox = scanBoundingBox(data, size, size, size, channels);
  if (!bbox.hasOpaque) {
    return {
      feetY: DEFAULT_FEET_Y,
      feetX: DEFAULT_FEET_X,
      bodyH: DEFAULT_BODY_H,
      bodyW: DEFAULT_BODY_W,
      bodyRadius: Number((DEFAULT_BODY_H / 2).toFixed(4))
    };
  }

  const lowestY = findLowestOpaqueRow(data, size, size, size, channels);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const feetY = lowestY !== -1 ? Number((lowestY / size).toFixed(4)) : DEFAULT_FEET_Y;
  const feetX = Number((centerX / size).toFixed(4));
  const bodyH = Number(((bbox.maxY - bbox.minY + 1) / size).toFixed(4));
  const bodyW = Number(((bbox.maxX - bbox.minX + 1) / size).toFixed(4));
  const bodyRadius = Number((bodyH / 2).toFixed(4));

  return { feetY, feetX, bodyH, bodyW, bodyRadius };
}
