/**
 * scripts/map/generate_ports_4_facings_showcase.ts
 *
 * Renders high-resolution 1:1 inspection crops of Vermilion Port & Dock Terminal
 * in all 4 cardinal directions (North, South, East, West).
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildMapBlitInstructions,
  resolveTileUrl
} from '../../src/logic/map/canvasTileRenderer.ts';
import { resolveWaterCoastGrid, type WaterTerrainKind } from '../../src/logic/map/waterAutotileEngine.ts';
import { resolveMountainMapGrid } from '../../src/logic/map/mountainAutotileEngine.ts';
import { resolvePortGateAsset } from '../../src/logic/map/canvasLandmarkRenderer.ts';
import type { ContinentMapResult } from '../../src/logic/map/continentGenerator.ts';
import type { POINode, CardinalDirection } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_DIM = 26; // 26x26 tiles per showcase
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly dataU32: Uint32Array;
}
const rawCache = new Map<string, RawImage | null>();

const SEARCH_DIRS = [
  path.resolve(ROOT_DIR, 'public'),
  path.resolve(ROOT_DIR, 'public/assets'),
  path.resolve(ROOT_DIR, 'public/assets/tiles'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/water'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/terrain'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/infrastructure'),
  path.resolve(ROOT_DIR, 'public/assets/canon/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/canon/props'),
  path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure')
];

function findTilePath(filename: string): string | null {
  const rel = resolveTileUrl(filename);
  const directPath = path.join(ROOT_DIR, 'public', rel);
  if (fs.existsSync(directPath)) return directPath;

  for (const dir of SEARCH_DIRS) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function getRawTile(filename: string): Promise<RawImage | null> {
  const filePath = findTilePath(filename);
  if (!filePath) return null;

  if (rawCache.has(filePath)) return rawCache.get(filePath)!;
  try {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const dataU32 = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
    const img: RawImage = { width: info.width, height: info.height, dataU32 };
    rawCache.set(filePath, img);
    return img;
  } catch {
    rawCache.set(filePath, null);
    return null;
  }
}

async function renderPortFacing(facing: CardinalDirection): Promise<Buffer> {
  const W = MAP_DIM;
  const H = MAP_DIM;
  const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  const isWestOrEast = facing === 'west' || facing === 'east';
  const portW = isWestOrEast ? 6 : 7;
  const portH = isWestOrEast ? 7 : 6;

  let portX = 0;
  let portY = 0;

  if (facing === 'south') {
    // Land on rows 0..9, Sand on 7..9, Water on 10..H-1
    for (let r = 0; r < 7; r++) terrainMatrix[r]!.fill('grass');
    for (let r = 7; r <= 9; r++) terrainMatrix[r]!.fill('sand');
    portX = 9;
    portY = 4;
    // Inland approach path
    for (let r = 0; r <= 4; r++) pathGrid[r]![portX + 3] = true;
    // Pier extending south over water
    for (let r = portY + portH; r < portY + portH + 8; r++) {
      bridgeGrid[r]![portX + 2] = true;
      bridgeGrid[r]![portX + 3] = true;
      bridgeGrid[r]![portX + 4] = true;
    }
  } else if (facing === 'north') {
    // Water on 0..15, Sand on 16..18, Land on 19..H-1
    for (let r = 16; r <= 18; r++) terrainMatrix[r]!.fill('sand');
    for (let r = 19; r < H; r++) terrainMatrix[r]!.fill('grass');
    portX = 9;
    portY = 16;
    // Inland approach path
    for (let r = portY + portH; r < H; r++) pathGrid[r]![portX + 3] = true;
    // Pier extending north over water
    for (let r = portY - 8; r < portY; r++) {
      bridgeGrid[r]![portX + 2] = true;
      bridgeGrid[r]![portX + 3] = true;
      bridgeGrid[r]![portX + 4] = true;
    }
  } else if (facing === 'east') {
    // Land on cols 0..6, Sand on 7..9, Water on 10..W-1
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < 7; c++) terrainMatrix[r]![c] = 'grass';
      for (let c = 7; c <= 9; c++) terrainMatrix[r]![c] = 'sand';
    }
    portX = 4;
    portY = 9;
    // Inland approach path
    for (let c = 0; c <= 4; c++) pathGrid[portY + 3]![c] = true;
    // Pier extending east over water
    for (let c = portX + portW; c < portX + portW + 8; c++) {
      bridgeGrid[portY + 2]![c] = true;
      bridgeGrid[portY + 3]![c] = true;
      bridgeGrid[portY + 4]![c] = true;
    }
  } else if (facing === 'west') {
    // Water on 0..15, Sand on 16..18, Land on 19..W-1
    for (let r = 0; r < H; r++) {
      for (let c = 16; c <= 18; c++) terrainMatrix[r]![c] = 'sand';
      for (let c = 19; c < W; c++) terrainMatrix[r]![c] = 'grass';
    }
    portX = 16;
    portY = 9;
    // Inland approach path
    for (let c = portX + portW; c < W; c++) pathGrid[portY + 3]![c] = true;
    // Pier extending west over water
    for (let c = portX - 8; c < portX; c++) {
      bridgeGrid[portY + 2]![c] = true;
      bridgeGrid[portY + 3]![c] = true;
      bridgeGrid[portY + 4]![c] = true;
    }
  }

  const resolvedWater = resolveWaterCoastGrid(terrainMatrix);
  const resolvedMountain = resolveMountainMapGrid(heightmap, { palette: 'brown' });

  const cells = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => ({
      x,
      y,
      terrain: terrainMatrix[y]![x]!,
      elevation: heightmap[y]![x]!,
      isWalkable: terrainMatrix[y]![x] !== 'water',
      layerStack: [] as readonly string[] // domain-ok: Identificador o estructura procedural de aventura
    }))
  );

  const continent: ContinentMapResult = {
    width: W,
    height: H,
    seed: 42,
    terrainMatrix,
    heightmap,
    resolvedWater,
    resolvedMountain,
    placedStairs: [],
    cells,
    mountainPalette: 'brown'
  };

  const portPOI: POINode = {
    id: `port_${facing}`,
    name: `Puerto Carmín (${facing.toUpperCase()})`,
    type: 'port_dock',
    footprint: { width: portW, height: portH },
    gridX: portX,
    gridY: portY,
    elevation: 0,
    facing,
    buildingFile: resolvePortGateAsset(facing),
    terrainPreference: 'coast_water',
    hasGym: false
  };

  const { instructions } = buildMapBlitInstructions(
    continent,
    [portPOI],
    pathGrid,
    bridgeGrid
  );

  const canvasWidth = W * TILE_SIZE;
  const canvasHeight = H * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);
  const canvasU32 = new Uint32Array(canvasBuffer.buffer, canvasBuffer.byteOffset, canvasBuffer.byteLength / 4);

  // Deep ocean background
  canvasU32.fill(0xff402010);

  const blitTile = (img: RawImage, destX: number, destY: number): void => {
    const { width: tw, height: th, dataU32 } = img;
    for (let r = 0; r < th; r++) {
      const dy = destY + r;
      if (dy < 0 || dy >= canvasHeight) continue;
      const srcOffset = r * tw;
      const dstOffset = dy * canvasWidth;
      for (let c = 0; c < tw; c++) {
        const dx = destX + c;
        if (dx < 0 || dx >= canvasWidth) continue;
        const pixel = dataU32[srcOffset + c]!;
        const alpha = pixel >>> 24;
        if (alpha === 0) continue;
        const dstIdx = dstOffset + dx;
        if (alpha === 255) {
          canvasU32[dstIdx] = pixel;
        } else {
          const a = alpha / 255;
          const invA = 1 - a;
          const bg = canvasU32[dstIdx]!;
          const rD = (((pixel & 0xFF) * a) + ((bg & 0xFF) * invA)) | 0;
          const gD = ((((pixel >> 8) & 0xFF) * a) + (((bg >> 8) & 0xFF) * invA)) | 0;
          const bD = ((((pixel >> 16) & 0xFF) * a) + (((bg >> 16) & 0xFF) * invA)) | 0;
          canvasU32[dstIdx] = (255 << 24) | (bD << 16) | (gD << 8) | rD;
        }
      }
    }
  };

  for (const inst of instructions) {
    const img = await getRawTile(inst.filename);
    if (img) {
      blitTile(img, inst.px, inst.py);
    }
  }

  return sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    }
  })
    .png({ compressionLevel: 6 })
    .toBuffer();
}

async function run(): Promise<void> {
  console.log('--- GENERATING PORTS IN ALL 4 CARDINAL ORIENTATIONS ---');
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  const directions: readonly CardinalDirection[] = ['north', 'south', 'east', 'west'];
  const buffers = new Map<CardinalDirection, Buffer>();

  for (const dir of directions) {
    console.log(`Renderizando puerto con orientación: ${dir.toUpperCase()}...`);
    const buf = await renderPortFacing(dir);
    buffers.set(dir, buf);

    const filename = `puerto_orientacion_${dir}.png`;
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    const scratchPath = path.join(SCRATCH_DIR, filename);

    fs.writeFileSync(artifactPath, buf);
    fs.writeFileSync(scratchPath, buf);
    console.log(`-> Guardado: ${artifactPath}`);
  }

  // Assemble 2x2 collage
  console.log('Ensamblando comparativa 2x2 de los 4 puertos...');
  const patchPx = MAP_DIM * TILE_SIZE; // 832x832 px
  const collageW = patchPx * 2;
  const collageH = patchPx * 2;

  const collageBuf = await sharp({
    create: {
      width: collageW,
      height: collageH,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  })
    .composite([
      { input: buffers.get('north')!, left: 0, top: 0 },
      { input: buffers.get('south')!, left: patchPx, top: 0 },
      { input: buffers.get('east')!, left: 0, top: patchPx },
      { input: buffers.get('west')!, left: patchPx, top: patchPx }
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();

  const collageArtifact = path.join(ARTIFACT_DIR, 'puertos_comparativa_4_orientaciones.png');
  const collageScratch = path.join(SCRATCH_DIR, 'puertos_comparativa_4_orientaciones.png');
  fs.writeFileSync(collageArtifact, collageBuf);
  fs.writeFileSync(collageScratch, collageBuf);
  console.log(`-> Guardada comparativa 2x2 en: ${collageArtifact}`);
}

run().catch(console.error);
