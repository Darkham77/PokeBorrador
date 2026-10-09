/**
 * scripts/map/generate_ports_redesign_preview.ts
 *
 * Generates visual mockups of the proposed port redesign across all 4 cardinal facings:
 * - SOUTH: Canonical Vermilion port (unchanged baseline).
 * - EAST: Upright pillars framing shore entrance, horizontal pier, canonical side-view catamaran (poke_ship_seagallop_east).
 * - WEST: Upright pillars framing shore entrance, horizontal pier, canonical side-view catamaran (poke_ship_seagallop_west).
 * - NORTH: Upright pillars framing shore entrance, vertical pier, horizontally moored catamaran at pierhead.
 *
 * Also outputs:
 * 1. Individual 832x832 px renders for each facing.
 * 2. 2x2 collage of all 4 redesigned facings.
 * 3. Side-by-side BEFORE vs AFTER comparison collage.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { resolveWaterCoastGrid, type WaterTerrainKind } from '../../src/logic/map/waterAutotileEngine.ts';
import { resolveCanonicalBridges } from '../../src/logic/map/canonicalBridgeEngine.ts';
import type { CardinalDirection } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_DIM = 26; // 26x26 tiles = 832x832 px
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
  path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/infrastructure'),
  path.resolve(ROOT_DIR, 'public/assets/canon/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/canon/props'),
  path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure')
];

function findTilePath(filename: string): string | null {
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
    const img: RawImage = {
      width: info.width,
      height: info.height,
      dataU32: new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4)
    };
    rawCache.set(filePath, img);
    return img;
  } catch {
    rawCache.set(filePath, null);
    return null;
  }
}

interface SpriteStamp {
  readonly file: string;
  readonly px: number;
  readonly py: number;
  readonly ySort: number;
}

async function renderRedesignedPort(facing: CardinalDirection): Promise<Buffer> {
  const W = MAP_DIM;
  const H = MAP_DIM;

  const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const stamps: SpriteStamp[] = [];

  if (facing === 'south') {
    // Land on 0..7, Sand on 7..9, Water on 10..H-1
    for (let r = 0; r < 7; r++) terrainMatrix[r]!.fill('grass');
    for (let r = 7; r <= 9; r++) terrainMatrix[r]!.fill('sand');
    const portX = 9;
    const portY = 4;
    for (let r = 0; r <= 4; r++) pathGrid[r]![portX + 3] = true;

    // Gatehouse
    stamps.push({
      file: 'poke_port_vermilion_gate.png',
      px: portX * TILE_SIZE,
      py: portY * TILE_SIZE,
      ySort: (portY + 6) * TILE_SIZE
    });

    // Pier extending south
    for (let r = portY + 6; r < portY + 14; r++) {
      bridgeGrid[r]![portX + 2] = true;
      bridgeGrid[r]![portX + 3] = true;
      bridgeGrid[r]![portX + 4] = true;
    }

    // Moored ferry at south end
    stamps.push({
      file: 'poke_ship_ferry_docked.png',
      px: portX * TILE_SIZE,
      py: (portY + 14) * TILE_SIZE,
      ySort: (portY + 19) * TILE_SIZE
    });

    // Props
    stamps.push({ file: 'poke_port_dock_truck.png', px: (portX + 7) * TILE_SIZE, py: (portY + 2) * TILE_SIZE, ySort: (portY + 4) * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_double.png', px: (portX - 3) * TILE_SIZE, py: (portY + 2) * TILE_SIZE, ySort: (portY + 4) * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_stack.png', px: (portX + 7) * TILE_SIZE, py: (portY - 1) * TILE_SIZE, ySort: (portY + 1) * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: (portX - 2) * TILE_SIZE, py: (portY + 5) * TILE_SIZE, ySort: (portY + 6) * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: (portX + 6) * TILE_SIZE, py: (portY + 5) * TILE_SIZE, ySort: (portY + 6) * TILE_SIZE });

  } else if (facing === 'east') {
    // Land on cols 0..6, Sand on 7..9, Water on 10..W-1
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < 7; c++) terrainMatrix[r]![c] = 'grass';
      for (let c = 7; c <= 9; c++) terrainMatrix[r]![c] = 'sand';
    }

    const pierY = 11; // 3-tile wide pier on rows 11, 12, 13
    const shoreCol = 9; // Beach ends at col 9, water begins at col 10

    // Inland approach path
    for (let c = 0; c <= shoreCol; c++) pathGrid[pierY + 1]![c] = true;

    // Upright Beacon Columns framing the pier entrance on the shore
    // Pier occupies rows 11..13. Beacon image is 64x128 (2x4 tiles).
    // Top column base sits on row 10 (above pier row 11) -> py = 7 * TILE_SIZE
    // Bottom column top sits on row 14 (below pier row 13) -> py = 14 * TILE_SIZE
    stamps.push({
      file: 'poke_port_lighthouse_beacon.png',
      px: (shoreCol - 2) * TILE_SIZE,
      py: (pierY - 4) * TILE_SIZE,
      ySort: (pierY) * TILE_SIZE
    });
    stamps.push({
      file: 'poke_port_lighthouse_beacon.png',
      px: (shoreCol - 2) * TILE_SIZE,
      py: (pierY + 3) * TILE_SIZE,
      ySort: (pierY + 7) * TILE_SIZE
    });

    // Horizontal pier extending East from between the columns onto the ocean (cols 8 to 19)
    for (let c = 8; c <= 19; c++) {
      bridgeGrid[pierY]![c] = true;
      bridgeGrid[pierY + 1]![c] = true;
      bridgeGrid[pierY + 2]![c] = true;
    }

    // Moored Catamaran: genuine 2.5D Seagallop Catamaran (160x96 px = 5x3 tiles)
    // Docked at the pierhead / alongside the eastern pier tip facing open water!
    stamps.push({
      file: 'poke_ship_seagallop_east.png',
      px: 19 * TILE_SIZE,
      py: (pierY) * TILE_SIZE,
      ySort: (pierY + 3) * TILE_SIZE + 10
    });

    // Shoreline props: Bollard chains strictly on dry land (cols 7..8, safe from water col 10)
    stamps.push({ file: 'poke_port_dock_truck.png', px: 2 * TILE_SIZE, py: 6 * TILE_SIZE, ySort: 8 * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_double.png', px: 2 * TILE_SIZE, py: 15 * TILE_SIZE, ySort: 16 * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_stack.png', px: 2 * TILE_SIZE, py: 17 * TILE_SIZE, ySort: 19 * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: 7 * TILE_SIZE, py: 6 * TILE_SIZE, ySort: 7 * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: 7 * TILE_SIZE, py: 18 * TILE_SIZE, ySort: 19 * TILE_SIZE });

  } else if (facing === 'west') {
    // Water on cols 0..15, Sand on 16..18, Land on 19..W-1
    for (let r = 0; r < H; r++) {
      for (let c = 16; c <= 18; c++) terrainMatrix[r]![c] = 'sand';
      for (let c = 19; c < W; c++) terrainMatrix[r]![c] = 'grass';
    }

    const pierY = 11;
    const shoreCol = 16;

    // Inland approach path
    for (let c = shoreCol; c < W; c++) pathGrid[pierY + 1]![c] = true;

    // Upright Beacon Columns framing the entrance on the beach
    // Clear of pier walkway rows 11..13
    stamps.push({
      file: 'poke_port_lighthouse_beacon.png',
      px: (shoreCol + 1) * TILE_SIZE,
      py: (pierY - 4) * TILE_SIZE,
      ySort: (pierY) * TILE_SIZE
    });
    stamps.push({
      file: 'poke_port_lighthouse_beacon.png',
      px: (shoreCol + 1) * TILE_SIZE,
      py: (pierY + 3) * TILE_SIZE,
      ySort: (pierY + 7) * TILE_SIZE
    });

    // Horizontal pier extending West from between the columns onto the ocean (cols 6 to 17)
    for (let c = 6; c <= 17; c++) {
      bridgeGrid[pierY]![c] = true;
      bridgeGrid[pierY + 1]![c] = true;
      bridgeGrid[pierY + 2]![c] = true;
    }

    // Moored Catamaran: genuine 2.5D Seagallop Catamaran (facing West)
    stamps.push({
      file: 'poke_ship_seagallop_west.png',
      px: (6 * TILE_SIZE) - 160,
      py: (pierY) * TILE_SIZE,
      ySort: (pierY + 3) * TILE_SIZE + 10
    });

    // Shoreline props: Bollard chains strictly on dry land (cols 17..18, safe from water col 15)
    stamps.push({ file: 'poke_port_dock_truck.png', px: 21 * TILE_SIZE, py: 6 * TILE_SIZE, ySort: 8 * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_double.png', px: 21 * TILE_SIZE, py: 15 * TILE_SIZE, ySort: 16 * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_stack.png', px: 21 * TILE_SIZE, py: 17 * TILE_SIZE, ySort: 19 * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: 17 * TILE_SIZE, py: 6 * TILE_SIZE, ySort: 7 * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: 17 * TILE_SIZE, py: 18 * TILE_SIZE, ySort: 19 * TILE_SIZE });

  } else if (facing === 'north') {
    // Water on 0..15, Sand on 16..18, Land on 19..H-1
    for (let r = 16; r <= 18; r++) terrainMatrix[r]!.fill('sand');
    for (let r = 19; r < H; r++) terrainMatrix[r]!.fill('grass');

    const pierX = 11; // 3-tile wide pier on cols 11, 12, 13
    const shoreRow = 16;

    // Inland approach path
    for (let r = shoreRow + 2; r < H; r++) pathGrid[r]![pierX + 1] = true;

    // Upright Beacon Columns framing the pier entrance on the dry sand (left and right)
    // Pier spans cols 11..13. Left column at cols 8..9, Right column at cols 15..16.
    // Base sits on row 18 (sand/grass), safely away from water at row 15.
    stamps.push({
      file: 'poke_port_lighthouse_beacon.png',
      px: (pierX - 3) * TILE_SIZE,
      py: (shoreRow - 1) * TILE_SIZE,
      ySort: (shoreRow + 3) * TILE_SIZE
    });
    stamps.push({
      file: 'poke_port_lighthouse_beacon.png',
      px: (pierX + 4) * TILE_SIZE,
      py: (shoreRow - 1) * TILE_SIZE,
      ySort: (shoreRow + 3) * TILE_SIZE
    });

    // Vertical pier extending North from between the columns onto the ocean (rows 7 to 17)
    for (let r = 7; r <= 17; r++) {
      bridgeGrid[r]![pierX] = true;
      bridgeGrid[r]![pierX + 1] = true;
      bridgeGrid[r]![pierX + 2] = true;
    }

    // At the north pierhead: a horizontal landing pierhead (T-dock)
    for (let c = pierX - 2; c <= pierX + 4; c++) {
      bridgeGrid[6]![c] = true;
      bridgeGrid[7]![c] = true;
    }

    // Moored Catamaran docked alongside the northern pierhead facing East/West
    stamps.push({
      file: 'poke_ship_seagallop_east.png',
      px: (pierX - 1) * TILE_SIZE,
      py: 3 * TILE_SIZE,
      ySort: 6 * TILE_SIZE
    });

    // Shoreline props: Bollards at row 18, strictly on dry land safe from water row 15
    stamps.push({ file: 'poke_port_dock_truck.png', px: 18 * TILE_SIZE, py: 21 * TILE_SIZE, ySort: 23 * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_double.png', px: 4 * TILE_SIZE, py: 21 * TILE_SIZE, ySort: 22 * TILE_SIZE });
    stamps.push({ file: 'poke_port_cargo_crates_stack.png', px: 4 * TILE_SIZE, py: 23 * TILE_SIZE, ySort: 25 * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: 5 * TILE_SIZE, py: 18 * TILE_SIZE, ySort: 19 * TILE_SIZE });
    stamps.push({ file: 'poke_port_bollard_chains.png', px: 17 * TILE_SIZE, py: 18 * TILE_SIZE, ySort: 19 * TILE_SIZE });
  }

  const resolvedWater = resolveWaterCoastGrid(terrainMatrix);

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

  const canvasWidth = W * TILE_SIZE;
  const canvasHeight = H * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);
  const canvasU32 = new Uint32Array(canvasBuffer.buffer, canvasBuffer.byteOffset, canvasBuffer.byteLength / 4);

  // Background
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
          const br = bg & 0xff;
          const bgCol = (bg >> 8) & 0xff;
          const bb = (bg >> 16) & 0xff;
          const sr = pixel & 0xff;
          const sg = (pixel >> 8) & 0xff;
          const sb = (pixel >> 16) & 0xff;
          const outR = Math.round(sr * a + br * invA);
          const outG = Math.round(sg * a + bgCol * invA);
          const outB = Math.round(sb * a + bb * invA);
          canvasU32[dstIdx] = (255 << 24) | (outB << 16) | (outG << 8) | outR;
        }
      }
    }
  };

  // 1. Terrain Pass (water, sand, grass)
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;
      const t = terrainMatrix[r]![c];
      const waterCell = resolvedWater.cellDetails[r]?.[c];
      if (t === 'water') {
        if (waterCell && waterCell.terrain === 'water') {
          for (const tile of waterCell.layerStack) {
            const img = await getRawTile(tile);
            if (img) blitTile(img, px, py);
          }
        } else {
          const img = await getRawTile('poke_water_ocean_center.png');
          if (img) blitTile(img, px, py);
        }
      } else if (t === 'sand') {
        if (waterCell && waterCell.terrain === 'sand') {
          for (const tile of waterCell.layerStack) {
            const img = await getRawTile(tile);
            if (img) blitTile(img, px, py);
          }
        } else {
          const img = await getRawTile('poke_sand_water_center.png');
          if (img) blitTile(img, px, py);
        }
      } else {
        const img = await getRawTile('poke_grass_plain.png');
        if (img) blitTile(img, px, py);
      }
    }
  }

  // 2. Paths
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (pathGrid[r]![c] && terrainMatrix[r]![c] === 'grass') {
        const img = await getRawTile('poke_path_dirt_center.png');
        if (img) blitTile(img, c * TILE_SIZE, r * TILE_SIZE);
      }
    }
  }

  // 3. Piers & Bridges
  const isPortDockCell = (cx: number, cy: number): boolean => Boolean(bridgeGrid[cy]?.[cx]);
  const bridgeBlits = resolveCanonicalBridges(bridgeGrid, cells, { isPortDockCell });
  for (const b of bridgeBlits) {
    const img = await getRawTile(b.file);
    if (img) blitTile(img, b.x * TILE_SIZE, b.y * TILE_SIZE);
  }

  // 4. Sorted Standing Stamps (Pillars, Buildings, Ships, Props sorted by ySort)
  stamps.sort((a, b) => a.ySort - b.ySort);
  for (const s of stamps) {
    const img = await getRawTile(s.file);
    if (img) {
      blitTile(img, s.px, s.py);
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
  console.log('--- GENERATING REDESIGNED PORTS IN ALL 4 ORIENTATIONS ---');
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  const directions: readonly CardinalDirection[] = ['north', 'south', 'east', 'west'];
  const newBuffers = new Map<CardinalDirection, Buffer>();

  for (const dir of directions) {
    console.log(`Renderizando rediseño: ${dir.toUpperCase()}...`);
    const buf = await renderRedesignedPort(dir);
    newBuffers.set(dir, buf);

    const filename = `puerto_redisenado_${dir}.png`;
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    const scratchPath = path.join(SCRATCH_DIR, filename);

    fs.writeFileSync(artifactPath, buf);
    fs.writeFileSync(scratchPath, buf);
    console.log(`-> Guardado: ${artifactPath}`);
  }

  // 1. Assemble 2x2 collage of REDESIGNED ports
  console.log('Ensamblando comparativa 2x2 del rediseño...');
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
      { input: newBuffers.get('north')!, left: 0, top: 0 },
      { input: newBuffers.get('south')!, left: patchPx, top: 0 },
      { input: newBuffers.get('east')!, left: 0, top: patchPx },
      { input: newBuffers.get('west')!, left: patchPx, top: patchPx }
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();

  const collageArtifact = path.join(ARTIFACT_DIR, 'puertos_redisenados_comparativa_2x2.png');
  fs.writeFileSync(collageArtifact, collageBuf);
  console.log(`-> Guardada comparativa rediseñada en: ${collageArtifact}`);

  // 2. Assemble BEFORE vs AFTER comparison (East & West & North)
  console.log('Ensamblando comparativa ANTES vs DESPUES...');
  const oldEast = fs.readFileSync(path.join(ARTIFACT_DIR, 'puerto_orientacion_east.png'));
  const oldWest = fs.readFileSync(path.join(ARTIFACT_DIR, 'puerto_orientacion_west.png'));
  const oldNorth = fs.readFileSync(path.join(ARTIFACT_DIR, 'puerto_orientacion_north.png'));

  // 3-row, 2-column comparison: Left = ANTES (Rotación plana), Right = DESPUÉS (Canónico 2.5D)
  const compW = patchPx * 2;
  const compH = patchPx * 3;

  const beforeAfterBuf = await sharp({
    create: {
      width: compW,
      height: compH,
      channels: 4,
      background: { r: 10, g: 15, b: 30, alpha: 1 }
    }
  })
    .composite([
      // Row 1: North (Antes vs Después)
      { input: oldNorth, left: 0, top: 0 },
      { input: newBuffers.get('north')!, left: patchPx, top: 0 },
      // Row 2: East (Antes vs Después)
      { input: oldEast, left: 0, top: patchPx },
      { input: newBuffers.get('east')!, left: patchPx, top: patchPx },
      // Row 3: West (Antes vs Después)
      { input: oldWest, left: 0, top: patchPx * 2 },
      { input: newBuffers.get('west')!, left: patchPx, top: patchPx * 2 }
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();

  const beforeAfterArtifact = path.join(ARTIFACT_DIR, 'puertos_antes_vs_despues_comparativa.png');
  fs.writeFileSync(beforeAfterArtifact, beforeAfterBuf);
  console.log(`-> Guardada comparativa Antes vs Después en: ${beforeAfterArtifact}`);
}

run().catch((err) => {
  console.error('Fatal error rendering redesigned ports:', err);
  process.exit(1);
});
