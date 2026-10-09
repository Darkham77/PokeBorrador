/**
 * scripts/map/generate_dungeon_and_port_previews.ts
 *
 * GENERADOR DE VISTAS PREVIAS HD PARA EL BLOQUE 4:
 * 1. Cueva Variante 1: Mt. Moon Rústica (Acantilado marrón, peñasco, escombros, letrero y sendero)
 * 2. Cueva Variante 2: Túnel Roca Granito (Acantilado gris, peñasco, escombros, letrero y sendero)
 * 3. Puerto Variante 1: Muelle Carmín / Vermilion (Aduana, camión, cajas de carga, bolardos, ferry)
 * 4. Hito Rural 1: Santuario en Islote (Puente recto, estatua, sendero de tierra y flores)
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  resolvePathGrid
} from '../../src/logic/map/pathAutotileEngine.ts';
import {
  resolveWaterCoastGrid,
  type WaterTerrainKind
} from '../../src/logic/map/waterAutotileEngine.ts';

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
    path.join(ROOT_DIR, 'public/assets/tiles/elevation', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/elevation/brown', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/elevation/gray', filename),
    path.join(ROOT_DIR, 'public/assets/tiles/water', filename),
    path.join(ROOT_DIR, 'public/assets/essentials/prefabs/buildings', filename),
    path.join(ROOT_DIR, 'public/assets/essentials/prefabs/props', filename)
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

interface BlitItem {
  file: string;
  px: number;
  py: number;
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

  // 2. Blits
  for (let i = 0; i < blits.length; i++) {
    const item = blits[i]!;
    if (!item.file) {
      console.error(`Blit item at index ${i} has undefined file:`, item);
      continue;
    }
    const buf = getImgBuffer(item.file);
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
// 1. CUEVA VARIANTE 1: Mt. Moon Rústica (Paleta Marrón - Roca Pura Sin Césped)
// ----------------------------------------------------------------------------
async function generateCaveBrown(): Promise<void> {
  const W = 12;
  const H = 10;
  const blits: BlitItem[] = [];

  // Northern Plateau & Cliff (y=0..1 plateau, y=2..3 solid rock cliff face - ZERO grass)
  for (let x = 0; x < W; x++) {
    blits.push({ file: 'poke_cliff_brown_plateau_rock.png', px: x * TILE_SIZE, py: 0 * TILE_SIZE });
    blits.push({ file: 'poke_cliff_brown_plateau_rock.png', px: x * TILE_SIZE, py: 1 * TILE_SIZE });
    blits.push({ file: 'poke_cliff_brown_face.png', px: x * TILE_SIZE, py: 2 * TILE_SIZE });
    blits.push({ file: 'poke_cliff_brown_face.png', px: x * TILE_SIZE, py: 3 * TILE_SIZE });
  }

  // Cave mouth at x=5, y=2 (1 tile wide x 2 tiles high)
  blits.push({ file: 'poke_cave_entrance_brown.png', px: 5 * TILE_SIZE, py: 2 * TILE_SIZE });

  // Autotiled dirt path from cave entrance (x=5..6, y=4..9)
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 4; y < H; y++) {
    pathGrid[y]![5] = true;
    pathGrid[y]![6] = true;
  }
  const resolved = resolvePathGrid(pathGrid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = resolved.pathDetails[y]?.[x];
      if (cell) {
        blits.push({ file: cell.primaryTile, px: x * TILE_SIZE, py: y * TILE_SIZE });
        if (cell.overlayTiles) {
          for (const ov of cell.overlayTiles) {
            blits.push({ file: ov, px: x * TILE_SIZE, py: y * TILE_SIZE });
          }
        }
      }
    }
  }

  // Environmental Props:
  // - Large canonical boulder on right flank (x=8, y=4)
  blits.push({ file: 'poke_cave_boulder_rock.png', px: 8 * TILE_SIZE, py: 4 * TILE_SIZE });
  // - Rubble stones near cliff base (x=3, y=4) and (x=9, y=4)
  blits.push({ file: 'poke_cave_rubble_stones.png', px: 3 * TILE_SIZE, py: 4 * TILE_SIZE });
  blits.push({ file: 'poke_cave_rubble_stones.png', px: 9 * TILE_SIZE, py: 4 * TILE_SIZE });
  // - Wood signpost on left flank of path (x=4, y=5)
  blits.push({ file: 'poke_signpost.png', px: 4 * TILE_SIZE, py: 5 * TILE_SIZE });
  // - Wildflowers on grass flanks
  blits.push({ file: 'poke_flowers_red.png', px: 2 * TILE_SIZE, py: 6 * TILE_SIZE });
  blits.push({ file: 'poke_flowers_red.png', px: 9 * TILE_SIZE, py: 7 * TILE_SIZE });

  await renderCanvas(W, H, 'poke_grass_plain.png', blits, 'bloque4_01_cueva_mtmoon_marron.png');
}

// ----------------------------------------------------------------------------
// 2. CUEVA VARIANTE 2: Túnel Roca / Granito (Paleta Gris - Roca Pura Sin Césped)
// ----------------------------------------------------------------------------
async function generateCaveGray(): Promise<void> {
  const W = 12;
  const H = 10;
  const blits: BlitItem[] = [];

  // Northern Plateau & Cliff (y=0..1 plateau, y=2..3 solid gray cliff face - ZERO grass)
  for (let x = 0; x < W; x++) {
    blits.push({ file: 'poke_cliff_gray_plateau_rock.png', px: x * TILE_SIZE, py: 0 * TILE_SIZE });
    blits.push({ file: 'poke_cliff_gray_plateau_rock.png', px: x * TILE_SIZE, py: 1 * TILE_SIZE });
    blits.push({ file: 'poke_cliff_gray_face.png', px: x * TILE_SIZE, py: 2 * TILE_SIZE });
    blits.push({ file: 'poke_cliff_gray_face.png', px: x * TILE_SIZE, py: 3 * TILE_SIZE });
  }

  // Cave mouth at x=5, y=2 (1 tile wide x 2 tiles high)
  blits.push({ file: 'poke_cave_entrance_gray.png', px: 5 * TILE_SIZE, py: 2 * TILE_SIZE });

  // Autotiled dirt path from cave entrance (x=5..6, y=4..9)
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 4; y < H; y++) {
    pathGrid[y]![5] = true;
    pathGrid[y]![6] = true;
  }
  const resolved = resolvePathGrid(pathGrid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = resolved.pathDetails[y]?.[x];
      if (cell) {
        blits.push({ file: cell.primaryTile, px: x * TILE_SIZE, py: y * TILE_SIZE });
        if (cell.overlayTiles) {
          for (const ov of cell.overlayTiles) {
            blits.push({ file: ov, px: x * TILE_SIZE, py: y * TILE_SIZE });
          }
        }
      }
    }
  }

  // Environmental Props:
  // - Two canonical boulders (x=2, y=4) and (x=8, y=4)
  blits.push({ file: 'poke_cave_boulder_rock.png', px: 2 * TILE_SIZE, py: 4 * TILE_SIZE });
  blits.push({ file: 'poke_cave_boulder_rock.png', px: 8 * TILE_SIZE, py: 4 * TILE_SIZE });
  // - Rubble stones near cliff base
  blits.push({ file: 'poke_cave_rubble_stones.png', px: 4 * TILE_SIZE, py: 4 * TILE_SIZE });
  blits.push({ file: 'poke_cave_rubble_stones.png', px: 9 * TILE_SIZE, py: 5 * TILE_SIZE });
  // - Signpost on right flank (x=7, y=5)
  blits.push({ file: 'poke_signpost.png', px: 7 * TILE_SIZE, py: 5 * TILE_SIZE });

  await renderCanvas(W, H, 'poke_grass_plain.png', blits, 'bloque4_02_cueva_tunel_roca_gris.png');
}

// ----------------------------------------------------------------------------
// 3. PUERTO MARÍTIMO: Muelle Carmín / Vermilion Port (16x16)
// ----------------------------------------------------------------------------
async function generateVermilionPort(): Promise<void> {
  const W = 16;
  const H = 16;
  const blits: BlitItem[] = [];

  // Water background for southern half (y=8..15)
  for (let y = 8; y < H; y++) {
    for (let x = 0; x < W; x++) {
      blits.push({ file: 'water_center.png', px: x * TILE_SIZE, py: y * TILE_SIZE });
    }
  }
  // Shoreline between grass and water (y=7 is shore)
  for (let x = 0; x < W; x++) {
    blits.push({ file: 'water_shore_t.png', px: x * TILE_SIZE, py: 7 * TILE_SIZE });
  }

  // Port Gate (7x6 tiles) at x=4, y=1 (Awning spans columns x=6..8)
  blits.push({ file: 'poke_port_vermilion_gate.png', px: 4 * TILE_SIZE, py: 1 * TILE_SIZE });

  // Pier (3 tiles wide x=6..8, perfectly aligned with the 3-tile awning! extending south into water y=7..10)
  for (let y = 7; y <= 10; y++) {
    blits.push({ file: 'poke_port_pier_v_left.png', px: 6 * TILE_SIZE, py: y * TILE_SIZE });
    blits.push({ file: 'poke_port_pier_v_mid.png', px: 7 * TILE_SIZE, py: y * TILE_SIZE });
    blits.push({ file: 'poke_port_pier_v_right.png', px: 8 * TILE_SIZE, py: y * TILE_SIZE });
  }

  // Dock Truck (3x2 tiles) parked on right esplanade (x=12, y=4)
  blits.push({ file: 'poke_port_dock_truck.png', px: 12 * TILE_SIZE, py: 4 * TILE_SIZE });

  // Double cargo crates stack on left esplanade (x=1, y=4)
  blits.push({ file: 'poke_port_cargo_crates_double.png', px: 1 * TILE_SIZE, py: 4 * TILE_SIZE });

  // Single crate stack near truck (x=12, y=2)
  blits.push({ file: 'poke_port_cargo_crates_stack.png', px: 12 * TILE_SIZE, py: 2 * TILE_SIZE });

  // Bollard chains flanking gate entrance along quay edge
  blits.push({ file: 'poke_port_bollard_chains.png', px: 2 * TILE_SIZE, py: 6 * TILE_SIZE });
  blits.push({ file: 'poke_port_bollard_chains.png', px: 10 * TILE_SIZE, py: 6 * TILE_SIZE });

  // Docked Passenger Ferry (7x5 tiles) at south pier terminus, perfectly centered at x=4 (x=4..10, gangway at x=6..8)
  blits.push({ file: 'poke_ship_ferry_docked.png', px: 4 * TILE_SIZE, py: 10 * TILE_SIZE });

  await renderCanvas(W, H, 'poke_grass_plain.png', blits, 'bloque4_03_puerto_vermilion_muelle.png');
}

// ----------------------------------------------------------------------------
// 4. HITO RURAL / ACUÁTICO: Santuario Antiguo en Islote (12x12)
// ----------------------------------------------------------------------------
async function generateWaterLandmarkIslet(): Promise<void> {
  const W = 12;
  const H = 12;
  const blits: BlitItem[] = [];

  // Matrix with grass islet in center: x=3..8, y=3..7
  const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  for (let y = 3; y <= 7; y++) {
    for (let x = 3; x <= 8; x++) {
      matrix[y]![x] = 'grass';
    }
  }

  // Wooden Boardwalk bridge from south (x=5..6, y=8..11)
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 8; y < H; y++) {
    bridgeGrid[y]![5] = true;
    bridgeGrid[y]![6] = true;
  }

  const waterResolved = resolveWaterCoastGrid(matrix, bridgeGrid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = waterResolved.cellDetails[y]?.[x];
      if (cell) {
        for (const tile of cell.layerStack) {
          blits.push({ file: tile, px: x * TILE_SIZE, py: y * TILE_SIZE });
        }
      }
    }
  }

  // Wooden Boardwalk bridge from south (x=5..6, y=8..11)
  for (let y = 8; y < H; y++) {
    blits.push({ file: 'poke_port_pier_v_left.png', px: 5 * TILE_SIZE, py: y * TILE_SIZE });
    blits.push({ file: 'poke_port_pier_v_right.png', px: 6 * TILE_SIZE, py: y * TILE_SIZE });
  }

  // Canonical Lake Shrine: Rustic wooden sanctuary cottage (4x4 tiles) at x=4, y=3
  blits.push({ file: 'house_wood_brown.png', px: 4 * TILE_SIZE, py: 3 * TILE_SIZE });

  // Flowers flanking the entrance path on the grass islet
  blits.push({ file: 'poke_flowers_red.png', px: 3 * TILE_SIZE, py: 7 * TILE_SIZE });
  blits.push({ file: 'poke_flowers_red.png', px: 8 * TILE_SIZE, py: 7 * TILE_SIZE });

  // Signpost with ancient inscription at x=4, y=7
  blits.push({ file: 'poke_signpost.png', px: 4 * TILE_SIZE, py: 7 * TILE_SIZE });

  await renderCanvas(W, H, 'poke_water.png', blits, 'bloque4_04_hito_santuario_islote.png');
}

async function main(): Promise<void> {
  console.log('🎨 Generando vistas previas de Mazmorras, Puertos e Hitos...');
  await generateCaveBrown();
  await generateCaveGray();
  await generateVermilionPort();
  await generateWaterLandmarkIslet();
  console.log('✨ ¡Todas las vistas previas generadas exitosamente!');
}

main().catch(err => {
  console.error('Error generating previews:', err);
  process.exit(1);
});
