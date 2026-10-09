/**
 * scripts/map/list_pois_and_crop.ts
 *
 * Dynamically locates the 10 canonical landmark spots on the 400x400 Pokémon continent (seed 7741)
 * and crops 832x832 px (26x26 tiles) 1:1 pixel art views centered directly on each POI.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { generatePokemonContinentalWorld } from '../../src/logic/map/continent/continentalEngine.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');
const HD_IMAGE_PATH = path.resolve(ROOT_DIR, 'scratch/continente_pokemon_ultra_hd_12800px.png');

async function run(): Promise<void> {
  console.log('Generating world to locate exact POI centers...');
  const res = generatePokemonContinentalWorld({ seed: 7741, width: 400, height: 400 });
  const { pois } = res;

  if (!fs.existsSync(HD_IMAGE_PATH)) {
    console.error(`HD image not found at ${HD_IMAGE_PATH}`);
    return;
  }

  const meta = await sharp(HD_IMAGE_PATH).metadata();
  const W_px = meta.width ?? 12800;
  const H_px = meta.height ?? 12800;

  // Selected 10 key diagnostic spots across the continent
  const targetSpots = [
    {
      filename: 'spot_01_pueblo_paleta.png',
      title: '1. Pueblo Paleta (Laboratorio Oak, Casas y Jardines)',
      poi: pois.find(p => p.id.includes('node_0') || p.name.includes('Paleta'))
    },
    {
      filename: 'spot_02_ciudad_plateada.png',
      title: '2. Ciudad Plateada (Museo Limpio y Gimnasio Roca)',
      poi: pois.find(p => p.id.includes('node_1') || p.name.includes('Plateada'))
    },
    {
      filename: 'spot_03_bosque_verde.png',
      title: '3. Bosque Verde (Dédalo Arbóreo y Rutas Naturales)',
      poi: pois.find(p => p.type === 'dungeon_forest' || p.name.includes('Bosque Verde'))
    },
    {
      filename: 'spot_04_cueva_mt_moon.png',
      title: '4. Monte Moon (Entrada Cueva y Cordillera)',
      poi: pois.find(p => p.type === 'cave_entrance' || p.name.includes('Moon'))
    },
    {
      filename: 'spot_05_ciudad_celeste.png',
      title: '5. Ciudad Celeste (Canales, Acera y Gimnasio Cascada)',
      poi: pois.find(p => p.id.includes('node_2') || p.name.includes('Celeste'))
    },
    {
      filename: 'spot_06_ciudad_carmin.png',
      title: '6. Ciudad Carmín (Casco Urbano y Club de Fans)',
      poi: pois.find(p => p.id.includes('node_3') || p.name.includes('Carmín'))
    },
    {
      filename: 'spot_07_ciudad_celadon.png',
      title: '7. Ciudad Celadón / Azulona (Metrópolis Comercial)',
      poi: pois.find(p => p.id.includes('node_4') || p.name.includes('Celadón') || p.name.includes('Azulona'))
    },
    {
      filename: 'spot_08_ciudad_azafran.png',
      title: '8. Ciudad Azafrán (Encrucijada y Doble Gimnasio)',
      poi: pois.find(p => p.id.includes('node_6') || p.name.includes('Azafrán'))
    },
    {
      filename: 'spot_09_meseta_anil_liga.png',
      title: '9. Meseta Añil (Liga Pokémon y Gran Escalinata)',
      poi: pois.find(p => p.type === 'pokemon_league')
    },
    {
      filename: 'spot_10_garita_de_ruta.png',
      title: '10. Garita de Ruta (Control Fronterizo y Cercos)',
      poi: pois.find(p => p.type === 'route_gate')
    }
  ];

  const CROP_TILES = 26; // 26x26 tiles = 832x832 px
  const CROP_PX = CROP_TILES * TILE_SIZE;

  for (let i = 0; i < targetSpots.length; i++) {
    const spot = targetSpots[i]!;
    if (!spot.poi) {
      console.warn(`[Spot ${i + 1}] POI not found for: ${spot.title}`);
      continue;
    }

    const centerX = spot.poi.gridX + spot.poi.footprint.width / 2;
    const centerY = spot.poi.gridY + spot.poi.footprint.height / 2;

    const leftPx = Math.max(0, Math.min(W_px - CROP_PX, Math.round((centerX - CROP_TILES / 2) * TILE_SIZE)));
    const topPx = Math.max(0, Math.min(H_px - CROP_PX, Math.round((centerY - CROP_TILES / 2) * TILE_SIZE)));

    const outPath = path.join(ARTIFACT_DIR, spot.filename);
    await sharp(HD_IMAGE_PATH)
      .extract({ left: leftPx, top: topPx, width: CROP_PX, height: CROP_PX })
      .png({ compressionLevel: 6 })
      .toFile(outPath);

    console.log(`✅ [${i + 1}/10] ${spot.title} guardado en: ${spot.filename} (coord: ${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
  }

  console.log('Todos los 10 puntos clave han sido extraídos exitosamente!');
}

run().catch(console.error);
