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
  let minX = size;
  let maxX = 0;
  let lowestY = -1;

  // Scan the first frame to find bounding box in X
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * width + x) * channels;
      const alpha = data[index + 3] ?? 0;
      if (alpha > ALPHA_PIXEL_THRESHOLD_LIMIT) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  // Scan from bottom to top in the first frame to find the lowest non-empty pixel row (feetY)
  for (let y = height - 1; y >= 0; y--) {
    let rowHasOpaque = false;
    for (let x = 0; x < size; x++) {
      const index = (y * width + x) * channels;
      const alpha = data[index + 3] ?? 0;
      if (alpha > ALPHA_PIXEL_THRESHOLD_LIMIT) {
        rowHasOpaque = true;
        break;
      }
    }
    if (rowHasOpaque) {
      lowestY = y;
      break;
    }
  }

  if (lowestY !== -1) {
    const centerX = (minX + maxX) / 2;
    return {
      feetY: Number((lowestY / height).toFixed(4)),
      feetX: Number((centerX / size).toFixed(4))
    };
  }

  return { feetY: DEFAULT_FEET_Y, feetX: DEFAULT_FEET_X };
}

export function analyzeImageBufferBounds(
  data: Buffer | Uint8Array,
  size: number,
  channels: number
): ImageBoundsResult {
  let minX = size;
  let maxX = 0;
  let minY = size;
  let maxY = 0;
  let lowestY = -1;
  let hasOpaque = false;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * channels;
      const alpha = channels >= 4 ? (data[idx + 3] ?? 0) : 255;
      if (alpha > ALPHA_PIXEL_THRESHOLD_LIMIT) {
        hasOpaque = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (hasOpaque) {
    for (let y = size - 1; y >= 0; y--) {
      let rowHasOpaque = false;
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * channels;
        const alpha = channels >= 4 ? (data[idx + 3] ?? 0) : 255;
        if (alpha > ALPHA_PIXEL_THRESHOLD_LIMIT) {
          rowHasOpaque = true;
          break;
        }
      }
      if (rowHasOpaque) {
        lowestY = y;
        break;
      }
    }
  }

  let feetY = DEFAULT_FEET_Y;
  let feetX = DEFAULT_FEET_X;
  let bodyH = DEFAULT_BODY_H;
  let bodyW = DEFAULT_BODY_W;

  if (hasOpaque && lowestY !== -1) {
    const centerX = (minX + maxX) / 2;
    feetY = Number((lowestY / size).toFixed(4));
    feetX = Number((centerX / size).toFixed(4));
    bodyH = Number(((maxY - minY + 1) / size).toFixed(4));
    bodyW = Number(((maxX - minX + 1) / size).toFixed(4));
  }
  const bodyRadius = Number((bodyH / 2).toFixed(4));

  return { feetY, feetX, bodyH, bodyW, bodyRadius };
}
