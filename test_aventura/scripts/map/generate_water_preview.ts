/**
 * scripts/map/generate_water_preview.ts
 *
 * Visual verification generator for Canonical Water, Coastlines, and Beaches.
 *
 * Renders:
 *   1. An inland freshwater lake (Grass-to-Water) with outer corners, inner corners
 *      around a grass island, calm center water, and deep water.
 *   2. An ocean coastline with a >= 3 cell sand beach buffer separating grass from sea,
 *      an indented beach cove, canonical foam waves, and deep ocean.
 *   3. Strict non-destructive layer stacking: Grass -> Sand -> Water -> Foam / Overlays.
 *
 * Outputs:
 *   - scratch/verificacion_agua_costas.png
 *   - Copies to artifact directory for multimodal inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  resolveWaterCoastGrid,
  sanitizeWaterTerrainMatrix,
  type WaterTerrainKind
} from '../../src/logic/map/waterAutotileEngine.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const COLS = 36;
const ROWS = 24;

const LPC_DIR = path.resolve(ROOT_DIR, 'public/assets/studio/kanto/lpc');
const OUT_SCRATCH = path.resolve(ROOT_DIR, 'scratch/verificacion_agua_costas.png');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');
const OUT_ARTIFACT = path.join(ARTIFACT_DIR, 'verificacion_agua_costas.png');

async function main() {
  console.log('Generating Canonical Water, Coast & Beach verification preview...');

  // 1. Initialize 36x24 grid filled with grass
  const matrix: WaterTerrainKind[][] = Array.from({ length: ROWS }, () =>
    Array<WaterTerrainKind>(COLS).fill('grass')
  );

  // 2. Feature 1: Inland Freshwater Lake (columns 3..14, rows 3..19)
  for (let r = 3; r <= 19; r++) {
    for (let c = 3; c <= 14; c++) {
      matrix[r]![c] = 'water';
    }
  }

  // 2x2 Grass Island inside the lake to trigger all 4 inner concave corners
  matrix[9]![8] = 'grass';
  matrix[9]![9] = 'grass';
  matrix[10]![8] = 'grass';
  matrix[10]![9] = 'grass';

  // 3. Feature 2: Ocean Coastline and Sand Beach (columns 17..34, rows 2..21)
  // North beach buffer: rows 2..4 across cols 17..34
  for (let r = 2; r <= 4; r++) {
    for (let c = 17; c <= 34; c++) matrix[r]![c] = 'sand';
  }
  // South beach buffer: rows 19..21 across cols 17..34
  for (let r = 19; r <= 21; r++) {
    for (let c = 17; c <= 34; c++) matrix[r]![c] = 'sand';
  }
  // East beach buffer: cols 33..34 across rows 5..18
  for (let r = 5; r <= 18; r++) {
    for (let c = 33; c <= 34; c++) matrix[r]![c] = 'sand';
  }

  // West beach with natural 1-cell stepped cove indentation into ocean:
  // Rows 5..7: West beach at cols 17..20 (width 4), Ocean at cols 21..32
  for (let r = 5; r <= 7; r++) {
    for (let c = 17; c <= 20; c++) matrix[r]![c] = 'sand';
    for (let c = 21; c <= 32; c++) matrix[r]![c] = 'water';
  }
  // Row 8: Step 1 east (beach at 18..21, ocean at 22..32)
  for (let c = 18; c <= 21; c++) matrix[8]![c] = 'sand';
  for (let c = 22; c <= 32; c++) matrix[8]![c] = 'water';

  // Rows 9..14 (cove indent): beach at 19..22, ocean at 23..32
  for (let r = 9; r <= 14; r++) {
    for (let c = 19; c <= 22; c++) matrix[r]![c] = 'sand';
    for (let c = 23; c <= 32; c++) matrix[r]![c] = 'water';
  }

  // Row 15: Step 1 west (beach at 18..21, ocean at 22..32)
  for (let c = 18; c <= 21; c++) matrix[15]![c] = 'sand';
  for (let c = 22; c <= 32; c++) matrix[15]![c] = 'water';

  // Rows 16..18: West beach back to cols 17..20, ocean at cols 21..32
  for (let r = 16; r <= 18; r++) {
    for (let c = 17; c <= 20; c++) matrix[r]![c] = 'sand';
    for (let c = 21; c <= 32; c++) matrix[r]![c] = 'water';
  }

  // 4. Sanitize matrix to enforce >= 2 cell minimum buffer constraints
  const sanitized = sanitizeWaterTerrainMatrix(matrix);

  // 5. Resolve grid autotiling with connected-component classification
  const resolved = resolveWaterCoastGrid(sanitized);

  // 6. Build Sharp composite operations respecting strict layer stacking
  const overlays: sharp.OverlayOptions[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = resolved.cellDetails[r]![c]!;
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;

      for (const tileFile of cell.layerStack) {
        const filePath = path.join(LPC_DIR, tileFile);
        if (fs.existsSync(filePath)) {
          overlays.push({
            input: filePath,
            left: px,
            top: py
          });
        } else {
          console.warn(`Missing tile: ${filePath}`);
        }
      }
    }
  }

  // 7. Base canvas with neutral dark background
  const baseImg = sharp({
    create: {
      width: COLS * TILE_SIZE,
      height: ROWS * TILE_SIZE,
      channels: 4,
      background: { r: 16, g: 16, b: 20, alpha: 1 }
    }
  });

  await baseImg.composite(overlays).png().toFile(OUT_SCRATCH);
  console.log(`✅ Saved preview to ${OUT_SCRATCH}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.copyFileSync(OUT_SCRATCH, OUT_ARTIFACT);
    console.log(`✅ Copied preview to artifact path ${OUT_ARTIFACT}`);
  }
}

main().catch((err) => {
  console.error('Failed to generate water preview:', err);
  process.exit(1);
});
