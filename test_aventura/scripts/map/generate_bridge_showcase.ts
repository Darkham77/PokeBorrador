/**
 * scripts/map/generate_bridge_showcase.ts
 *
 * DEDICATED MULTI-STYLE BRIDGE ENGINE SHOWCASE GENERATOR (Node.js 26+)
 *
 * Constructs a comprehensive test canvas of diverse bridges over water across
 * ALL canonical bridge styles:
 *   - 'silence_wood': Pure Route 12 wooden boardwalk (horizontal, vertical, L-turns, zig-zag, 2x2 balconies)
 *   - 'golden_wood': Route 24 Nugget Bridge golden oak planks with perimeter railings & 3D corner posts
 *   - 'stone_pier': Vermilion Port stone boardwalk with railings
 *
 * ZERO-MIXING INVARIANT:
 * Every bridge structure is verified to use 100% of its designated style family.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  resolveCanonicalBridges,
  type TerrainCell,
  type BridgeStyle
} from '../../src/logic/map/canonicalBridgeEngine.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_W = 62;
const MAP_H = 84;
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const CURRENT_BRAIN_ID = 'b391978b-ef23-4ef4-a223-4b7e97986f65';
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps', CURRENT_BRAIN_ID);

interface TileCacheItem {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

const tileCache = new Map<string, TileCacheItem | undefined>();

function loadTileImage(filename: string): TileCacheItem | undefined { // domain-ok: Identificador o estructura procedural de aventura
  if (tileCache.has(filename)) return tileCache.get(filename);

  const candidates = [
    path.resolve(ROOT_DIR, 'public/assets/tiles', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure', filename),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const item: TileCacheItem = { width: TILE_SIZE, height: TILE_SIZE, data: fs.readFileSync(p) };
        tileCache.set(filename, item);
        return item;
      } catch {
        // continue
      }
    }
  }

  tileCache.set(filename, undefined);
  return undefined;
}

interface BridgeSpec {
  readonly id: string;
  readonly title: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly badgeColor?: string;
}

async function main(): Promise<void> {
  const bridgeGrid: boolean[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
  const terrainGrid: TerrainCell[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => ({ terrain: 'water' }))
  );

  const specs: BridgeSpec[] = [];
  const styleRegions: { minX: number; maxX: number; minY: number; maxY: number; style: BridgeStyle }[] = [];

  function addHorizontalBridge(startX: number, y: number, length: number, height = 2): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < length; dx++) {
        bridgeGrid[y + dy]![startX + dx] = true;
      }
    }
  }

  function addVerticalBridge(x: number, startY: number, length: number, width = 2): void {
    for (let dy = 0; dy < length; dy++) {
      for (let dx = 0; dx < width; dx++) {
        bridgeGrid[startY + dy]![x + dx] = true;
      }
    }
  }

  // =========================================================================
  // SECCIÓN 1: ESTILO RUTA 12 (silence_wood) - MADERA RÚSTICA CANÓNICA
  // =========================================================================
  styleRegions.push({ minX: 0, maxX: MAP_W - 1, minY: 0, maxY: 26, style: 'silence_wood' });

  // 1A. Horizontal Corto (4x2)
  addHorizontalBridge(3, 4, 4);
  specs.push({ id: '1A', title: '1A. [Ruta 12] H-Corto (4x2)', labelX: 3, labelY: 3, badgeColor: '#4ade80' });

  // 1B. Horizontal Medio (8x2)
  addHorizontalBridge(11, 4, 8);
  specs.push({ id: '1B', title: '1B. [Ruta 12] H-Medio (8x2)', labelX: 11, labelY: 3, badgeColor: '#4ade80' });

  // 1C. Horizontal Largo (16x2)
  addHorizontalBridge(23, 4, 16);
  specs.push({ id: '1C', title: '1C. [Ruta 12] H-Largo (16x2)', labelX: 23, labelY: 3, badgeColor: '#4ade80' });

  // 2A. Vertical Corto (2x4)
  addVerticalBridge(3, 11, 4);
  specs.push({ id: '2A', title: '2A. V-Corto (2x4)', labelX: 2, labelY: 10, badgeColor: '#4ade80' });

  // 2B. Vertical Medio (2x8)
  addVerticalBridge(9, 11, 8);
  specs.push({ id: '2B', title: '2B. V-Medio (2x8)', labelX: 8, labelY: 10, badgeColor: '#4ade80' });

  // 2C. Vertical Largo (2x14)
  addVerticalBridge(15, 11, 14);
  specs.push({ id: '2C', title: '2C. V-Largo (2x14)', labelX: 14, labelY: 10, badgeColor: '#4ade80' });

  // 3A. Quiebre L: Norte -> Este
  addVerticalBridge(21, 11, 6);
  addHorizontalBridge(21, 15, 7);
  specs.push({ id: '3A', title: '3A. Giro L: Norte -> Este', labelX: 20, labelY: 10, badgeColor: '#4ade80' });

  // 3B. Quiebre L: Norte -> Oeste
  addVerticalBridge(34, 11, 6);
  addHorizontalBridge(29, 15, 7);
  specs.push({ id: '3B', title: '3B. Giro L: Norte -> Oeste', labelX: 29, labelY: 10, badgeColor: '#4ade80' });

  // 3C. Quiebre L: Oeste -> Sur
  addHorizontalBridge(40, 12, 7);
  addVerticalBridge(40, 12, 8);
  specs.push({ id: '3C', title: '3C. Giro L: Oeste -> Sur', labelX: 39, labelY: 10, badgeColor: '#4ade80' });

  // 3D. Quiebre L: Este -> Sur
  addHorizontalBridge(51, 12, 7);
  addVerticalBridge(56, 12, 8);
  specs.push({ id: '3D', title: '3D. Giro L: Este -> Sur', labelX: 50, labelY: 10, badgeColor: '#4ade80' });

  // =========================================================================
  // SECCIÓN 2: ESTILO PUENTE PEPITA (golden_wood) - MADERA DORADA CON BARANDAS
  // =========================================================================
  styleRegions.push({ minX: 0, maxX: MAP_W - 1, minY: 27, maxY: 54, style: 'golden_wood' });

  // 4A. Horizontal Corto (4x2)
  addHorizontalBridge(3, 31, 4);
  specs.push({ id: '4A', title: '4A. [Puente Pepita] H-Corto (4x2)', labelX: 3, labelY: 30, badgeColor: '#facc15' });

  // 4B. Horizontal Medio (8x2)
  addHorizontalBridge(11, 31, 8);
  specs.push({ id: '4B', title: '4B. [Puente Pepita] H-Medio (8x2)', labelX: 11, labelY: 30, badgeColor: '#facc15' });

  // 4C. Horizontal Largo (16x2)
  addHorizontalBridge(23, 31, 16);
  specs.push({ id: '4C', title: '4C. [Puente Pepita] H-Largo (16x2)', labelX: 23, labelY: 30, badgeColor: '#facc15' });

  // 5A. Vertical Corto (2x4)
  addVerticalBridge(3, 38, 4);
  specs.push({ id: '5A', title: '5A. V-Corto (2x4)', labelX: 2, labelY: 37, badgeColor: '#facc15' });

  // 5B. Vertical Medio (2x8)
  addVerticalBridge(9, 38, 8);
  specs.push({ id: '5B', title: '5B. V-Medio (2x8)', labelX: 8, labelY: 37, badgeColor: '#facc15' });

  // 5C. Vertical Largo (2x14)
  addVerticalBridge(15, 38, 14);
  specs.push({ id: '5C', title: '5C. V-Largo (2x14)', labelX: 14, labelY: 37, badgeColor: '#facc15' });

  // 6A. Quiebre L con Barandas: Norte -> Este
  addVerticalBridge(21, 38, 6);
  addHorizontalBridge(21, 42, 7);
  specs.push({ id: '6A', title: '6A. Giro L: Norte -> Este', labelX: 20, labelY: 37, badgeColor: '#facc15' });

  // 6B. Quiebre L con Barandas: Norte -> Oeste
  addVerticalBridge(34, 38, 6);
  addHorizontalBridge(29, 42, 7);
  specs.push({ id: '6B', title: '6B. Giro L: Norte -> Oeste', labelX: 29, labelY: 37, badgeColor: '#facc15' });

  // 6C. Quiebre L con Barandas: Oeste -> Sur
  addHorizontalBridge(40, 39, 7);
  addVerticalBridge(40, 39, 8);
  specs.push({ id: '6C', title: '6C. Giro L: Oeste -> Sur', labelX: 39, labelY: 37, badgeColor: '#facc15' });

  // 6D. Quiebre L con Barandas: Este -> Sur
  addHorizontalBridge(51, 39, 7);
  addVerticalBridge(56, 39, 8);
  specs.push({ id: '6D', title: '6D. Giro L: Este -> Sur', labelX: 50, labelY: 37, badgeColor: '#facc15' });

  // =========================================================================
  // SECCIÓN 3: ZIG-ZAGS, MUELLE DE PIEDRA Y DESEMBARCO
  // =========================================================================
  styleRegions.push({ minX: 0, maxX: 16, minY: 55, maxY: MAP_H - 1, style: 'silence_wood' });
  styleRegions.push({ minX: 17, maxX: 32, minY: 55, maxY: MAP_H - 1, style: 'golden_wood' });
  styleRegions.push({ minX: 33, maxX: MAP_W - 1, minY: 55, maxY: 72, style: 'stone_pier' });
  styleRegions.push({ minX: 33, maxX: MAP_W - 1, minY: 73, maxY: MAP_H - 1, style: 'silence_wood' });

  // 7. Zig-Zag Canónico Ruta 12 (exactos giros 2x2)
  addVerticalBridge(3, 58, 5);      // y: 58..62, x: 3..4
  addHorizontalBridge(3, 61, 7);    // y: 61..62, x: 3..9
  addVerticalBridge(8, 61, 7);      // y: 61..67, x: 8..9
  addHorizontalBridge(8, 66, 7);    // y: 66..67, x: 8..14
  addVerticalBridge(13, 66, 6);     // y: 66..71, x: 13..14
  specs.push({ id: '7', title: '7. [Ruta 12] Zig-Zag Canónico', labelX: 3, labelY: 57, badgeColor: '#4ade80' });

  // 8. Zig-Zag Puente Pepita con Barandas (exactos giros 2x2)
  addVerticalBridge(19, 58, 5);     // y: 58..62, x: 19..20
  addHorizontalBridge(19, 61, 7);   // y: 61..62, x: 19..25
  addVerticalBridge(24, 61, 7);     // y: 61..67, x: 24..25
  addHorizontalBridge(24, 66, 7);   // y: 66..67, x: 24..30
  addVerticalBridge(29, 66, 6);     // y: 66..71, x: 29..30
  specs.push({ id: '8', title: '8. [Puente Pepita] Zig-Zag con Barandas', labelX: 19, labelY: 57, badgeColor: '#facc15' });

  // 9A. Muelle Recto Horizontal (8x2)
  addHorizontalBridge(35, 59, 8);
  specs.push({ id: '9A', title: '9A. [Muelle] H-Medio (8x2)', labelX: 35, labelY: 58, badgeColor: '#60a5fa' });

  // 9B. Muelle Recto Vertical (2x8)
  addVerticalBridge(45, 59, 8);
  specs.push({ id: '9B', title: '9B. [Muelle] V-Medio (2x8)', labelX: 44, labelY: 58, badgeColor: '#60a5fa' });

  // 9C. Giro L Muelle de Piedra (2x2 corner)
  addVerticalBridge(50, 59, 7);
  addHorizontalBridge(50, 64, 8);
  specs.push({ id: '9C', title: '9C. [Muelle] Giro L (2x2)', labelX: 49, labelY: 58, badgeColor: '#60a5fa' });

  // 10. Desembarco en Playa / Islote (Ruta 12)
  for (let y = 74; y <= 81; y++) {
    for (let x = 33; x <= 37; x++) {
      terrainGrid[y]![x] = { terrain: 'sand' };
    }
    for (let x = 52; x <= 57; x++) {
      terrainGrid[y]![x] = { terrain: 'grass' };
    }
  }
  addHorizontalBridge(36, 76, 18);
  specs.push({ id: '10', title: '10. [Ruta 12] Desembarco Playa -> Islote', labelX: 33, labelY: 73, badgeColor: '#4ade80' });

  // Helper resolver for styles by position
  const getBridgeStyle = (cx: number, cy: number): BridgeStyle => {
    for (const r of styleRegions) {
      if (cx >= r.minX && cx <= r.maxX && cy >= r.minY && cy <= r.maxY) {
        return r.style;
      }
    }
    return 'silence_wood';
  };

  // Run the bridge resolution engine!
  const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
    getBridgeStyle
  });
  console.log(`[Bridge Showcase]: Engine generated ${blits.length} bridge blit instructions.`);

  // Verify Zero-Mixing Invariant across all generated blits
  for (const b of blits) {
    const blitStyle = b.style;
    if (blitStyle === 'silence_wood') {
      if (!b.file.includes('silence')) {
        console.error(`[VIOLATION]: Tile ${b.file} at (${b.x}, ${b.y}) does not belong to silence_wood!`);
      }
    } else if (blitStyle === 'stone_pier') {
      if (!b.file.includes('poke_port_pier')) {
        console.error(`[VIOLATION]: Tile ${b.file} at (${b.x}, ${b.y}) does not belong to stone_pier!`);
      }
    } else if (blitStyle === 'golden_wood') {
      if (
        b.file.includes('silence') ||
        b.file.includes('poke_port_pier') ||
        b.file === 'poke_bridge_h_top.png' ||
        b.file === 'poke_bridge_h_bot.png'
      ) {
        console.error(`[VIOLATION]: Tile ${b.file} at (${b.x}, ${b.y}) does not belong to golden_wood!`);
      }
    }
  }

  // Canvas Buffer: FireRed water background (calm sea blue RGBA: 56, 120, 208, 255)
  const canvasBuffer = Buffer.alloc(MAP_W * TILE_SIZE * MAP_H * TILE_SIZE * 4);
  for (let i = 0; i < MAP_W * TILE_SIZE * MAP_H * TILE_SIZE; i++) {
    canvasBuffer[i * 4 + 0] = 56;
    canvasBuffer[i * 4 + 1] = 120;
    canvasBuffer[i * 4 + 2] = 208;
    canvasBuffer[i * 4 + 3] = 255;
  }

  const sandTile = loadTileImage('poke_sand_path_center.png') || loadTileImage('poke_sand.png') || loadTileImage('poke_dirt.png');
  const grassTile = loadTileImage('poke_grass_plain.png') || loadTileImage('poke_grass_pallet.png') || loadTileImage('poke_grass.png');

  const compositeOperations: sharp.OverlayOptions[] = [];

  // Draw terrain
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const terr = terrainGrid[y]![x]!.terrain;
      if (terr === 'sand' && sandTile) {
        compositeOperations.push({
          input: sandTile.data,
          top: y * TILE_SIZE,
          left: x * TILE_SIZE
        });
      } else if (terr === 'grass' && grassTile) {
        compositeOperations.push({
          input: grassTile.data,
          top: y * TILE_SIZE,
          left: x * TILE_SIZE
        });
      }
    }
  }

  // Composite bridge blits
  for (const b of blits) {
    const tile = loadTileImage(b.file);
    if (tile) {
      compositeOperations.push({
        input: tile.data,
        top: b.y * TILE_SIZE,
        left: b.x * TILE_SIZE
      });
    } else {
      console.warn(`[Missing Bridge Tile]: ${b.file} at (${b.x}, ${b.y})`);
    }
  }

  // Build SVG label overlay
  let svg = `<svg width="${MAP_W * TILE_SIZE}" height="${MAP_H * TILE_SIZE}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.8"/>
    </filter>
  </defs>`;

  // Title banner
  svg += `<rect x="16" y="8" width="760" height="42" rx="8" fill="rgba(15, 23, 42, 0.9)" stroke="#38bdf8" stroke-width="2" filter="url(#shadow)"/>`;
  svg += `<text x="32" y="34" font-family="monospace, sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">CATÁLOGO EXHAUSTIVO DE PUENTES Y QUIEBRES (ZERO-MIXING)</text>`;

  // Section Headers
  const sections = [
    { title: 'SECCIÓN 1: RUTA 12 (silence_wood - Roble Rústico sin Barandas)', x: 16, y: 64, stroke: '#4ade80' },
    { title: 'SECCIÓN 2: PUENTE PEPITA (golden_wood - Madera Dorada con Barandas)', x: 16, y: 928, stroke: '#facc15' },
    { title: 'SECCIÓN 3: ZIG-ZAGS, PUERTO CARMÍN (stone_pier) Y DESEMBARCOS', x: 16, y: 1792, stroke: '#60a5fa' }
  ];

  for (const s of sections) {
    const textWidth = s.title.length * 8.5 + 24;
    svg += `<g transform="translate(${s.x}, ${s.y})">`;
    svg += `<rect x="0" y="0" width="${textWidth}" height="26" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="${s.stroke}" stroke-width="2" filter="url(#shadow)"/>`;
    svg += `<text x="12" y="18" font-family="monospace, sans-serif" font-size="12" font-weight="bold" fill="${s.stroke}">${s.title}</text>`;
    svg += `</g>`;
  }

  for (const spec of specs) {
    const px = spec.labelX * TILE_SIZE;
    const py = spec.labelY * TILE_SIZE;
    const textWidth = spec.title.length * 7.5 + 16;
    const badge = spec.badgeColor || '#fbbf24';
    svg += `<g transform="translate(${px}, ${py})">`;
    svg += `<rect x="0" y="0" width="${textWidth}" height="22" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="${badge}" stroke-width="1.5" filter="url(#shadow)"/>`;
    svg += `<text x="8" y="15" font-family="monospace, sans-serif" font-size="10.5" font-weight="bold" fill="${badge}">${spec.title}</text>`;
    svg += `</g>`;
  }
  svg += `</svg>`;

  compositeOperations.push({
    input: Buffer.from(svg),
    top: 0,
    left: 0
  });

  const baseImage = sharp(canvasBuffer, {
    raw: {
      width: MAP_W * TILE_SIZE,
      height: MAP_H * TILE_SIZE,
      channels: 4
    }
  });

  const finalBuffer = await baseImage
    .composite(compositeOperations)
    .png()
    .toBuffer();

  const scratchOut = path.join(SCRATCH_DIR, 'catalogo_analisis_puentes.png');
  fs.writeFileSync(scratchOut, finalBuffer);

  const artifactOut = path.join(ARTIFACT_DIR, 'catalogo_analisis_puentes.png');
  fs.writeFileSync(artifactOut, finalBuffer);

  // High quality section crops
  const crops = [
    { name: 'crop_showcase_01_silence_wood.png', top: 0, left: 0, width: MAP_W * TILE_SIZE, height: 864 },
    { name: 'crop_showcase_02_golden_wood.png', top: 864, left: 0, width: MAP_W * TILE_SIZE, height: 864 },
    { name: 'crop_showcase_03_muelles_y_zigzags.png', top: 1728, left: 0, width: MAP_W * TILE_SIZE, height: 960 }
  ];

  for (const c of crops) {
    const cropBuf = await sharp(finalBuffer)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(ARTIFACT_DIR, c.name), cropBuf);
    fs.writeFileSync(path.join(SCRATCH_DIR, c.name), cropBuf);
    console.log(`[Showcase Crop]: ${c.name} generated.`);
  }

  // Pixel-perfect 2x nearest-neighbor zoom crops for detailed visual inspection
  const zooms = [
    {
      name: 'zoom_puente_pepita_zigzag.png',
      left: 18 * TILE_SIZE,
      top: 56 * TILE_SIZE,
      width: 14 * TILE_SIZE,
      height: 18 * TILE_SIZE,
      scale: 2
    },
    {
      name: 'zoom_ruta12_zigzag.png',
      left: 2 * TILE_SIZE,
      top: 56 * TILE_SIZE,
      width: 14 * TILE_SIZE,
      height: 18 * TILE_SIZE,
      scale: 2
    },
    {
      name: 'zoom_puente_pepita_turns.png',
      left: 19 * TILE_SIZE,
      top: 36 * TILE_SIZE,
      width: 40 * TILE_SIZE,
      height: 15 * TILE_SIZE,
      scale: 2
    }
  ];

  for (const z of zooms) {
    const extracted = await sharp(finalBuffer)
      .extract({ left: z.left, top: z.top, width: z.width, height: z.height })
      .resize({
        width: z.width * z.scale,
        height: z.height * z.scale,
        kernel: sharp.kernel.nearest
      })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(ARTIFACT_DIR, z.name), extracted);
    fs.writeFileSync(path.join(SCRATCH_DIR, z.name), extracted);
    console.log(`[Showcase Zoom]: ${z.name} generated.`);
  }

  console.log(`[Success]: Multi-style bridge showcase generated at ${artifactOut}`);
}

main().catch((err) => {
  console.error('[Error in generate_bridge_showcase]:', err);
  process.exit(1);
});
