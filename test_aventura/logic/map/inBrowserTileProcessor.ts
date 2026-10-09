/**
 * src/logic/map/inBrowserTileProcessor.ts
 *
 * CLIENT-SIDE UNIVERSAL TILE & SPRITESHEET INGESTION PIPELINE
 *
 * High-performance browser-native image slicing, chroma-key filtering,
 * Web Crypto SHA-256 deduplication, and compound structure registration.
 */

import {
  type TileCategory,
  type TileMetadata,
  type TileCollision,
  defaultTilesRegistry,
  TilesRegistryService
} from './tilesRegistry.ts';
import {
  type StructureTemplate,
  type StructureCollisionType,
  type StructureTheme,
  registerStructureTemplate
} from '../../config/mapStructures';

export const TILE_SIZE = 16;

export interface RawPixelGrid {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
}

export interface ProcessTilesetOptions {
  readonly category: TileCategory;
  readonly sourceName?: string;
  readonly filterDiscardable?: boolean;
  readonly registry?: TilesRegistryService;
}

export interface SlicedTilesetResult {
  readonly tiles: readonly TileMetadata[];
  readonly totalSliced: number;
  readonly discardedCount: number;
  readonly addedCount: number;
  readonly reusedCount: number;
}

export interface ProcessStructureOptions {
  readonly id: string;
  readonly name: string;
  readonly theme?: StructureTheme;
  readonly collisionMask?: readonly (readonly StructureCollisionType[])[];
  readonly registry?: TilesRegistryService;
  readonly interiorMapId?: string;
  readonly defaultSpawnId?: string;
}

export interface SlicedStructureResult {
  readonly template: StructureTemplate;
  readonly generatedTiles: readonly TileMetadata[];
  readonly footprint: { readonly width: number; readonly height: number };
}

