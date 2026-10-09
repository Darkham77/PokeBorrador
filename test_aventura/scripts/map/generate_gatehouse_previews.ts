/**
 * scripts/map/generate_gatehouse_previews.ts
 *
 * GENERADOR DE VISTAS PREVIAS HD PARA EL PUNTO 5:
 * Casas de Guardia / Garitas de Ruta (`route_gate` / `gatehouses`) y Conexión de Rutas
 *
 * 1. Variante 1: Garita de Ruta Silvestre / Forestal (Vallas rústicas de madera, muros de árboles, letrero y sendero continuo)
 * 2. Variante 2: Garita de Desfiladero / Cañón de Montaña (Acantilados de roca pura flanqueantes, peñascos y escombros)
 * 3. Variante 3: Garita Fronteriza de Acceso a Metrópolis (Transición de sendero de tierra a avenida urbana con farolas simétricas y jardineras)
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { resolvePathGrid } from '../../src/logic/map/pathAutotileEngine.ts';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/settlements');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

for (const dir of [SCRATCH_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const TILE_SIZE = 32;

function findAssetPath(filename: string): string {
  const candidates = [
    path.join(ROOT_DIR, 'public/assets/tiles', filename),
    path.join(ROOT_DIR, 'public/assets/prefabs', filename),
    path.join(ROOT_DIR, 'public/assets/prefabs/buildings', filename),
    path.join(ROOT_DIR, 'public/assets/prefabs/props', filename),
    path.join(ROOT_DIR, 'public/assets/prefabs/infrastructure', filename),
    path.join(ROOT_DIR, 'public/assets/prefabs/vegetation', filename),
    path.join(ROOT_DIR, 'public/assets/canon/buildings', filename),
    path.join(ROOT_DIR, 'public/assets/canon/props', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/elevation', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/elevation/brown', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/elevation/gray', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/water', filename),
    path.join(ROOT_DIR, 'public/assets/essentials/prefabs/buildings', filename),
    path.join(ROOT_DIR, 'public/assets/essentials/prefabs/props', filename),
    path.join(ROOT_DIR, 'public/assets/essentials/prefabs/vegetation', filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(ROOT_DIR, 'public/assets/tiles', filename);
}

const imageBufferCache = new Map<string, Buffer>();
function getImgBuffer(filename: string): Buffer {
  const cached = imageBufferCache.get(filename);
  if (cached) return cached;
  const fullPath = findAssetPath(filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Asset not found: ${filename} at ${fullPath}`);
  }
  const buf = fs.readFileSync(fullPath);
  imageBufferCache.set(filename, buf);
  return buf;
}

/**
 * Builds the canonical GBA Route Gatehouse sprite (6x7 tiles = 192x224 px)
 * stitched directly from firered_tileset_1.png with 100% mathematical symmetry.
 */
async function getCanonicalGatehouseBuffer(): Promise<Buffer> {
  const cacheKey = '__canonical_gatehouse_6x7__';
  const cached = imageBufferCache.get(cacheKey);
  if (cached) return cached;

  const sheet1Path = path.resolve(ROOT_DIR, 'public/assets/raw/firered_leafgreen/firered_tileset_1.png');
  const cols = [27, 28, 29, 30, 31, 32];
  const rows = [7, 8, 9, 10, 11, 12, 13];

  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const sx = cols[c]! * 17;
      const sy = 7 + rows[r]! * 17;
      const buf = await sharp(sheet1Path)
        .extract({ left: sx, top: sy, width: 16, height: 16 })
        .resize(TILE_SIZE, TILE_SIZE, { kernel: 'nearest' })
        .toBuffer();
      composites.push({ input: buf, left: c * TILE_SIZE, top: r * TILE_SIZE });
    }
  }

  const resultBuf = await sharp({
    create: {
      width: 6 * TILE_SIZE,
      height: 7 * TILE_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  imageBufferCache.set(cacheKey, resultBuf);
  return resultBuf;
}

interface BlitItem {
  file?: string;
  buffer?: Buffer;
  px: number;
  py: number;
  ySort?: number;
}

async function renderCanvas(
  widthTiles: number,
  heightTiles: number,
  baseTileFile: string,
  blits: BlitItem[],
  outputBasename: string
): Promise<void> {
  const canvasW = widthTiles * TILE_SIZE;
  const canvasH = heightTiles * TILE_SIZE;

  const baseBuf = getImgBuffer(baseTileFile);
  const baseSharp = sharp(baseBuf).resize(TILE_SIZE, TILE_SIZE);
  const baseResizedBuf = await baseSharp.toBuffer();

  const compositeOps: sharp.OverlayOptions[] = [];

  // 1. Base floor fill
  for (let y = 0; y < heightTiles; y++) {
    for (let x = 0; x < widthTiles; x++) {
      compositeOps.push({
        input: baseResizedBuf,
        left: x * TILE_SIZE,
        top: y * TILE_SIZE
      });
    }
  }

  // 2. Y-sorted blits
  const sortedBlits = [...blits].sort((a, b) => {
    const ya = a.ySort ?? a.py;
    const yb = b.ySort ?? b.py;
    return ya - yb;
  });

  for (let i = 0; i < sortedBlits.length; i++) {
    const item = sortedBlits[i]!;
    const buf = item.buffer ?? (item.file ? getImgBuffer(item.file) : null);
    if (!buf) continue;
    compositeOps.push({
      input: buf,
      left: item.px,
      top: item.py
    });
  }

  const finalImg = sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 112, g: 200, b: 160, alpha: 1 }
    }
  }).composite(compositeOps);

  const pngBuf = await finalImg.png().toBuffer();
  fs.writeFileSync(path.join(SCRATCH_DIR, outputBasename), pngBuf);
  fs.writeFileSync(path.join(ARTIFACT_DIR, outputBasename), pngBuf);
  console.log(`✅ Rendered: ${outputBasename} (${canvasW}x${canvasH} px)`);
}

