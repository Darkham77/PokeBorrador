/**
 * scripts/map/render_regional_preview.ts
 *
 * Renders a pixel-perfect 40x35 tile visual preview of the Kanto procedural generator
 * to verify canonical GBA metatiles, dense continuous forests, snap-to-grid buildings,
 * and solid rocky plateau mountains.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  KantoRegionalWorldGenerator,
  DynamicCatalogLoader,
  CELL_BIOME,
  KANTO_TILE_SIZE
} from '../../src/logic/map/kantoRegionalGenerator.ts';
import {
  UniversalAutotiler
} from '../../src/logic/map/kantoTileEngine.ts';
import { getKantoDefaultProject } from '../../src/logic/map/regionRegistry.ts';

async function renderRegionViewport(
  gen: KantoRegionalWorldGenerator,
  autotiler: UniversalAutotiler,
  startGx: number,
  startGy: number,
  tileCols: number,
  tileRows: number,
  outPath: string
): Promise<void> {
  const T = KANTO_TILE_SIZE; // 32
  const widthPx = tileCols * T;
  const heightPx = tileRows * T;

  const overlays: sharp.OverlayOptions[] = [];

  const addSprite = (srcPath: string, px: number, py: number, w?: number, h?: number) => {
    if (!fs.existsSync(srcPath)) return;
    if (px + (w ?? T) < 0 || px >= widthPx || py + (h ?? T) < 0 || py >= heightPx) return;
    overlays.push({
      input: srcPath,
      left: Math.max(0, px),
      top: Math.max(0, py)
    });
  };

  const LPC_DIR = path.resolve('public/assets/studio/kanto/lpc');
  const PREFABS_DIR = path.resolve('public/assets/prefabs');

  const grassTile = path.join(LPC_DIR, 'poke_grass_plain.png');
  const dirtTile = path.join(LPC_DIR, 'poke_dirt_path.png');
  const tallGrassTile = path.join(LPC_DIR, 'poke_tall_grass.png');

  // 1. Terrain Layer
  for (let r = 0; r < tileRows; r++) {
    const gy = startGy + r;
    const row = gen.grid[gy];
    if (!row) continue;
    for (let c = 0; c < tileCols; c++) {
      const gx = startGx + c;
      const cell = row[gx];
      const px = c * T;
      const py = r * T;

      // Base grass under non-water, non-mountain cells
      if (cell !== CELL_BIOME.WATER && cell !== CELL_BIOME.MOUNTAIN_DIRT) {
        addSprite(grassTile, px, py);
      }

      if (cell === CELL_BIOME.DIRT_PATH) {
        addSprite(dirtTile, px, py);
      } else if (cell === CELL_BIOME.TALL_GRASS) {
        addSprite(tallGrassTile, px, py);
      } else if (cell === CELL_BIOME.MOUNTAIN_DIRT) {
        const res = autotiler.resolveMountainTile(gen.grid, gx, gy, gen.elevation);
        // Base plateau rock underlay for mountain cells (never green grass)
        const plateauRockTile = path.join(LPC_DIR, `poke_cliff_${res.pal}_plateau_rock.png`);
        addSprite(plateauRockTile, px, py);

        if (res.underlayImage) {
          addSprite(path.join(LPC_DIR, res.underlayImage), px, py);
        }
        addSprite(path.join(LPC_DIR, res.primaryImage), px, py);
        if (res.overlayImages) {
          for (const ov of res.overlayImages) {
            addSprite(path.join(LPC_DIR, ov), px, py);
          }
        }
      }
    }
  }

  // 2. Y-Sorted Object Layer (matching kantoTileEngine.ts depth buffer)
  interface RenderableItem {
    ySort: number;
    srcPath: string;
    px: number;
    py: number;
    w?: number;
    h?: number;
  }

  const renderables: RenderableItem[] = [];

  for (const b of gen.buildings) {
    const bx = b.x - startGx * T;
    const by = b.y - startGy * T;
    const bPath = path.join(PREFABS_DIR, 'buildings', `${b.style.replace(/^poke_/, '')}.png`);
    renderables.push({
      ySort: by + (b.h ?? 160),
      srcPath: bPath,
      px: bx,
      py: by,
      w: b.w,
      h: b.h
    });
  }

  for (const t of gen.trees) {
    const tx = t.x - startGx * T;
    const ty = t.y - startGy * T;
    const cleanName = t.style.replace(/^poke_/, '').replace(/\.png$/, '');
    const isCuttable = cleanName.includes('cuttable');
    const isPine = cleanName.includes('pine');
    const tPath = isCuttable
      ? path.join(LPC_DIR, 'tree_cuttable.png')
      : isPine
        ? path.join(LPC_DIR, 'poke_tree_pine_small.png')
        : path.join(LPC_DIR, 'poke_tree_oak_clean.png');
    const w = isCuttable ? 32 : 64;
    const h = isCuttable ? 32 : 96;
    const py = isCuttable ? ty : ty - 32;
    const ySort = isCuttable ? ty + 32 : ty + 64;
    renderables.push({
      ySort,
      srcPath: tPath,
      px: tx,
      py,
      w,
      h
    });
  }

  for (const p of gen.props) {
    const px = p.x - startGx * T;
    const py = p.y - startGy * T;
    const cleanName = p.style.replace(/^poke_/, '').replace(/\.png$/, '');
    const pPath = path.join(PREFABS_DIR, 'props', `poke_${cleanName}.png`);
    renderables.push({
      ySort: py + (p.h ?? 32),
      srcPath: pPath,
      px,
      py,
      w: p.w,
      h: p.h
    });
  }

  for (const n of gen.nature) {
    const nx = n.x - startGx * T;
    const ny = n.y - startGy * T;
    const cleanName = n.style.replace(/^poke_/, '').replace(/\.png$/, '');
    let nPath = path.join(LPC_DIR, `${n.style}.png`);
    if (!fs.existsSync(nPath)) {
      nPath = path.join(PREFABS_DIR, 'props', `${n.style}.png`);
    }
    if (!fs.existsSync(nPath)) {
      nPath = path.join(PREFABS_DIR, 'elevation', `${n.style}.png`);
    }
    if (!fs.existsSync(nPath)) {
      nPath = path.join(LPC_DIR, `${cleanName}.png`);
    }
    if (fs.existsSync(nPath)) {
      renderables.push({
        ySort: ny + (n.h ?? 32),
        srcPath: nPath,
        px: nx,
        py: ny,
        w: n.w,
        h: n.h
      });
    }
  }

  renderables.sort((a, b) => a.ySort - b.ySort);

  for (const item of renderables) {
    addSprite(item.srcPath, item.px, item.py, item.w, item.h);
  }

  const baseImg = sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 18, g: 117, b: 158, alpha: 1 } // Ocean water blue
    }
  });

  await baseImg.composite(overlays).png().toFile(outPath);
  console.log(`✅ Regional preview successfully written to ${outPath}`);
}

async function main() {
  console.log('Rendering regional preview...');
  const loader = new DynamicCatalogLoader();
  const gen = new KantoRegionalWorldGenerator(loader);
  const autotiler = new UniversalAutotiler(loader);

  const project = getKantoDefaultProject();
  gen.generate(project.nodes, project.connections, 42);

  // 1. Valley & Town Viewport (Pallet Town, Route 1, Viridian City)
  await renderRegionViewport(
    gen,
    autotiler,
    22,
    75,
    38,
    42,
    path.resolve(path.resolve(process.cwd(), 'scratch/maps'), 'preview_canonical_map_v2.png')
  );

  // 2. Mountain Massif Viewport (Mt. Moon & Route 4 Alpine Massif)
  const mtGx = 48;
  const mtGy = 13;

  const currentOutPath = path.resolve(path.resolve(process.cwd(), 'scratch/maps'), 'preview_mountain_cliffs.png');
  await renderRegionViewport(
    gen,
    autotiler,
    mtGx,
    mtGy,
    32,
    28,
    currentOutPath
  );
  const legacyDir = path.resolve(process.cwd(), 'scratch/maps');
  if (fs.existsSync(legacyDir)) {
    fs.copyFileSync(currentOutPath, path.join(legacyDir, 'preview_mountain_cliffs.png'));
  }
}

main().catch(console.error);