// Precomputed CRC-32 table for pure PNG generation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array, offset = 0, length = buf.length - offset): number {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    const b = buf[i] ?? 0;
    c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf: Uint8Array): number {
  let a = 1;
  let b = 0;
  const mod = 65521;
  for (let i = 0; i < buf.length; i++) {
    a = (a + (buf[i] ?? 0)) % mod;
    b = (b + a) % mod;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * Pure TypeScript RGBA to PNG DataURL encoder.
 * Produces valid uncompressed Deflate (Type 0) PNG images decodable by any browser or Node.
 */
export function encodeRgbaToPngDataUrl(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): string {
  const rowBytes = width * 4;
  const rawScanlines = new Uint8Array(height * (1 + rowBytes));

  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowBytes);
    rawScanlines[rawOffset] = 0; // Filter: None
    const srcOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      rawScanlines[rawOffset + 1 + x] = rgba[srcOffset + x] ?? 0;
    }
  }

  // Deflate Type 0 (Uncompressed block)
  const scanLen = rawScanlines.length;
  const numBlocks = Math.ceil(scanLen / 65535) || 1;
  const idatData = new Uint8Array(2 + numBlocks * 5 + scanLen + 4);

  // Zlib header (CMF=0x78, FLG=0x01)
  idatData[0] = 0x78;
  idatData[1] = 0x01;

  let inPos = 0;
  let outPos = 2;

  while (inPos < scanLen) {
    const blockLen = Math.min(scanLen - inPos, 65535);
    const isFinal = inPos + blockLen >= scanLen ? 1 : 0;
    idatData[outPos++] = isFinal;
    idatData[outPos++] = blockLen & 0xff;
    idatData[outPos++] = (blockLen >>> 8) & 0xff;
    const nlen = (~blockLen) & 0xffff;
    idatData[outPos++] = nlen & 0xff;
    idatData[outPos++] = (nlen >>> 8) & 0xff;

    idatData.set(rawScanlines.subarray(inPos, inPos + blockLen), outPos);
    inPos += blockLen;
    outPos += blockLen;
  }

  // Adler32 checksum
  const adler = adler32(rawScanlines);
  idatData[outPos++] = (adler >>> 24) & 0xff;
  idatData[outPos++] = (adler >>> 16) & 0xff;
  idatData[outPos++] = (adler >>> 8) & 0xff;
  idatData[outPos++] = adler & 0xff;

  // Assembly PNG file
  const totalLength = 8 + (8 + 13 + 4) + (8 + outPos + 4) + (8 + 0 + 4);
  const png = new Uint8Array(totalLength);
  let p = 0;

  // Signature
  png.set([137, 80, 78, 71, 13, 10, 26, 10], p);
  p += 8;

  // IHDR chunk (13 bytes)
  const ihdrLen = 13;
  png[p++] = 0; png[p++] = 0; png[p++] = 0; png[p++] = ihdrLen;
  const ihdrStart = p;
  png[p++] = 73; png[p++] = 72; png[p++] = 68; png[p++] = 82; // IHDR
  png[p++] = (width >>> 24) & 0xff;
  png[p++] = (width >>> 16) & 0xff;
  png[p++] = (width >>> 8) & 0xff;
  png[p++] = width & 0xff;
  png[p++] = (height >>> 24) & 0xff;
  png[p++] = (height >>> 16) & 0xff;
  png[p++] = (height >>> 8) & 0xff;
  png[p++] = height & 0xff;
  png[p++] = 8; // Bit depth
  png[p++] = 6; // RGBA
  png[p++] = 0; // Compression
  png[p++] = 0; // Filter
  png[p++] = 0; // Interlace
  const ihdrCrc = crc32(png, ihdrStart, 17);
  png[p++] = (ihdrCrc >>> 24) & 0xff;
  png[p++] = (ihdrCrc >>> 16) & 0xff;
  png[p++] = (ihdrCrc >>> 8) & 0xff;
  png[p++] = ihdrCrc & 0xff;

  // IDAT chunk
  png[p++] = (outPos >>> 24) & 0xff;
  png[p++] = (outPos >>> 16) & 0xff;
  png[p++] = (outPos >>> 8) & 0xff;
  png[p++] = outPos & 0xff;
  const idatStart = p;
  png[p++] = 73; png[p++] = 68; png[p++] = 65; png[p++] = 84; // IDAT
  png.set(idatData.subarray(0, outPos), p);
  p += outPos;
  const idatCrc = crc32(png, idatStart, 4 + outPos);
  png[p++] = (idatCrc >>> 24) & 0xff;
  png[p++] = (idatCrc >>> 16) & 0xff;
  png[p++] = (idatCrc >>> 8) & 0xff;
  png[p++] = idatCrc & 0xff;

  // IEND chunk
  png[p++] = 0; png[p++] = 0; png[p++] = 0; png[p++] = 0;
  const iendStart = p;
  png[p++] = 73; png[p++] = 69; png[p++] = 78; png[p++] = 68; // IEND
  const iendCrc = crc32(png, iendStart, 4);
  png[p++] = (iendCrc >>> 24) & 0xff;
  png[p++] = (iendCrc >>> 16) & 0xff;
  png[p++] = (iendCrc >>> 8) & 0xff;
  png[p++] = iendCrc & 0xff;

  // Convert binary to base64
  let binary = '';
  const len = png.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(png[i] ?? 0);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Extracts a 16x16 tile RGBA buffer from a larger source image.
 * Safely pads out-of-boundary pixels with transparency.
 */
export function extractTilePixels(
  source: RawPixelGrid,
  col: number,
  row: number,
  tileSize = TILE_SIZE
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(tileSize * tileSize * 4);
  const startX = col * tileSize;
  const startY = row * tileSize;

  for (let y = 0; y < tileSize; y++) {
    const srcY = startY + y;
    for (let x = 0; x < tileSize; x++) {
      const srcX = startX + x;
      const destIndex = (y * tileSize + x) * 4;

      if (srcX >= 0 && srcX < source.width && srcY >= 0 && srcY < source.height) {
        const srcIndex = (srcY * source.width + srcX) * 4;
        result[destIndex] = source.data[srcIndex] ?? 0;
        result[destIndex + 1] = source.data[srcIndex + 1] ?? 0;
        result[destIndex + 2] = source.data[srcIndex + 2] ?? 0;
        result[destIndex + 3] = source.data[srcIndex + 3] ?? 0;
      } else {
        result[destIndex] = 0;
        result[destIndex + 1] = 0;
        result[destIndex + 2] = 0;
        result[destIndex + 3] = 0;
      }
    }
  }

  return result;
}

