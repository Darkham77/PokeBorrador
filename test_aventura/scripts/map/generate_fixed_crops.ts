/**
 * scripts/map/generate_fixed_crops.ts
 *
 * Extracts high-resolution focused crops of:
 *   1. Faro Marino bridge (rectilinear water crossing without jogs or orphan railings)
 *   2. Entrada Mt. Moon (authentic FireRed 32x64 dark cave entrance & transparent rocks)
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/multi_map_audit');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface CropConfig {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

const CROPS = [
  {
    id: 'detalle_puente_faro_marino_fixed',
    left: 2680,
    top: 150,
    width: 420,
    height: 650,
    scale: 2
  },
  {
    id: 'detalle_cueva_y_rocas_fixed',
    left: 1300,
    top: 1050,
    width: 450,
    height: 400,
    scale: 2
  }
] as const satisfies readonly CropConfig[];

async function main(): Promise<void> {
  const mapPath = path.join(SCRATCH_DIR, 'continente_completo_full.png');
  if (!fs.existsSync(mapPath)) {
    throw new Error(`Master map image not found at ${mapPath}`);
  }

  for (const crop of CROPS) {
    const cropped = await sharp(mapPath)
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
      .resize(crop.width * crop.scale, crop.height * crop.scale, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();

    const scratchOut = path.join(SCRATCH_DIR, `${crop.id}.png`);
    fs.writeFileSync(scratchOut, cropped);

    const artifactOut = path.join(ARTIFACT_DIR, `${crop.id}.png`);
    fs.writeFileSync(artifactOut, cropped);

    console.log(`[Crop Generated]: ${crop.id}.png (${crop.width * crop.scale}x${crop.height * crop.scale})`);
  }
}

main().catch((err) => {
  console.error('[Crop Error]', err);
  process.exit(1);
});
