/**
 * src/logic/map/continent/spritePipelineEngine.ts
 *
 * UNSUPERVISED SPRITE PIPELINE ENGINE
 * Automatically ingests raw sprite sheets, strips solid backgrounds via adaptive chroma-key,
 * detects isolated components via connected-component bounding boxes, heuristically classifies
 * sprites by biome/type, and produces valid PNG data URLs.
 */

import type {
  SpriteCategory,
  ContinentBiomeType,
  SlicedSpriteMetadata
} from '../../../types/map/continentTypes';
import { encodeRgbaToPngDataUrl } from '../inBrowserTileProcessor.ts';

export interface RawImageBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
}

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

export interface ClassificationResult {
  readonly category: SpriteCategory;
  readonly biome?: ContinentBiomeType;
  readonly dominantColors: readonly string[];
}

/**
 * Strips solid background colors via adaptive corner-pixel chroma-keying.
 */
export function stripBackground(image: RawImageBuffer, tolerance = 25): RawImageBuffer {
  const { width, height } = image;
  const outData = new Uint8ClampedArray(image.data);

  // Check corner pixels: (0,0), (w-1,0), (0,h-1), (w-1,h-1)
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4
  ];

  // If top-left corner already has alpha < 10, the image is already transparent
  if ((outData[3] ?? 255) < 10) {
    return { width, height, data: outData };
  }

  // Sample corner pixel as the key background color
  const keyR = outData[corners[0]!] ?? 255;
  const keyG = outData[corners[0]! + 1] ?? 255;
  const keyB = outData[corners[0]! + 2] ?? 255;

  const tolSq = tolerance * tolerance;

  for (let i = 0; i < outData.length; i += 4) {
    const r = outData[i]!;
    const g = outData[i + 1]!;
    const b = outData[i + 2]!;

    const dR = r - keyR;
    const dG = g - keyG;
    const dB = b - keyB;
    const distSq = dR * dR + dG * dG + dB * dB;

    if (distSq <= tolSq) {
      outData[i + 3] = 0; // Transparent
    }
  }

  return { width, height, data: outData };
}

/**
 * Slices contiguous non-transparent pixel clusters into tight bounding boxes.
 */
export function sliceConnectedSprites(image: RawImageBuffer, minArea = 16): BoundingBox[] {
  const { width, height, data } = image;
  const visited = new Uint8Array(width * height);
  const boxes: BoundingBox[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] === 1) continue;

      const alpha = data[idx * 4 + 3]!;
      if (alpha <= 20) {
        visited[idx] = 1;
        continue;
      }

      // BFS to find all connected non-transparent pixels
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      const queue: number[] = [x, y];
      visited[idx] = 1;

      while (queue.length > 0) {
        const cy = queue.pop()!;
        const cx = queue.pop()!;
        count++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 4-connected neighbors
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx! >= 0 && nx! < width && ny! >= 0 && ny! < height) {
            const nIdx = ny! * width + nx!;
            if (visited[nIdx] === 0) {
              visited[nIdx] = 1;
              if (data[nIdx * 4 + 3]! > 20) {
                queue.push(nx!, ny!);
              }
            }
          }
        }
      }

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;

      if (count >= minArea && boxW >= 4 && boxH >= 4) {
        boxes.push({
          minX,
          minY,
          maxX,
          maxY,
          width: boxW,
          height: boxH
        });
      }
    }
  }

  return boxes;
}

/**
 * Heuristically classifies a sliced sprite based on dimensions and color dominance.
 */
export function classifySprite(box: BoundingBox, pixels: RawImageBuffer): ClassificationResult {
  const { minX, minY, width: bW, height: bH } = box;
  const { width: imgW, data } = pixels;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let y = minY; y <= box.maxY; y++) {
    for (let x = minX; x <= box.maxX; x++) {
      const idx = (y * imgW + x) * 4;
      if (data[idx + 3]! > 20) {
        sumR += data[idx]!;
        sumG += data[idx + 1]!;
        sumB += data[idx + 2]!;
        count++;
      }
    }
  }

  if (count === 0) {
    return { category: 'prop', dominantColors: ['#000000'] };
  }

  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;

  const hexColor = `#${Math.round(avgR).toString(16).padStart(2, '0')}${Math.round(avgG).toString(16).padStart(2, '0')}${Math.round(avgB).toString(16).padStart(2, '0')}`;
  const dominantColors = [hexColor];

  // 1. Snow / Ice Check: Very light luminance
  if (avgR > 210 && avgG > 210 && avgB > 220) {
    return { category: 'snow', biome: 'snow', dominantColors };
  }

  // 2. Water / Shore Check: High blue dominance
  if (avgB > avgR * 1.25 && avgB > avgG * 1.05) {
    return { category: 'water_edge', biome: 'ocean', dominantColors };
  }

  // 3. Tree / Forest Check: Taller than wide, green dominance
  if (bH >= bW * 1.2 && avgG > avgR * 1.05) {
    return { category: 'tree', biome: 'forest', dominantColors };
  }

  // 4. Mountain Check: Brown, dark gray, or earthy rock
  const isMountainColor =
    (avgR > avgB * 1.1 && avgG > avgB * 0.9 && avgR < 180) ||
    (Math.abs(avgR - avgG) < 30 && Math.abs(avgG - avgB) < 30 && avgR < 140);
  if (isMountainColor) {
    return { category: 'mountain', biome: 'mountain', dominantColors };
  }

  // 5. Building Check: Large structure
  if (bW >= 56 && bH >= 48) {
    return { category: 'building', dominantColors };
  }

  // 6. Prop / Decoration Check: Small bounding box (<= 32x32)
  if (bW <= 32 && bH <= 32) {
    return { category: 'prop', dominantColors };
  }

  return { category: 'decor', dominantColors };
}

/**
 * Extracts a sub-rectangle of pixels from an image buffer.
 */
function cropSubBuffer(image: RawImageBuffer, box: BoundingBox): RawImageBuffer {
  const { minX, minY, width, height } = box;
  const out = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((minY + y) * image.width + (minX + x)) * 4;
      const dstIdx = (y * width + x) * 4;
      out[dstIdx] = image.data[srcIdx]!;
      out[dstIdx + 1] = image.data[srcIdx + 1]!;
      out[dstIdx + 2] = image.data[srcIdx + 2]!;
      out[dstIdx + 3] = image.data[srcIdx + 3]!;
    }
  }

  return { width, height, data: out };
}

/**
 * Full unsupervised spritesheet processing pipeline.
 */
export function processSpriteSheet(
  image: RawImageBuffer,
  options?: { readonly tolerance?: number; readonly sourceName?: string }
): SlicedSpriteMetadata[] {
  const tolerance = options?.tolerance ?? 25;
  const sourceName = options?.sourceName ?? 'sheet';

  // 1. Strip uniform solid background
  const transparentImage = stripBackground(image, tolerance);

  // 2. Extract connected component bounding boxes
  const boxes = sliceConnectedSprites(transparentImage);

  // 3. Classify and encode each sprite
  const results: SlicedSpriteMetadata[] = [];

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!;
    const classification = classifySprite(box, transparentImage);
    const subBuf = cropSubBuffer(transparentImage, box);
    const dataUrl = encodeRgbaToPngDataUrl(subBuf.data, subBuf.width, subBuf.height);

    results.push({
      id: `${sourceName}_sprite_${i + 1}`,
      name: `${classification.category}_${i + 1}`,
      category: classification.category,
      biome: classification.biome,
      width: box.width,
      height: box.height,
      dataUrl,
      dominantColors: classification.dominantColors
    });
  }

  return results;
}