/**
 * Evaluates whether a 16x16 raw tile is discardable (transparent, chroma-key or flat monochrome).
 */
export function isDiscardableTile(
  rgba: Uint8ClampedArray | Uint8Array,
  width = TILE_SIZE,
  height = TILE_SIZE
): boolean {
  const pixelCount = width * height;
  let transparentCount = 0;
  let chromaCount = 0;
  let visibleCount = 0;

  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = rgba[idx] ?? 0;
    const g = rgba[idx + 1] ?? 0;
    const b = rgba[idx + 2] ?? 0;
    const a = rgba[idx + 3] ?? 255;

    if (a < 10) {
      transparentCount++;
      continue;
    }

    // GBA Chroma-key backgrounds
    const isTeal = r >= 95 && r <= 130 && g >= 180 && g <= 220 && b >= 140 && b <= 180;
    const isMagenta = r >= 230 && g <= 30 && b >= 230;
    const isLime = r <= 30 && g >= 230 && b <= 30;
    const isCyan = r <= 30 && g >= 230 && b >= 230;

    if (isTeal || isMagenta || isLime || isCyan) {
      chromaCount++;
      continue;
    }

    visibleCount++;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }

  // 1. If >= 90% is transparent or chroma-key
  if (transparentCount + chromaCount >= Math.floor(pixelCount * 0.9)) {
    return true;
  }

  // 2. Fragment / noise check (<15 visible pixels)
  if (visibleCount < 15) {
    return true;
  }

  // 3. Flat monochrome solid color
  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;
  if (rangeR <= 2 && rangeG <= 2 && rangeB <= 2) {
    return true;
  }

  return false;
}

/**
 * Computes deterministic SHA-256 hash using Web Crypto API.
 */
export async function computeTileHash(rgba: Uint8ClampedArray | Uint8Array): Promise<string> {
  const sourceBuffer: ArrayBuffer = rgba.buffer instanceof ArrayBuffer ? rgba.buffer : new Uint8Array(rgba).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', sourceBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return fullHex.slice(0, 10);
}

/**
 * Converts tile pixel buffer to PNG DataURL (using canvas when available, pure encoder fallback).
 */
export function tilePixelsToDataUrl(
  rgba: Uint8ClampedArray | Uint8Array,
  width = TILE_SIZE,
  height = TILE_SIZE
): string {
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.createImageData(width, height);
        imgData.data.set(rgba);
        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL('image/png');
      }
    } catch {
      // Fallback to pure encoder
    }
  }
  return encodeRgbaToPngDataUrl(rgba, width, height);
}

/**
 * MODO A: Processes an entire tileset sheet into discrete 16x16 tiles.
 */
