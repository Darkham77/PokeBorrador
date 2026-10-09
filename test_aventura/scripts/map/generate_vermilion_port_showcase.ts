/**
 * scripts/map/generate_vermilion_port_showcase.ts
 *
 * VERMILION PORT & CANONICAL VESSELS SHOWCASE GENERATOR (Node.js 26+)
 *
 * Generates:
 * 1. Visual Catalog Image: catalogo_puerto_y_barcos.png (showcase of all 9 port assets).
 * 2. Multi-seed procedural maps verifying that EVERY map contains EXACTLY ONE Vermilion Port.
 * 3. High-resolution 4x zoom crops of the Vermilion Port area (showing entrance gate, pier,
 *    docked ferry/catamaran, crates, bollards, beacon, and famous dock truck).
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { generateContinentMap, type ContinentMapResult } from '../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../src/logic/map/wildernessVegetationEngine.ts';
import { buildMapBlitInstructions } from '../../src/logic/map/canvasTileRenderer.ts';
import { CANONICAL_ASSETS_BY_ID } from '../../src/logic/map/canonicalAssetsRegistry.ts';
import type { POINode } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

const rawCache = new Map<string, RawImage | null>();

function resolveAssetPath(filename: string): string | null {
  const baseId = filename.replace(/\.png$/, '');
  const canonAsset = CANONICAL_ASSETS_BY_ID[baseId];
  if (canonAsset) {
    const canonPath = path.resolve(ROOT_DIR, 'public/assets', canonAsset.runtimePath);
    if (fs.existsSync(canonPath)) return canonPath;
  }

  const candidates = [
    path.resolve(ROOT_DIR, 'public/assets/canon/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/infrastructure', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/elevation', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/vegetation', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles', filename)
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function loadRawImage(filePath: string): Promise<RawImage | null> {
  if (rawCache.has(filePath)) return rawCache.get(filePath)!;
  if (!fs.existsSync(filePath)) {
    rawCache.set(filePath, null);
    return null;
  }
  try {
    const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const img: RawImage = { width: info.width, height: info.height, data };
    rawCache.set(filePath, img);
    return img;
  } catch {
    rawCache.set(filePath, null);
    return null;
  }
}

async function renderFullMapBuffer(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[]
): Promise<{ buffer: Buffer; width: number; height: number; vermilionPort: POINode }> {
  const W = continent.width;
  const H = continent.height;
  const wilderness = generateWildernessLayer(continent, pois, pathGrid, { seed: continent.seed });
  const blitPlan = buildMapBlitInstructions(continent, pois, pathGrid, bridgeGrid, wilderness);

  for (const fn of blitPlan.uniqueFilenames) {
    const p = resolveAssetPath(fn);
    if (p) await loadRawImage(p);
  }

  const canvasWidth = W * TILE_SIZE;
  const canvasHeight = H * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);

  // Deep ocean background
  for (let i = 0; i < canvasBuffer.length; i += 4) {
    canvasBuffer[i] = 16;
    canvasBuffer[i + 1] = 16;
    canvasBuffer[i + 2] = 20;
    canvasBuffer[i + 3] = 255;
  }

  for (const inst of blitPlan.instructions) {
    const fullPath = resolveAssetPath(inst.filename);
    const img = rawCache.get(fullPath ?? '');
    if (!img) continue;

    const { width: tw, height: th, data } = img;
    for (let r = 0; r < th; r++) {
      const dy = inst.py + r;
      if (dy < 0 || dy >= canvasHeight) continue;
      const dstRowOffset = dy * canvasWidth * 4;
      const srcRowOffset = r * tw * 4;

      for (let c = 0; c < tw; c++) {
        const dx = inst.px + c;
        if (dx < 0 || dx >= canvasWidth) continue;

        const srcIdx = srcRowOffset + c * 4;
        const alpha = data[srcIdx + 3]!;
        if (alpha === 0) continue;

        const dstIdx = dstRowOffset + dx * 4;
        if (alpha === 255) {
          canvasBuffer[dstIdx] = data[srcIdx]!;
          canvasBuffer[dstIdx + 1] = data[srcIdx + 1]!;
          canvasBuffer[dstIdx + 2] = data[srcIdx + 2]!;
          canvasBuffer[dstIdx + 3] = 255;
        } else {
          const a = alpha / 255;
          const invA = 1 - a;
          canvasBuffer[dstIdx] = (data[srcIdx]! * a + canvasBuffer[dstIdx]! * invA) | 0;
          canvasBuffer[dstIdx + 1] = (data[srcIdx + 1]! * a + canvasBuffer[dstIdx + 1]! * invA) | 0;
          canvasBuffer[dstIdx + 2] = (data[srcIdx + 2]! * a + canvasBuffer[dstIdx + 2]! * invA) | 0;
          canvasBuffer[dstIdx + 3] = 255;
        }
      }
    }
  }

  const vermilionPort = pois.find((p) => p.type === 'port_dock')!;
  return { buffer: canvasBuffer, width: canvasWidth, height: canvasHeight, vermilionPort };
}

async function generateVisualCatalog(): Promise<void> {
  console.log('Generating Visual Catalog of all 9 Canonical Port & Vessel Assets...');

  const assets = [
    { file: 'poke_port_vermilion_gate.png', title: 'Vermilion Port Pier Entrance Gate', size: '224x192 px (7x6 tiles)' },
    { file: 'poke_ship_ferry_docked.png', title: 'Seagallop Docked Ferry with Gangway', size: '224x160 px (7x5 tiles)' },
    { file: 'poke_ship_seagallop_east.png', title: 'Seagallop Catamaran (Eastbound)', size: '160x96 px (5x3 tiles)' },
    { file: 'poke_ship_seagallop_west.png', title: 'Seagallop Catamaran (Westbound)', size: '160x96 px (5x3 tiles)' },
    { file: 'poke_port_lighthouse_beacon.png', title: 'Harbor Lighthouse Beacon Light Tower', size: '64x128 px (2x4 tiles)' },
    { file: 'poke_port_cargo_crates_stack.png', title: 'Port Cargo Wooden Crates Stack', size: '96x64 px (3x2 tiles)' },
    { file: 'poke_port_cargo_crates_double.png', title: 'Port Cargo Wooden Crates Double', size: '64x32 px (2x1 tiles)' },
    { file: 'poke_port_bollard_chains.png', title: 'Mooring Bollards & Security Chains', size: '64x32 px (2x1 tiles)' },
    { file: 'poke_port_dock_truck.png', title: 'Vermilion Pier Famous Pickup Truck', size: '96x64 px (3x2 tiles)' }
  ];

  const cardWidth = 360;
  const cardHeight = 270;
  const cols = 3;
  const rows = 3;
  const catalogWidth = cols * cardWidth + 40;
  const catalogHeight = rows * cardHeight + 120;

  let svg = `<svg width="${catalogWidth}" height="${catalogHeight}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .bg { fill: #0f172a; }
      .header-title { font-family: sans-serif; font-size: 26px; font-weight: 800; fill: #38bdf8; }
      .header-sub { font-family: sans-serif; font-size: 14px; font-weight: 500; fill: #94a3b8; }
      .card-bg { fill: #1e293b; stroke: #334155; stroke-width: 1.5px; rx: 8px; }
      .asset-title { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #f8fafc; }
      .asset-size { font-family: sans-serif; font-size: 12px; font-weight: 600; fill: #38bdf8; }
      .check-badge { font-family: sans-serif; font-size: 11px; font-weight: 700; fill: #10b981; }
    </style>
    <rect width="${catalogWidth}" height="${catalogHeight}" class="bg"/>
    <text x="24" y="44" class="header-title">POKÉ VICIO - CATÁLOGO OFICIAL DE PUERTO CARMÍN Y EMBARCACIONES</text>
    <text x="24" y="68" class="header-sub">9 Assets Canónicos GBA FireRed 100% Certificados - Estándar 32px - Transparencia Alfa BFS</text>
  `;

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < assets.length; i++) {
    const item = assets[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 20 + col * cardWidth;
    const cy = 90 + row * cardHeight;

    const safeTitle = item.title.replace(/&/g, '&amp;');
    svg += `
      <g transform="translate(${cx}, ${cy})">
        <rect width="${cardWidth - 16}" height="${cardHeight - 16}" class="card-bg"/>
        <text x="16" y="24" class="asset-title">${safeTitle}</text>
        <text x="16" y="42" class="asset-size">${item.size}</text>
        <text x="${cardWidth - 110}" y="42" class="check-badge">✓ CANONICAL</text>
      </g>
    `;

    const assetPath = resolveAssetPath(item.file);
    if (assetPath && fs.existsSync(assetPath)) {
      const meta = await sharp(assetPath).metadata();
      const aw = meta.width ?? 64;
      const ah = meta.height ?? 64;
      const maxDrawW = cardWidth - 48;
      const maxDrawH = cardHeight - 80;
      const scale = Math.min(1, Math.min(maxDrawW / aw, maxDrawH / ah));
      const drawW = Math.round(aw * scale);
      const drawH = Math.round(ah * scale);

      const resizedAsset = await sharp(assetPath)
        .resize(drawW, drawH, { kernel: 'nearest' })
        .png()
        .toBuffer();

      const imgLeft = cx + Math.round(((cardWidth - 16) - drawW) / 2);
      const imgTop = cy + 56 + Math.round((maxDrawH - drawH) / 2);

      composites.push({ input: resizedAsset, left: imgLeft, top: imgTop });
    }
  }

  svg += `</svg>`;

  const catalogBuf = await sharp(Buffer.from(svg))
    .composite(composites)
    .png()
    .toBuffer();

  const outCatalogScratch = path.join(SCRATCH_DIR, 'catalogo_puerto_y_barcos.png');
  const outCatalogArtifact = path.join(ARTIFACT_DIR, 'catalogo_puerto_y_barcos.png');
  fs.writeFileSync(outCatalogScratch, catalogBuf);
  fs.writeFileSync(outCatalogArtifact, catalogBuf);
  console.log('-> Saved:', outCatalogScratch);
  console.log('-> Copied to artifact:', outCatalogArtifact);
}

export async function runShowcase(): Promise<void> {
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  await generateVisualCatalog();

  console.log('=== GENERATING PROCEDURAL CONTINENTS & VERIFYING EXACTLY 1 VERMILION PORT ===');

  const testSeeds = [
    { id: 'continente_01_archipielago', size: 64, seed: 101, oceanWater: 0.50, mtn: 0.12, title: 'Archipielago Costero' },
    { id: 'continente_02_gran_continente', size: 96, seed: 404, oceanWater: 0.32, mtn: 0.28, title: 'Gran Continente Regional' },
    { id: 'continente_03_costa_sur', size: 80, seed: 777, oceanWater: 0.35, mtn: 0.20, title: 'Bahia Maritima Costera' },
    { id: 'continente_04_kanto_maritimo', size: 112, seed: 888, oceanWater: 0.28, mtn: 0.25, title: 'Kanto Extendido Maritimo' }
  ];

  for (const cfg of testSeeds) {
    console.log(`\nGenerating ${cfg.title} (${cfg.size}x${cfg.size}, seed: ${cfg.seed})...`);
    const continent = generateContinentMap({
      width: cfg.size,
      height: cfg.size,
      seed: cfg.seed,
      oceanWaterPercentage: cfg.oceanWater,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: cfg.mtn,
      mountainPalette: 'brown',
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 16 });
    const ports = pois.filter((p) => p.type === 'port_dock');
    console.log(`-> Port Docks Count: ${ports.length} (Expected: 1)`);
    if (ports.length !== 1) {
      throw new Error(`FAIL: Map ${cfg.id} has ${ports.length} ports instead of exactly 1!`);
    }

    const port = ports[0]!;
    console.log(`-> Port ID: "${port.id}", Name: "${port.name}", Building: "${port.buildingFile}"`);
    console.log(`-> Port Position: [x: ${port.gridX}, y: ${port.gridY}, ${port.footprint.width}x${port.footprint.height}], Facing: ${port.facing}`);

    const routeResult = generateRouteNetwork(continent, pois);
    const { buffer, width, height, vermilionPort } = await renderFullMapBuffer(
      continent,
      pois,
      routeResult.pathGrid,
      routeResult.bridgeGrid
    );

    // Save full overview map
    const fullMapPng = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const fullMapPath = path.join(SCRATCH_DIR, `${cfg.id}_overview.png`);
    const fullMapArtifact = path.join(ARTIFACT_DIR, `${cfg.id}_overview.png`);
    fs.writeFileSync(fullMapPath, fullMapPng);
    fs.writeFileSync(fullMapArtifact, fullMapPng);
    console.log(`-> Overview saved: ${fullMapPath}`);

    // High-res 4x zoom crop of the Vermilion Port Area
    const facing = vermilionPort.facing ?? 'south';
    const extraNorth = facing === 'north' ? 14 : 4;
    const extraSouth = facing === 'south' ? 14 : 4;
    const extraWest = facing === 'west' ? 14 : 5;
    const extraEast = facing === 'east' ? 14 : 5;

    const cropMinX = Math.max(0, vermilionPort.gridX - extraWest);
    const cropMinY = Math.max(0, vermilionPort.gridY - extraNorth);
    const cropMaxX = Math.min(cfg.size, vermilionPort.gridX + vermilionPort.footprint.width + extraEast);
    const cropMaxY = Math.min(cfg.size, vermilionPort.gridY + vermilionPort.footprint.height + extraSouth);

    const cropX = cropMinX * TILE_SIZE;
    const cropY = cropMinY * TILE_SIZE;
    const cropW = (cropMaxX - cropMinX) * TILE_SIZE;
    const cropH = (cropMaxY - cropMinY) * TILE_SIZE;

    console.log(`-> Cropping Vermilion Port area: [${cropX}, ${cropY}, ${cropW}x${cropH}]`);

    const portCrop = await sharp(buffer, { raw: { width, height, channels: 4 } })
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .resize(cropW * 3, cropH * 3, { kernel: 'nearest' })
      .png()
      .toBuffer();

    const cropPath = path.join(SCRATCH_DIR, `${cfg.id}_puerto_carmin_zoom.png`);
    const cropArtifact = path.join(ARTIFACT_DIR, `${cfg.id}_puerto_carmin_zoom.png`);
    fs.writeFileSync(cropPath, portCrop);
    fs.writeFileSync(cropArtifact, portCrop);
    console.log(`-> Port Zoom saved: ${cropPath}`);
  }

  console.log('\n=== ALL SHOWCASE MAPS & ASSET CATALOG GENERATED SUCCESSFULLY! ===');
}

if (process.argv[1]?.includes('generate_vermilion_port_showcase')) {
  runShowcase().catch((err) => {
    console.error('Fatal error generating port showcase:', err);
    process.exit(1);
  });
}
