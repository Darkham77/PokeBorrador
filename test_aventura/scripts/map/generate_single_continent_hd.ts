/**
 * scripts/map/generate_single_continent_hd.ts
 *
 * Generates a single, pristine 400x400 Pokémon Continent at maximum native resolution (12800x12800, 32px per tile)
 * and an ultra-crisp 6400x6400 HD inspection image (16px per tile) so the user can inspect every single tile,
 * garden fence, roof, flower, mountain staircase, tree, and route in meticulous detail.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generatePokemonContinentalWorld,
  type PokemonContinentalWorldResult
} from '../../src/logic/map/continent/continentalEngine.ts';
import {
  buildMapBlitInstructions,
  resolveTileUrl
} from '../../src/logic/map/canvasTileRenderer.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_SIZE = 400;

const SEARCH_DIRS = [
  path.resolve(ROOT_DIR, 'public'),
  path.resolve(ROOT_DIR, 'public/assets'),
  path.resolve(ROOT_DIR, 'public/assets/tiles'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/infrastructure'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation'),
  path.resolve(ROOT_DIR, 'public/assets/canon/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/canon/props'),
  path.resolve(ROOT_DIR, 'public/assets/essentials/autotiles'),
  path.resolve(ROOT_DIR, 'public/assets/studio/kanto/lpc')
];
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
  readonly dataU32: Uint32Array;
}
const rawCache = new Map<string, RawImage | null>();

function findTilePath(filename: string): string | null {
  const rel = resolveTileUrl(filename);
  const directPath = path.join(ROOT_DIR, 'public', rel);
  if (fs.existsSync(directPath)) return directPath;

  for (const dir of SEARCH_DIRS) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function getRawTile(filename: string): Promise<RawImage | null> {
  const filePath = findTilePath(filename);
  if (!filePath) return null;

  if (rawCache.has(filePath)) return rawCache.get(filePath)!;
  try {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const dataU32 = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
    const img: RawImage = { width: info.width, height: info.height, data, dataU32 };
    rawCache.set(filePath, img);
    return img;
  } catch {
    rawCache.set(filePath, null);
    return null;
  }
}

async function run(): Promise<void> {
  console.log('Iniciando generador de Continente Pokémon HD 400x400...');
  const tStart = performance.now();

  const seed = 7741; // Region 1: Archipiélago Austral (Bahía Sur, Montañas, Ciudades, Liga)
  const result: PokemonContinentalWorldResult = generatePokemonContinentalWorld({
    seed,
    width: MAP_SIZE,
    height: MAP_SIZE,
    mountainPalette: 'brown',
    tileScale: TILE_SIZE
  });

  const { continent, graph, embedded, progression, pois, pathGrid, bridgeGrid, wilderness } = result;

  console.log(`Nodos en grafo: ${graph.nodes.length}`);
  console.log(`Corredores ortogonales: ${embedded.corridors.length}`);
  console.log(`Solvabilidad: ${progression.isSolvable ? '100% GARANTIZADA' : 'FALLO'}`);
  console.log(`Puntos de Interés: ${pois.length}`);

  const canvasWidth = continent.width * TILE_SIZE; // 12,800 px
  const canvasHeight = continent.height * TILE_SIZE; // 12,800 px
  console.log(`Dimensiones nativas del lienzo: ${canvasWidth}x${canvasHeight} px (${canvasWidth * canvasHeight * 4 / (1024 * 1024)} MB raw)`);

  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);
  const canvasU32 = new Uint32Array(canvasBuffer.buffer, canvasBuffer.byteOffset, canvasBuffer.byteLength / 4);

  // Background ocean deep: #102040
  canvasU32.fill(0xff402010);

  const blitTile = (img: RawImage, destX: number, destY: number): void => {
    const { width: tw, height: th, dataU32 } = img;
    for (let r = 0; r < th; r++) {
      const dy = destY + r;
      if (dy < 0 || dy >= canvasHeight) continue;

      const srcRowOffset = r * tw;
      const dstRowOffset = dy * canvasWidth;

      for (let c = 0; c < tw; c++) {
        const dx = destX + c;
        if (dx < 0 || dx >= canvasWidth) continue;

        const pixel = dataU32[srcRowOffset + c]!;
        const alpha = pixel >>> 24;
        if (alpha === 0) continue;

        const dstIdx = dstRowOffset + dx;
        if (alpha === 255) {
          canvasU32[dstIdx] = pixel;
        } else {
          const a = alpha / 255;
          const invA = 1 - a;
          const bg = canvasU32[dstIdx]!;
          const rD = (((pixel & 0xFF) * a) + ((bg & 0xFF) * invA)) | 0;
          const gD = ((((pixel >> 8) & 0xFF) * a) + (((bg >> 8) & 0xFF) * invA)) | 0;
          const bD = ((((pixel >> 16) & 0xFF) * a) + (((bg >> 16) & 0xFF) * invA)) | 0;
          canvasU32[dstIdx] = (255 << 24) | (bD << 16) | (gD << 8) | rD;
        }
      }
    }
  };

  const { instructions } = buildMapBlitInstructions(
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness,
    {
      ledges: result.ledges,
      progressionObstacles: result.progressionObstacles,
      microVignettes: result.microVignettes
    }
  );
  console.log(`Instrucciones de blit compiladas: ${instructions.length} tiles/prefabs`);

  const t0 = performance.now();
  for (const inst of instructions) {
    const img = await getRawTile(inst.filename);
    if (img) {
      blitTile(img, inst.px, inst.py);
    }
  }

  const t1 = performance.now();
  console.log(`Renderizado nativo completado en ${(t1 - t0).toFixed(1)}ms!`);

  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  // 1. Guardar versión HD 6400x6400 (16px por tile, nitidez absoluta y peso óptimo para zoom fluido)
  console.log('Generando imagen HD 6400x6400 (16px/tile)...');
  const hdScratchPath = path.join(SCRATCH_DIR, 'continente_pokemon_hd_6400px.png');
  const hdArtifactPath = path.join(ARTIFACT_DIR, 'continente_pokemon_hd_6400px.png');

  await sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    }
  })
    .resize(6400, 6400, { kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 6 })
    .toFile(hdScratchPath);

  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.copyFileSync(hdScratchPath, hdArtifactPath);
  }
  console.log(`Guardado HD 6400px en: ${hdArtifactPath}`);

  // 2. Guardar también versión completa 12800x12800 (1:1 nativa píxel a píxel)
  console.log('Generando imagen Ultra-HD 12800x12800 (32px/tile nativo)...');
  const uhdScratchPath = path.join(SCRATCH_DIR, 'continente_pokemon_ultra_hd_12800px.png');
  const uhdArtifactPath = path.join(ARTIFACT_DIR, 'continente_pokemon_ultra_hd_12800px.png');

  await sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    }
  })
    .png({ compressionLevel: 4 })
    .toFile(uhdScratchPath);

  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.copyFileSync(uhdScratchPath, uhdArtifactPath);
  }
  console.log(`Guardado Ultra-HD 12800px en: ${uhdArtifactPath}`);

  // 3. Extraer una colección de 4 recortes de alta resolución 1:1 representativos de la región
  console.log('Extrayendo recortes de inspección 1:1...');
  const findPoiCoords = (predicate: (p: typeof pois[0]) => boolean, defaultX: number, defaultY: number): { x: number; y: number } => {
    const found = pois.find(predicate);
    if (found) {
      return {
        x: found.gridX + Math.floor(found.footprint.width / 2),
        y: found.gridY + Math.floor(found.footprint.height / 2)
      };
    }
    return { x: defaultX, y: defaultY };
  };

  const paletaCoords = findPoiCoords((p) => p.id === 'starter_town_hero' || p.id.includes('paleta'), 51, 331);
  const leagueCoords = findPoiCoords((p) => p.type === 'pokemon_league', 237, 49);
  const canelaIsland = continent.archipelagoIslands?.find((i) => i.role === 'port_city') ?? continent.archipelagoIslands?.[0];
  const canelaCoords = findPoiCoords(
    (p) => p.id === 'island_port_main' || p.id.includes('canela') || p.id.includes('cinnabar'),
    canelaIsland ? canelaIsland.cx : 376,
    canelaIsland ? canelaIsland.cy : 376
  );
  const celadonCoords = findPoiCoords((p) => p.type === 'metropolis' || p.id.includes('celadon'), 191, 189);
  const pewterCoords = findPoiCoords((p) => p.id === 'pewter_city' || p.name.includes('Plateada'), 48, 239);
  const ceruleanCoords = findPoiCoords((p) => p.id === 'cerulean_water_city' || p.name.includes('Celeste'), 50, 190);
  const vermilionCoords = findPoiCoords((p) => p.id === 'vermilion_port_city' || p.name.includes('Carmín') || p.type === 'port_dock', 142, 190);
  const fuchsiaCoords = findPoiCoords((p) => p.id === 'fuchsia_garden_city' || p.name.includes('Fucsia'), 191, 143);
  const saffronCoords = findPoiCoords((p) => p.id === 'saffron_metro_cross' || p.name.includes('Azafrán'), 139, 140);
  const mtMoonCoords = findPoiCoords((p) => p.id.includes('mt_moon') || p.type === 'cave_entrance', 51, 54);
  const viridianForestCoords = findPoiCoords((p) => p.id === 'viridian_forest' || p.type === 'dungeon_forest', 57, 148);

  const crops = [
    {
      name: 'inspeccion_01_pueblo_paleta_jardines',
      x: paletaCoords.x,
      y: paletaCoords.y,
      sizeTiles: 26,
      desc: 'Pueblo Paleta: Casas residenciales, cercos de jardín con flores, laboratorio y carteles'
    },
    {
      name: 'inspeccion_02_meseta_anil_liga_pokemon',
      x: leagueCoords.x,
      y: leagueCoords.y,
      sizeTiles: 26,
      desc: 'Meseta Añil: Escalinatas masivas, elevación natural y edificio de la Liga Pokémon'
    },
    {
      name: 'inspeccion_03_isla_canela_archipielago',
      x: canelaCoords.x,
      y: canelaCoords.y,
      sizeTiles: 32,
      desc: 'Isla Canela: Asentamiento insular volcánico 360° en mar abierto con muelle portuario, casas y flora costera'
    },
    {
      name: 'inspeccion_04_ciudad_celadon_metropolis',
      x: celadonCoords.x,
      y: celadonCoords.y,
      sizeTiles: 30,
      desc: 'Ciudad Celadón: Gran metrópolis urbana con edificios, fuentes y plazas'
    },
    {
      name: 'inspeccion_05_garita_paso_aduana_ruta',
      x: 57,
      y: 302,
      sizeTiles: 26,
      desc: 'Garita de Paso: Aduana de control fronterizo con cercos laterales y camino transitable'
    },
    {
      name: 'spot_01_ciudad_plateada',
      x: pewterCoords.x,
      y: pewterCoords.y,
      sizeTiles: 26,
      desc: 'Ciudad Plateada: Museo Pokémon limpio, gimnasio con poste/buzón y plaza urbana'
    },
    {
      name: 'spot_02_ciudad_celeste',
      x: ceruleanCoords.x,
      y: ceruleanCoords.y,
      sizeTiles: 26,
      desc: 'Ciudad Celeste: Farola recolocada en acera sur despejando intersección peatonal'
    },
    {
      name: 'spot_03_ciudad_carmin_puerto',
      x: vermilionCoords.x,
      y: vermilionCoords.y,
      sizeTiles: 26,
      desc: 'Ciudad Carmín y Puerto: Muelle portuario con barco ferry, almacén y acceso peatonal'
    },
    {
      name: 'spot_04_ciudad_fucsia',
      x: fuchsiaCoords.x,
      y: fuchsiaCoords.y,
      sizeTiles: 26,
      desc: 'Ciudad Fucsia: Arquitectura y paleta de tejados única y diferenciada'
    },
    {
      name: 'spot_05_ciudad_azafran',
      x: saffronCoords.x,
      y: saffronCoords.y,
      sizeTiles: 26,
      desc: 'Ciudad Azafrán: Encrucijada metropolitana y distritos residenciales'
    },
    {
      name: 'spot_06_cueva_mt_moon',
      x: mtMoonCoords.x,
      y: mtMoonCoords.y,
      sizeTiles: 22,
      desc: 'Mt. Moon: Risco natural continuo sin escaleras huérfanas en laderas sin camino'
    },
    {
      name: 'spot_07_bosque_verde',
      x: viridianForestCoords.x,
      y: viridianForestCoords.y,
      sizeTiles: 22,
      desc: 'Bosque Verde: Laberinto arbolado interior transitable'
    },
    {
      name: 'spot_08_garita_1_ruta_paleta',
      x: 57,
      y: 302,
      sizeTiles: 24,
      desc: 'Garita de Paso 1: Frontera de control entre Paleta y Plateada'
    },
    {
      name: 'spot_09_garita_2_ruta_carmin',
      x: 88,
      y: 197,
      sizeTiles: 24,
      desc: 'Garita de Paso 2: Aduana entre Celeste y Carmín'
    },
    {
      name: 'spot_10_garita_3_ruta_fucsia',
      x: 173,
      y: 140,
      sizeTiles: 24,
      desc: 'Garita de Paso 3: Aduana en la ruta entre Fucsia y Azafrán'
    },
    {
      name: 'spot_11_pradera_hierba_alta_ruta_1',
      x: 61,
      y: 323,
      sizeTiles: 24,
      desc: 'Pradera de Hierba Alta (Ruta 1): Campos de encuentros Pokémon canónicos al norte de Pueblo Paleta'
    }
  ];

  // Add dynamic crops for all placed route gates
  const placedRouteGates = pois.filter((p) => p.type === 'route_gate');
  placedRouteGates.forEach((g, idx) => {
    const cx = g.gridX + Math.floor(g.footprint.width / 2);
    const cy = g.gridY + Math.floor(g.footprint.height / 2);
    crops.push({
      name: `garita_control_${idx + 1}_${g.id}`,
      x: cx,
      y: cy,
      sizeTiles: 22,
      desc: `Garita de Control ${idx + 1} (${g.id}) centrada en x=${cx}, y=${cy}`
    });
  });

  // Add dynamic crops for ledges
  result.ledges?.slice(0, 3).forEach((ledge, idx) => {
    const midIdx = Math.floor(ledge.cells.length / 2);
    const centerCell = ledge.cells[midIdx] ?? ledge.cells[0];
    if (centerCell) {
      crops.push({
        name: `desnivel_salto_1way_ledge_${idx + 1}`,
        x: centerCell.x,
        y: centerCell.y,
        sizeTiles: 20,
        desc: `Desnivel Salto 1-Way ${idx + 1}: Salto canónico de 3 piezas (${ledge.facing}) en x=${centerCell.x}, y=${centerCell.y}`
      });
    }
  });

  // Add dynamic crops for progression obstacles
  result.progressionObstacles?.slice(0, 3).forEach((obs, idx) => {
    crops.push({
      name: `obstaculo_mo_${obs.type}_${idx + 1}`,
      x: obs.x,
      y: obs.y,
      sizeTiles: 20,
      desc: `Obstáculo MO (${obs.type === 'cut_tree' ? 'Árbol Corte' : 'Roca Fuerza'}) centrado en x=${obs.x}, y=${obs.y} (Medalla ${obs.requiredGymBadge})`
    });
  });

  // Add dynamic crops for micro vignettes
  result.microVignettes?.slice(0, 3).forEach((vig, idx) => {
    const cx = vig.bounds.x + Math.floor(vig.bounds.w / 2);
    const cy = vig.bounds.y + Math.floor(vig.bounds.h / 2);
    crops.push({
      name: `micro_vineta_${vig.kind}_${idx + 1}`,
      x: cx,
      y: cy,
      sizeTiles: 22,
      desc: `Micro-Viñeta Ambiental (${vig.kind}) centrada en x=${cx}, y=${cy}`
    });
  });

  for (const crop of crops) {
    const half = Math.floor(crop.sizeTiles / 2);
    const leftTile = crop.x - half;
    const topTile = crop.y - half;

    const sizePx = crop.sizeTiles * TILE_SIZE;
    const left = Math.max(0, Math.min(canvasWidth - sizePx, leftTile * TILE_SIZE));
    const top = Math.max(0, Math.min(canvasHeight - sizePx, topTile * TILE_SIZE));

    const cropArtifact = path.join(ARTIFACT_DIR, `${crop.name}.png`);
    await sharp(canvasBuffer, {
      raw: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4
      }
    })
      .extract({ left: Math.round(left), top: Math.round(top), width: sizePx, height: sizePx })
      .png({ compressionLevel: 6 })
      .toFile(cropArtifact);

    console.log(`Recorte guardado: ${cropArtifact}`);
  }

  const tEnd = performance.now();
  console.log(`Generación completa finalizada en ${((tEnd - tStart) / 1000).toFixed(1)} segundos.`);
}

run().catch(console.error);