// ----------------------------------------------------------------------------
// 1. VARIANTE 1: Garita de Ruta Forestal / Rural
// ----------------------------------------------------------------------------
async function generateForestGatehouse(): Promise<void> {
  const W = 16;
  const H = 16;
  const blits: BlitItem[] = [];

  const gateX = 5;
  const gateY = 4;
  const gateBuf = await getCanonicalGatehouseBuffer();

  // 1. Continuous Autotiled Dirt Path (x=7..8) running through gate (y=0..3 north, y=11..15 south)
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    pathGrid[y]![7] = true;
    pathGrid[y]![8] = true;
  }
  const resolved = resolvePathGrid(pathGrid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = resolved.pathDetails[y]?.[x];
      if (cell) {
        blits.push({ file: cell.primaryTile, px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
        if (cell.overlayTiles) {
          for (const ov of cell.overlayTiles) {
            blits.push({ file: ov, px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
          }
        }
      }
    }
  }

  // 2. Canonical Gatehouse (6x7 tiles, ySort at base of steps: y = 11 * TILE_SIZE)
  blits.push({
    buffer: gateBuf,
    px: gateX * TILE_SIZE,
    py: gateY * TILE_SIZE,
    ySort: (gateY + 7) * TILE_SIZE
  });

  // 3. Hermetic Lateral Barrier Fences (x=1..4 and x=11..14 at y=7)
  for (let x = 1; x < gateX; x++) {
    blits.push({
      file: 'poke_fence_wood_h.png',
      px: x * TILE_SIZE,
      py: 7 * TILE_SIZE,
      ySort: 7.5 * TILE_SIZE
    });
  }
  for (let x = gateX + 6; x < W - 1; x++) {
    blits.push({
      file: 'poke_fence_wood_h.png',
      px: x * TILE_SIZE,
      py: 7 * TILE_SIZE,
      ySort: 7.5 * TILE_SIZE
    });
  }

  // 4. Impenetrable Forest Tree Walls North of the Fence
  // Left forest wall (x=0..4, y=0..6)
  for (let y = 0; y < 6; y += 2) {
    for (let x = 0; x < 4; x += 2) {
      blits.push({
        file: 'poke_tree_oak_clean.png',
        px: x * TILE_SIZE,
        py: y * TILE_SIZE,
        ySort: (y + 2) * TILE_SIZE
      });
    }
  }
  // Right forest wall (x=11..14, y=0..6)
  for (let y = 0; y < 6; y += 2) {
    for (let x = 11; x < 15; x += 2) {
      blits.push({
        file: 'poke_tree_oak_clean.png',
        px: x * TILE_SIZE,
        py: y * TILE_SIZE,
        ySort: (y + 2) * TILE_SIZE
      });
    }
  }

  // 5. Southern Route Dressing
  // Flanking trees bordering route
  for (let y = 10; y < 15; y += 2) {
    blits.push({ file: 'poke_tree_oak_clean.png', px: 1 * TILE_SIZE, py: y * TILE_SIZE, ySort: (y + 2) * TILE_SIZE });
    blits.push({ file: 'poke_tree_oak_clean.png', px: 13 * TILE_SIZE, py: y * TILE_SIZE, ySort: (y + 2) * TILE_SIZE });
  }

  // Wood Signpost on path flank (x=6, y=12)
  blits.push({
    file: 'poke_signpost.png',
    px: 6 * TILE_SIZE,
    py: 12 * TILE_SIZE,
    ySort: 13 * TILE_SIZE
  });

  // Red Flowers along meadow margins
  blits.push({ file: 'poke_flowers_red.png', px: 4 * TILE_SIZE, py: 11 * TILE_SIZE, ySort: 1 });
  blits.push({ file: 'poke_flowers_red.png', px: 4 * TILE_SIZE, py: 13 * TILE_SIZE, ySort: 1 });
  blits.push({ file: 'poke_flowers_red.png', px: 10 * TILE_SIZE, py: 12 * TILE_SIZE, ySort: 1 });
  blits.push({ file: 'poke_flowers_red.png', px: 11 * TILE_SIZE, py: 14 * TILE_SIZE, ySort: 1 });

  await renderCanvas(W, H, 'poke_grass_plain.png', blits, 'bloque5_01_garita_ruta_forestal.png');
}

// ----------------------------------------------------------------------------
// 2. VARIANTE 2: Garita de Desfiladero / Cañón de Montaña
// ----------------------------------------------------------------------------
async function generateMountainGatehouse(): Promise<void> {
  const W = 16;
  const H = 16;
  const blits: BlitItem[] = [];

  const gateX = 5;
  const gateY = 4;
  const gateBuf = await getCanonicalGatehouseBuffer();

  // 1. Continuous Autotiled Dirt Path (x=7..8) running through gorge
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    pathGrid[y]![7] = true;
    pathGrid[y]![8] = true;
  }
  const resolved = resolvePathGrid(pathGrid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = resolved.pathDetails[y]?.[x];
      if (cell) {
        blits.push({ file: cell.primaryTile, px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
        if (cell.overlayTiles) {
          for (const ov of cell.overlayTiles) {
            blits.push({ file: ov, px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
          }
        }
      }
    }
  }

  // 2. Mountain Massifs flanking both sides seamlessly
  // Plateau at y=0..3 (hugs the central path x=7..8 on both sides without leaving orphan grass)
  for (let y = 0; y <= 3; y++) {
    for (let x = 0; x <= 6; x++) {
      blits.push({ file: 'poke_cliff_brown_plateau_rock.png', px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0.1 });
    }
    for (let x = 9; x < W; x++) {
      blits.push({ file: 'poke_cliff_brown_plateau_rock.png', px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0.1 });
    }
  }

  // Vertical Cliff Faces flanking gatehouse from y=4 to y=9
  // Founds rock seamlessly behind the gatehouse edges (x=5 and x=10 at ySort: 0.2)
  // eliminating any margin gap and attaching mountain directly to the building
  for (let y = 4; y <= 9; y++) {
    for (let x = 0; x <= 5; x++) {
      blits.push({ file: 'poke_cliff_brown_face.png', px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0.2 });
    }
    for (let x = 10; x < W; x++) {
      blits.push({ file: 'poke_cliff_brown_face.png', px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0.2 });
    }
  }

  // 3. Canonical Gatehouse centered in the gorge
  blits.push({
    buffer: gateBuf,
    px: gateX * TILE_SIZE,
    py: gateY * TILE_SIZE,
    ySort: (gateY + 7) * TILE_SIZE
  });

  // 4. Boulder and Rubble Scenery Props
  // Canonical boulder on left cliff foot (x=4, y=10)
  blits.push({
    file: 'poke_cave_boulder_rock.png',
    px: 4 * TILE_SIZE,
    py: 10 * TILE_SIZE,
    ySort: 11 * TILE_SIZE
  });
  // Rubble stones on right cliff foot (x=11, y=10)
  blits.push({
    file: 'poke_cave_rubble_stones.png',
    px: 11 * TILE_SIZE,
    py: 10 * TILE_SIZE,
    ySort: 11 * TILE_SIZE
  });
  // Warning mountain signpost on left path flank (x=6, y=12)
  blits.push({
    file: 'poke_signpost.png',
    px: 6 * TILE_SIZE,
    py: 12 * TILE_SIZE,
    ySort: 13 * TILE_SIZE
  });

  await renderCanvas(W, H, 'poke_grass_plain.png', blits, 'bloque5_02_garita_paso_montana.png');
}

// ----------------------------------------------------------------------------
// 3. VARIANTE 3: Garita Fronteriza de Acceso a Metrópolis / Ciudad
// ----------------------------------------------------------------------------
async function generateMetropolisGatehouse(): Promise<void> {
  const W = 16;
  const H = 16;
  const blits: BlitItem[] = [];

  const gateX = 5;
  const gateY = 4;
  const gateBuf = await getCanonicalGatehouseBuffer();

  // 1. South Side (Wild Route, y=11..15): Autotiled Dirt Path (x=7..8)
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 11; y < H; y++) {
    pathGrid[y]![7] = true;
    pathGrid[y]![8] = true;
  }
  const resolved = resolvePathGrid(pathGrid);
  for (let y = 11; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = resolved.pathDetails[y]?.[x];
      if (cell) {
        blits.push({ file: cell.primaryTile, px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
        if (cell.overlayTiles) {
          for (const ov of cell.overlayTiles) {
            blits.push({ file: ov, px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
          }
        }
      }
    }
  }

  // 2. North Side (Metropolis Boulevard, y=0..3): Paved Road Avenue with Curbs
  for (let y = 0; y <= 3; y++) {
    // 3-tile wide paved roadway (x=7..9)
    for (let x = 7; x <= 8; x++) {
      blits.push({ file: 'poke_road_paved.png', px: x * TILE_SIZE, py: y * TILE_SIZE, ySort: 0 });
    }
    // Lateral curbs
    blits.push({ file: 'poke_curb_w.png', px: 6 * TILE_SIZE, py: y * TILE_SIZE, ySort: 0.1 });
    blits.push({ file: 'poke_curb_e.png', px: 9 * TILE_SIZE, py: y * TILE_SIZE, ySort: 0.1 });
  }

  // 3. Canonical Gatehouse
  blits.push({
    buffer: gateBuf,
    px: gateX * TILE_SIZE,
    py: gateY * TILE_SIZE,
    ySort: (gateY + 7) * TILE_SIZE
  });

  // 4. Lateral Fences and Hedges
  // Picket fences along the boundary at y=7
  for (let x = 1; x < gateX; x++) {
    blits.push({ file: 'poke_fence_picket.png', px: x * TILE_SIZE, py: 7 * TILE_SIZE, ySort: 7.5 * TILE_SIZE });
  }
  for (let x = gateX + 6; x < W - 1; x++) {
    blits.push({ file: 'poke_fence_picket.png', px: x * TILE_SIZE, py: 7 * TILE_SIZE, ySort: 7.5 * TILE_SIZE });
  }

  // 5. Urban Dressing North (Metropolis side)
  // Symmetrical street lamps flanking avenue entrance (x=5 and x=10 at y=0)
  blits.push({ file: 'poke_street_lamp.png', px: 5 * TILE_SIZE, py: 0 * TILE_SIZE, ySort: 2 * TILE_SIZE });
  blits.push({ file: 'poke_street_lamp_left.png', px: 10 * TILE_SIZE, py: 0 * TILE_SIZE, ySort: 2 * TILE_SIZE });

  // Circular flower planters
  blits.push({ file: 'poke_flower_pot_circular.png', px: 5 * TILE_SIZE, py: 2 * TILE_SIZE, ySort: 2.5 * TILE_SIZE });
  blits.push({ file: 'poke_flower_pot_circular.png', px: 10 * TILE_SIZE, py: 2 * TILE_SIZE, ySort: 2.5 * TILE_SIZE });

  // Round decorative bushes on city grass lawn
  blits.push({ file: 'poke_bush_round.png', px: 3 * TILE_SIZE, py: 1 * TILE_SIZE, ySort: 2 * TILE_SIZE });
  blits.push({ file: 'poke_bush_round.png', px: 12 * TILE_SIZE, py: 1 * TILE_SIZE, ySort: 2 * TILE_SIZE });

  // 6. Route Dressing South
  // Route signpost at x=6, y=12
  blits.push({ file: 'poke_signpost.png', px: 6 * TILE_SIZE, py: 12 * TILE_SIZE, ySort: 13 * TILE_SIZE });

  // Flanking trees on wild route side
  blits.push({ file: 'poke_tree_oak_clean.png', px: 2 * TILE_SIZE, py: 11 * TILE_SIZE, ySort: 13 * TILE_SIZE });
  blits.push({ file: 'poke_tree_oak_clean.png', px: 12 * TILE_SIZE, py: 11 * TILE_SIZE, ySort: 13 * TILE_SIZE });

  await renderCanvas(W, H, 'poke_grass_plain.png', blits, 'bloque5_03_garita_frontera_metropolis.png');
}

async function main(): Promise<void> {
  console.log('🚀 Generating Gatehouse Checkpoint Previews (Punto 5)...');
  await generateForestGatehouse();
  await generateMountainGatehouse();
  await generateMetropolisGatehouse();
  console.log('✨ All 3 Gatehouse Previews Generated Successfully!');
}

main().catch((err) => {
  console.error('Error generating previews:', err);
  process.exit(1);
});
