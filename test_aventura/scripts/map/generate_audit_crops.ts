/**
 * scripts/map/generate_audit_crops.ts
 *
 * Extracts high-resolution diagnostic crops of visual and topological defects
 * found in the 10-map audit run with red highlight markers.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/multi_map_audit');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface CropDef {
  readonly id: string;
  readonly mapFile: string;
  readonly title: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly circleX: number;
  readonly circleY: number;
  readonly circleR: number;
}

const CROPS: readonly CropDef[] = [
  {
    id: 'error_audit_01_floating_bridge_map4',
    mapFile: 'map_04_alpine_fjords_80x80_full.png',
    title: 'Puente Cortado en Aguas Abiertas (Faro Marino - Mapa 4)',
    left: 300,
    top: 1750,
    width: 550,
    height: 450,
    circleX: 200,
    circleY: 220,
    circleR: 65
  },
  {
    id: 'error_audit_02_orphan_cave_map4',
    mapFile: 'map_04_alpine_fjords_80x80_full.png',
    title: 'POI Huerfano sin Camino por Acantilado (Tunel Roca - Mapa 4)',
    left: 550,
    top: 850,
    width: 550,
    height: 450,
    circleX: 230,
    circleY: 220,
    circleR: 70
  },
  {
    id: 'error_audit_03_fences_on_mountain_map9',
    mapFile: 'map_09_highland_valleys_64x64_full.png',
    title: 'Vallas de Madera en Risco Rocoso (Entrada Mt. Moon - Mapa 9)',
    left: 1100,
    top: 1300,
    width: 550,
    height: 450,
    circleX: 290,
    circleY: 230,
    circleR: 75
  },
  {
    id: 'error_audit_04_orphan_path_strip_map2',
    mapFile: 'map_02_pangaea_64x64_full.png',
    title: 'Segmento Aislado de Camino Huerfano (Llanura Oeste - Mapa 2)',
    left: 480,
    top: 980,
    width: 450,
    height: 420,
    circleX: 210,
    circleY: 200,
    circleR: 60
  },
  {
    id: 'error_audit_05_disconnected_bridgehead_map8',
    mapFile: 'map_08_continental_divide_112x112_full.png',
    title: 'Desembarco de Puente Aislado de la Red Vial (Faro Marino - Mapa 8)',
    left: 2150,
    top: 350,
    width: 600,
    height: 500,
    circleX: 300,
    circleY: 280,
    circleR: 85
  }
];

async function main(): Promise<void> {
  for (const crop of CROPS) {
    const mapPath = path.join(SCRATCH_DIR, crop.mapFile);
    if (!fs.existsSync(mapPath)) {
      console.warn(`[Crop Warning] Source map not found: ${mapPath}`);
      continue;
    }

    const svgOverlay = `
      <svg width="${crop.width}" height="${crop.height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${crop.circleX}" cy="${crop.circleY}" r="${crop.circleR}" fill="none" stroke="#ef4444" stroke-width="5" stroke-dasharray="8,5" />
        <rect x="12" y="12" width="${crop.title.length * 9 + 24}" height="32" rx="6" fill="#111827" fill-opacity="0.85" stroke="#ef4444" stroke-width="2"/>
        <text x="24" y="34" font-family="sans-serif" font-size="14" font-weight="700" fill="#ffffff">${crop.title}</text>
      </svg>
    `;

    const buffer = await sharp(mapPath)
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
      .composite([{ input: Buffer.from(svgOverlay), left: 0, top: 0 }])
      .png()
      .toBuffer();

    const artifactOut = path.join(ARTIFACT_DIR, `${crop.id}.png`);
    fs.writeFileSync(artifactOut, buffer);
    console.log(`[Crop Saved]: ${artifactOut}`);
  }
}

main().catch((err) => {
  console.error('[Crop Error]', err);
  process.exit(1);
});