export async function processTilesetSheet(
  source: RawPixelGrid,
  options: ProcessTilesetOptions
): Promise<SlicedTilesetResult> {
  const registry = options.registry ?? defaultTilesRegistry;
  const filterDiscardable = options.filterDiscardable ?? true;
  const sourceName = options.sourceName ?? 'user_import';

  const cols = Math.ceil(source.width / TILE_SIZE);
  const rows = Math.ceil(source.height / TILE_SIZE);
  const totalSliced = cols * rows;

  const tiles: TileMetadata[] = [];
  let discardedCount = 0;
  let addedCount = 0;
  let reusedCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pixels = extractTilePixels(source, c, r);

      if (filterDiscardable && isDiscardableTile(pixels)) {
        discardedCount++;
        continue;
      }

      const shortHash = await computeTileHash(pixels);
      const tileId = `tile_${options.category}_${shortHash}`;

      const existing = registry.getTileById(tileId);
      if (existing) {
        reusedCount++;
        tiles.push(existing);
        continue;
      }

      const dataUrl = tilePixelsToDataUrl(pixels);
      const collision: TileCollision = options.category === 'water' ? 'water' : options.category === 'elevation' ? true : false;

      const metadata: TileMetadata = {
        id: tileId,
        source: sourceName,
        category: options.category,
        subcategory: 'custom',
        tags: ['custom', 'imported', options.category],
        dimensions: { width: TILE_SIZE, height: TILE_SIZE },
        file_path: dataUrl,
        collision,
        grid_x: c,
        grid_y: r
      };

      registry.registerTile(metadata);
      addedCount++;
      tiles.push(metadata);
    }
  }

  return {
    tiles,
    totalSliced,
    discardedCount,
    addedCount,
    reusedCount
  };
}

/**
 * MODO B: Processes an arbitrary-sized sprite into a multitile Compound Structure.
 */
export async function processCompoundStructure(
  source: RawPixelGrid,
  options: ProcessStructureOptions
): Promise<SlicedStructureResult> {
  const registry = options.registry ?? defaultTilesRegistry;
  const footprintWidth = Math.ceil(source.width / TILE_SIZE);
  const footprintHeight = Math.ceil(source.height / TILE_SIZE);

  const tilesMatrix: string[][] = []; // no-domain: Estructura o identificador procedural de aventura
  const collisionMatrix: StructureCollisionType[][] = [];
  const generatedTiles: TileMetadata[] = [];

  for (let r = 0; r < footprintHeight; r++) {
    const rowTileIds: string[] = []; // no-domain: Estructura o identificador procedural de aventura
    const rowCollisions: StructureCollisionType[] = [];

    for (let c = 0; c < footprintWidth; c++) {
      const pixels = extractTilePixels(source, c, r);
      const shortHash = await computeTileHash(pixels);
      const tileId = `tile_struct_${options.id}_r${r}_c${c}_${shortHash}`;

      // Check if pixel is empty
      let visiblePixels = 0;
      for (let p = 0; p < pixels.length; p += 4) {
        if ((pixels[p + 3] ?? 0) >= 10) visiblePixels++;
      }

      const isCellSolid = visiblePixels > 20;
      const userCol = options.collisionMask?.[r]?.[c];
      const collisionType: StructureCollisionType = userCol !== undefined ? userCol : (isCellSolid ? 1 : 0);

      rowCollisions.push(collisionType);

      if (visiblePixels === 0) {
        rowTileIds.push('');
        continue;
      }

      let existing = registry.getTileById(tileId);
      if (!existing) {
        const dataUrl = tilePixelsToDataUrl(pixels);
        existing = {
          id: tileId,
          source: `struct_${options.id}`,
          category: 'structures',
          subcategory: 'custom_prefab',
          tags: ['custom', 'structure', options.id],
          dimensions: { width: TILE_SIZE, height: TILE_SIZE },
          file_path: dataUrl,
          collision: collisionType === 1 ? true : collisionType === 2 ? 'water' : false,
          grid_x: c,
          grid_y: r
        };
        registry.registerTile(existing);
      }

      generatedTiles.push(existing);
      rowTileIds.push(tileId);
    }

    tilesMatrix.push(rowTileIds);
    collisionMatrix.push(rowCollisions);
  }

  const template: StructureTemplate = {
    id: options.id,
    name: options.name,
    theme: options.theme ?? 'universal',
    footprint: { width: footprintWidth, height: footprintHeight },
    tiles: tilesMatrix,
    collisionMask: collisionMatrix,
    interiorMapId: options.interiorMapId,
    defaultSpawnId: options.defaultSpawnId
  };

  registerStructureTemplate(template);

  return {
    template,
    generatedTiles,
    footprint: { width: footprintWidth, height: footprintHeight }
  };
}
