/**
 * scripts/map/generate_verification_crops.ts
 *
 * Extracts diagnostic HD crops from the updated 400x400 procedural Pokémon regions
 * to verify the eradication of engine bugs:
 *   1. Wide natural marine surf strait & true archipelago (no laser ditch).
 *   2. Pokémon League (Meseta Añil) monumental stairs & gatehouse clearance.
 *   3. Terrain-aware A* mountain route pathfinding.
 *   4. Route gatehouse checkpoint passage without roof bleeding.
 */

import path from 'node:path';
import sharp from 'sharp';
import { generatePokemonContinentalWorld } from '../../src/logic/map/continent/continentalEngine.ts';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');
const TILE_SIZE = 32;

async function run(): Promise<void> {
  console.log('Generating verification crops from updated 400x400 engine...');

  // 1. Region 1 (Seed 7741): Archipiélago Austral
  const reg1 = generatePokemonContinentalWorld({ seed: 7741, width: 400, height: 400 });
  const reg1ImgPath = path.join(SCRATCH_DIR, 'region_1_archipielago_austral_pixelart.png');
  const reg1Meta = await sharp(reg1ImgPath).metadata();
  const scale1 = (reg1Meta.width ?? 3200) / (400 * TILE_SIZE);

  // Locate League, Surf corridor, and Route Gate in Region 1
  const league1 = reg1.pois.find((p) => p.type === 'pokemon_league');
  const island1 = reg1.pois.find((p) => /canela|island|isla/i.test(p.name) || p.terrainPreference === 'coast_water');
  const gate1 = reg1.pois.find((p) => p.type === 'route_gate');

  // Crop League in Region 1
  if (league1) {
    const cx = Math.round((league1.gridX + league1.footprint.width / 2) * TILE_SIZE * scale1);
    const cy = Math.round((league1.gridY + league1.footprint.height / 2) * TILE_SIZE * scale1);
    const cropSize = 700;
    const left = Math.max(0, Math.min((reg1Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg1Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_01_meseta_anil_league_clearance.png');
    await sharp(reg1ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  // Crop Island & Surf Strait in Region 1
  if (island1) {
    const cx = Math.round((island1.gridX + island1.footprint.width / 2) * TILE_SIZE * scale1);
    const cy = Math.round((island1.gridY + island1.footprint.height / 2) * TILE_SIZE * scale1);
    const cropSize = 900;
    const left = Math.max(0, Math.min((reg1Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg1Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_02_archipielago_isla_surf_strait.png');
    await sharp(reg1ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  // Crop Route Gate in Region 1
  if (gate1) {
    const cx = Math.round((gate1.gridX + gate1.footprint.width / 2) * TILE_SIZE * scale1);
    const cy = Math.round((gate1.gridY + gate1.footprint.height / 2) * TILE_SIZE * scale1);
    const cropSize = 600;
    const left = Math.max(0, Math.min((reg1Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg1Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_03_route_gate_clean_passage.png');
    await sharp(reg1ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  // 2. Region 2 (Seed 2305): Cordillera Central (Mountain Valley Routes)
  const reg2 = generatePokemonContinentalWorld({ seed: 2305, width: 400, height: 400 });
  const reg2ImgPath = path.join(SCRATCH_DIR, 'region_2_cordillera_central_pixelart.png');
  const reg2Meta = await sharp(reg2ImgPath).metadata();
  const scale2 = (reg2Meta.width ?? 3200) / (400 * TILE_SIZE);

  const cave2 = reg2.pois.find((p) => p.type === 'cave_entrance');
  if (cave2) {
    const cx = Math.round((cave2.gridX + cave2.footprint.width / 2) * TILE_SIZE * scale2);
    const cy = Math.round((cave2.gridY + cave2.footprint.height / 2) * TILE_SIZE * scale2);
    const cropSize = 750;
    const left = Math.max(0, Math.min((reg2Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg2Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_04_cordillera_mountain_routes.png');
    await sharp(reg2ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  // Find a corridor segment in Region 2 that passes through mountain massifs
  let passPoint: { x: number; y: number } | null = null;
  for (const c of reg2.embedded.corridors) {
    if (c.kind === 'surf_route' || c.kind === 'wormhole_tunnel') continue;
    for (let i = 5; i < c.pathCells.length - 5; i++) {
      const pt = c.pathCells[i]!;
      let adjacentMountain = 0;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const cell = reg2.continent.cells[pt.y + dy]?.[pt.x + dx];
          if (cell && cell.elevation >= 1) adjacentMountain++;
        }
      }
      if (adjacentMountain >= 8) {
        passPoint = pt;
        break;
      }
    }
    if (passPoint) break;
  }

  if (passPoint) {
    const cx = Math.round(passPoint.x * TILE_SIZE * scale2);
    const cy = Math.round(passPoint.y * TILE_SIZE * scale2);
    const cropSize = 800;
    const left = Math.max(0, Math.min((reg2Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg2Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_05_mountain_pass_valley_route.png');
    await sharp(reg2ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  // 3. Crop Town Residential Garden Enclosure in Region 1 (Pueblo Paleta)
  const town1 = reg1.pois.find((p) => p.name === 'Pueblo Paleta' || p.type === 'town');
  if (town1) {
    const cx = Math.round((town1.gridX + town1.footprint.width / 2) * TILE_SIZE * scale1);
    const cy = Math.round((town1.gridY + town1.footprint.height / 2) * TILE_SIZE * scale1);
    const cropSize = 650;
    const left = Math.max(0, Math.min((reg1Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg1Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_08_town_residential_garden_fences.png');
    await sharp(reg1ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  // 4. Crop Natural Route with Clean Connected Fences in Region 1 (edge_node_0_node_1 between Paleta and Plateada)
  const corridor1 = reg1.embedded.corridors.find((c) => c.id === 'edge_node_0_node_1' || c.kind === 'main_chain');
  if (corridor1) {
    const midPt = corridor1.pathCells[Math.floor(corridor1.pathCells.length / 2)]!;
    const cx = Math.round(midPt.x * TILE_SIZE * scale1);
    const cy = Math.round(midPt.y * TILE_SIZE * scale1);
    const cropSize = 650;
    const left = Math.max(0, Math.min((reg1Meta.width ?? 3200) - cropSize, cx - cropSize / 2));
    const top = Math.max(0, Math.min((reg1Meta.height ?? 3200) - cropSize, cy - cropSize / 2));

    const outCrop = path.join(ARTIFACT_DIR, 'verif_09_natural_route_connected_fences.png');
    await sharp(reg1ImgPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: cropSize, height: cropSize })
      .toFile(outCrop);
    console.log(`Saved: ${outCrop}`);
  }

  console.log('All verification crops generated successfully!');
}

run().catch(console.error);
