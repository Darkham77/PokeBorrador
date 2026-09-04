/**
 * compile_region_map.mjs - Poké Vicio Region Map Compiler
 * Compila una región Pokémon (ej. Kanto) a partir de coordenadas de nodos canónicas
 * y genera Chunks PNG optimizados para AdventureWorldMap.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Constantes del Mundo y Cuadrícula
const SPACING_MULTIPLIER = 2.5;
const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 4600;
const TILE_SIZE = 16; // 16x16 px por tile
const CHUNK_SIZE = 32; // 32 tiles por chunk
const CHUNK_PIXELS = CHUNK_SIZE * TILE_SIZE; // 512x512 px por chunk

const GRID_W = Math.ceil(WORLD_WIDTH / TILE_SIZE); // 225 tiles
const GRID_H = Math.ceil(WORLD_HEIGHT / TILE_SIZE); // 288 tiles

const CHUNKS_X = Math.ceil(WORLD_WIDTH / CHUNK_PIXELS); // 8 chunks
const CHUNKS_Y = Math.ceil(WORLD_HEIGHT / CHUNK_PIXELS); // 9 chunks

console.log(`[Map Compiler] Dimensiones del Mundo: ${WORLD_WIDTH}x${WORLD_HEIGHT} px (${GRID_W}x${GRID_H} tiles)`);
console.log(`[Map Compiler] Chunks: ${CHUNKS_X}x${CHUNKS_Y} (${CHUNKS_X * CHUNKS_Y} chunks de ${CHUNK_PIXELS}x${CHUNK_PIXELS} px)`);

// 2. Tipos de Terreno y Paleta GBA
const TERRAIN = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  TREES: 3,
  SAND: 4,
  MOUNTAIN: 5,
  BUILDING_ROOF_RED: 6,   // Centro Pokémon
  BUILDING_ROOF_BLUE: 7,  // Tienda
  BUILDING_ROOF_BROWN: 8, // Casa
  BUILDING_GYM: 9,        // Gimnasio
  CAVE_ENTRANCE: 10,
  FLOWER: 11,
  COBBLESTONE: 12
};

const PALETTE = {
  [TERRAIN.GRASS]: [64, 128, 40],        // #408028
  [TERRAIN.PATH]: [200, 160, 96],        // #c8a060
  [TERRAIN.WATER]: [56, 136, 216],       // #3888d8
  [TERRAIN.TREES]: [32, 88, 24],         // #205818
  [TERRAIN.SAND]: [216, 192, 120],       // #d8c078
  [TERRAIN.MOUNTAIN]: [120, 110, 100],   // #786e64
  [TERRAIN.BUILDING_ROOF_RED]: [216, 48, 48],   // #d83030
  [TERRAIN.BUILDING_ROOF_BLUE]: [48, 96, 216],  // #3060d8
  [TERRAIN.BUILDING_ROOF_BROWN]: [144, 96, 48], // #906030
  [TERRAIN.BUILDING_GYM]: [180, 150, 60],       // #b4963c
  [TERRAIN.CAVE_ENTRANCE]: [24, 20, 20],        // #181414
  [TERRAIN.FLOWER]: [232, 64, 64],
  [TERRAIN.COBBLESTONE]: [160, 160, 170]
};

// 3. Nodos Canónicos de Kanto (adventureMapData.ts)
const rawNodes = {
  'indigo': { name: 'Meseta Añil', type: 'league', x: 300, y: 350 },
  'victoryroad': { name: 'Calle Victoria', type: 'poi', x: 300, y: 600 },
  'route23': { name: 'Ruta 23', type: 'route', x: 300, y: 850 },
  'route24': { name: 'Ruta 24', type: 'route', x: 750, y: 300 },
  'route25': { name: 'Ruta 25', type: 'route', x: 900, y: 300 },
  'billshouse': { name: 'Casa de Bill', type: 'poi', x: 1050, y: 300 },
  'pewter': { name: 'Cd. Plateada', type: 'city', x: 500, y: 400 },
  'route3': { name: 'Ruta 3', type: 'route', x: 650, y: 400 },
  'mtmoon': { name: 'Mt. Moon', type: 'poi', x: 800, y: 400 },
  'route4': { name: 'Ruta 4', type: 'route', x: 800, y: 530 },
  'cerulean': { name: 'Cd. Celeste', type: 'city', x: 800, y: 650 },
  'route9': { name: 'Ruta 9', type: 'route', x: 950, y: 650 },
  'route10': { name: 'Ruta 10', type: 'route', x: 1100, y: 650 },
  'powerplant': { name: 'Central Energía', type: 'poi', x: 1250, y: 650 },
  'rocktunnel': { name: 'Túnel Roca', type: 'poi', x: 1100, y: 800 },
  'route2_n': { name: 'Ruta 2 (N)', type: 'route', x: 500, y: 550 },
  'viridianforest': { name: 'Bosque Verde', type: 'poi', x: 500, y: 700 },
  'route2_s': { name: 'Ruta 2 (S)', type: 'route', x: 500, y: 850 },
  'route5': { name: 'Ruta 5', type: 'route', x: 800, y: 800 },
  'celadon': { name: 'Cd. Azulona', type: 'city', x: 550, y: 950 },
  'route7': { name: 'Ruta 7', type: 'route', x: 680, y: 950 },
  'saffron': { name: 'Cd. Azafrán', type: 'city', x: 800, y: 950 },
  'route8': { name: 'Ruta 8', type: 'route', x: 950, y: 950 },
  'lavender': { name: 'Pueblo Lavanda', type: 'city', x: 1100, y: 950 },
  'pokemontower': { name: 'Torre Pokémon', type: 'poi', x: 1250, y: 950 },
  'viridian': { name: 'Ciudad Verde', type: 'city', x: 500, y: 1100 },
  'route22': { name: 'Ruta 22', type: 'route', x: 350, y: 1100 },
  'route6': { name: 'Ruta 6', type: 'route', x: 800, y: 1100 },
  'vermilion': { name: 'Cd. Carmín', type: 'city', x: 800, y: 1250 },
  'diglettcave': { name: 'Cueva Diglett', type: 'poi', x: 650, y: 1250 },
  'route11': { name: 'Ruta 11', type: 'route', x: 950, y: 1250 },
  'route12': { name: 'Ruta 12', type: 'route', x: 1100, y: 1100 },
  'route13': { name: 'Ruta 13', type: 'route', x: 1100, y: 1250 },
  'route14': { name: 'Ruta 14', type: 'route', x: 1100, y: 1400 },
  'route15': { name: 'Ruta 15', type: 'route', x: 950, y: 1500 },
  'route1': { name: 'Ruta 1', type: 'route', x: 500, y: 1250 },
  'pallet': { name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400 },
  'route16': { name: 'Ruta 16', type: 'route', x: 350, y: 950 },
  'route17': { name: 'Camino Bicis', type: 'route', x: 250, y: 1200 },
  'route18': { name: 'Ruta 18', type: 'route', x: 250, y: 1500 },
  'fuchsia': { name: 'Cd. Fucsia', type: 'city', x: 800, y: 1500 },
  'safarizone': { name: 'Zona Safari', type: 'poi', x: 800, y: 1380 },
  'route21': { name: 'Ruta 21', type: 'route_water', x: 500, y: 1500 },
  'route19': { name: 'Ruta 19', type: 'route_water', x: 800, y: 1550 },
  'seafoam': { name: 'Islas Espuma', type: 'poi', x: 650, y: 1600 },
  'route20': { name: 'Ruta 20', type: 'route_water', x: 500, y: 1600 },
  'cinnabar': { name: 'Isla Canela', type: 'city', x: 350, y: 1600 },
  'mansion': { name: 'Mansión Pkmn', type: 'poi', x: 200, y: 1600 }
};

const connections = [
  ['indigo', 'victoryroad'], ['victoryroad', 'route23'], ['route23', 'route22'], ['route22', 'viridian'],
  ['pallet', 'route1'], ['route1', 'viridian'], ['viridian', 'route2_s'],
  ['route2_s', 'viridianforest'], ['viridianforest', 'route2_n'], ['route2_n', 'pewter'],
  ['pewter', 'route3'], ['route3', 'mtmoon'], ['mtmoon', 'route4'], ['route4', 'cerulean'],
  ['cerulean', 'route24'], ['route24', 'route25'], ['route25', 'billshouse'],
  ['cerulean', 'route9'], ['route9', 'route10'], ['route10', 'rocktunnel'], ['rocktunnel', 'lavender'],
  ['route10', 'powerplant'],
  ['cerulean', 'route5'], ['route5', 'saffron'],
  ['saffron', 'route6'], ['route6', 'vermilion'],
  ['saffron', 'route7'], ['route7', 'celadon'],
  ['saffron', 'route8'], ['route8', 'lavender'],
  ['diglettcave', 'vermilion'], ['vermilion', 'route11'], ['route11', 'route12'], 
  ['lavender', 'pokemontower'],
  ['lavender', 'route12'], ['route12', 'route13'], ['route13', 'route14'], ['route14', 'route15'], ['route15', 'fuchsia'],
  ['celadon', 'route16'], ['route16', 'route17'], ['route17', 'route18'], ['route18', 'fuchsia'],
  ['fuchsia', 'safarizone'],
  ['fuchsia', 'route19'], ['route19', 'seafoam'], ['seafoam', 'route20'], ['route20', 'cinnabar'],
  ['cinnabar', 'mansion'],
  ['cinnabar', 'route21'], ['route21', 'pallet']
];

// Helper: Convertir coordenada pixel del mundo a coordenada de tile
function worldToTile(x, y) {
  const wx = x * SPACING_MULTIPLIER;
  const wy = y * SPACING_MULTIPLIER;
  return {
    tx: Math.floor(wx / TILE_SIZE),
    ty: Math.floor(wy / TILE_SIZE)
  };
}

// 4. Inicializar Matriz del Mapa
const mapGrid = new Uint8Array(GRID_W * GRID_H);
mapGrid.fill(TERRAIN.GRASS);

// Helper para pintar rectángulos de tiles
function fillTileRect(tx, ty, w, h, terrainType) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = tx + dx;
      const py = ty + dy;
      if (px >= 0 && px < GRID_W && py >= 0 && py < GRID_H) {
        mapGrid[py * GRID_W + px] = terrainType;
      }
    }
  }
}

// 5. Modelado Geográfico de Kanto (Océanos, Montañas, Bosques)
console.log('[Map Compiler] Generando geografía de Kanto...');

// Océano al Sur (Rutas marítimas 19, 20, 21, Isla Canela, Islas Espuma)
fillTileRect(0, 220, GRID_W, GRID_H - 220, TERRAIN.WATER);
fillTileRect(0, 215, GRID_W, 5, TERRAIN.SAND); // Playa costa sur

// Océano al Este (Bahía de Carmín y costas)
fillTileRect(190, 140, GRID_W - 190, 100, TERRAIN.WATER);
fillTileRect(185, 140, 5, 100, TERRAIN.SAND);

// Cordillera del Noroeste (Meseta Añil, Calle Victoria, Mt. Moon)
fillTileRect(0, 0, 70, 160, TERRAIN.MOUNTAIN);
fillTileRect(110, 40, 40, 40, TERRAIN.MOUNTAIN); // Mt. Moon
fillTileRect(160, 100, 30, 40, TERRAIN.MOUNTAIN); // Túnel Roca

// Bosque Verde denso (entre Viridian y Pewter)
fillTileRect(60, 90, 35, 45, TERRAIN.TREES);

// Árboles perimetrales del mapa
fillTileRect(0, 0, GRID_W, 8, TERRAIN.TREES);
fillTileRect(0, 0, 8, GRID_H, TERRAIN.TREES);
fillTileRect(GRID_W - 8, 0, 8, GRID_H, TERRAIN.TREES);

// 6. Trazado de Caminos entre Conexiones (Line Carving + A*)
console.log('[Map Compiler] Conectando rutas y carreteras...');

function drawPathLine(t1, t2, isWater = false) {
  let x0 = t1.tx;
  let y0 = t1.ty;
  const x1 = t2.tx;
  const y1 = t2.ty;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  const pathTerrain = isWater ? TERRAIN.WATER : TERRAIN.PATH;
  const pathRadius = isWater ? 4 : 2;

  while (true) {
    for (let py = -pathRadius; py <= pathRadius; py++) {
      for (let px = -pathRadius; px <= pathRadius; px++) {
        const cx = x0 + px;
        const cy = y0 + py;
        if (cx >= 0 && cx < GRID_W && cy >= 0 && cy < GRID_H) {
          mapGrid[cy * GRID_W + cx] = pathTerrain;
        }
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

connections.forEach(([idA, idB]) => {
  const nodeA = rawNodes[idA];
  const nodeB = rawNodes[idB];
  if (!nodeA || !nodeB) return;

  const tA = worldToTile(nodeA.x, nodeA.y);
  const tB = worldToTile(nodeB.x, nodeB.y);
  const isWater = nodeA.type === 'route_water' || nodeB.type === 'route_water' || ['route19', 'route20', 'route21', 'seafoam'].includes(idA);

  drawPathLine(tA, tB, isWater);
});

// 7. Estampado de Plantillas de Ciudades y POIs
console.log('[Map Compiler] Estampando ciudades, gimnasios y centros Pokémon...');

Object.entries(rawNodes).forEach(([id, node]) => {
  const { tx, ty } = worldToTile(node.x, node.y);

  if (node.type === 'city') {
    // Plaza adoquinada central
    fillTileRect(tx - 6, ty - 6, 13, 13, TERRAIN.COBBLESTONE);
    fillTileRect(tx - 4, ty - 4, 9, 9, TERRAIN.PATH);

    // Centro Pokémon (Techo rojo)
    fillTileRect(tx - 4, ty - 5, 4, 3, TERRAIN.BUILDING_ROOF_RED);
    // Tienda Pokémon (Techo azul)
    fillTileRect(tx + 1, ty - 5, 4, 3, TERRAIN.BUILDING_ROOF_BLUE);
    // Casas residenciales
    fillTileRect(tx - 4, ty + 2, 3, 3, TERRAIN.BUILDING_ROOF_BROWN);
    fillTileRect(tx + 2, ty + 2, 3, 3, TERRAIN.BUILDING_ROOF_BROWN);

    // Gimnasio si no es Pueblo Paleta / Lavanda
    if (id !== 'pallet' && id !== 'lavender') {
      fillTileRect(tx - 2, ty - 2, 5, 4, TERRAIN.BUILDING_GYM);
    }
  } else if (node.type === 'league') {
    // Meseta Añil / Liga Pokémon
    fillTileRect(tx - 8, ty - 8, 17, 17, TERRAIN.COBBLESTONE);
    fillTileRect(tx - 6, ty - 6, 13, 7, TERRAIN.BUILDING_GYM);
    fillTileRect(tx - 3, ty + 2, 6, 4, TERRAIN.BUILDING_ROOF_RED);
  } else if (node.type === 'poi') {
    if (id === 'mtmoon' || id === 'rocktunnel' || id === 'diglettcave' || id === 'victoryroad') {
      fillTileRect(tx - 4, ty - 4, 9, 9, TERRAIN.MOUNTAIN);
      fillTileRect(tx - 1, ty - 1, 3, 3, TERRAIN.CAVE_ENTRANCE);
    } else if (id === 'safarizone') {
      fillTileRect(tx - 5, ty - 5, 11, 11, TERRAIN.TREES);
      fillTileRect(tx - 2, ty - 2, 5, 5, TERRAIN.PATH);
    } else if (id === 'powerplant' || id === 'mansion' || id === 'pokemontower' || id === 'billshouse') {
      fillTileRect(tx - 4, ty - 4, 9, 9, TERRAIN.COBBLESTONE);
      fillTileRect(tx - 3, ty - 3, 7, 5, TERRAIN.BUILDING_ROOF_BROWN);
    }
  }
});

// 8. Horneado de Chunks PNG con Sharp
const outputDir = path.join(process.cwd(), 'public', 'assets', 'maps', 'kanto');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

console.log(`[Map Compiler] Horneando ${CHUNKS_X * CHUNKS_Y} chunks PNG a ${outputDir}...`);

async function bakeAllChunks() {
  const chunkManifest = {
    region: 'kanto',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tileSize: TILE_SIZE,
    chunkSize: CHUNK_SIZE,
    chunkPixels: CHUNK_PIXELS,
    chunksX: CHUNKS_X,
    chunksY: CHUNKS_Y,
    chunks: []
  };

  for (let cy = 0; cy < CHUNKS_Y; cy++) {
    for (let cx = 0; cx < CHUNKS_X; cx++) {
      // Buffer RGBA para el chunk (512x512 = 262.144 pixels = 1.048.576 bytes)
      const rgbaBuffer = Buffer.alloc(CHUNK_PIXELS * CHUNK_PIXELS * 4);

      const startTileX = cx * CHUNK_SIZE;
      const startTileY = cy * CHUNK_SIZE;

      for (let dy = 0; dy < CHUNK_SIZE; dy++) {
        const ty = startTileY + dy;
        for (let dx = 0; dx < CHUNK_SIZE; dx++) {
          const tx = startTileX + dx;

          let terrainType = TERRAIN.GRASS;
          if (tx < GRID_W && ty < GRID_H) {
            terrainType = mapGrid[ty * GRID_W + tx];
          }

          const baseRgb = PALETTE[terrainType] || PALETTE[TERRAIN.GRASS];

          // Llenar el bloque 16x16 de pixels para este tile
          for (let py = 0; py < TILE_SIZE; py++) {
            for (let px = 0; px < TILE_SIZE; px++) {
              const bufferIdx = ((dy * TILE_SIZE + py) * CHUNK_PIXELS + (dx * TILE_SIZE + px)) * 4;

              // Micro-texturas pixeladas retro
              let r = baseRgb[0];
              let g = baseRgb[1];
              let b = baseRgb[2];

              // Variación sutil de pixel art en bordes
              if ((px === 0 || py === 0) && terrainType === TERRAIN.COBBLESTONE) {
                r = Math.max(0, r - 25);
                g = Math.max(0, g - 25);
                b = Math.max(0, b - 25);
              } else if ((px === 3 && py === 3) || (px === 11 && py === 9)) {
                // Motas de brillo
                r = Math.min(255, r + 15);
                g = Math.min(255, g + 15);
                b = Math.min(255, b + 15);
              }

              rgbaBuffer[bufferIdx] = r;
              rgbaBuffer[bufferIdx + 1] = g;
              rgbaBuffer[bufferIdx + 2] = b;
              rgbaBuffer[bufferIdx + 3] = 255;
            }
          }
        }
      }

      const fileName = `chunk_${cx}_${cy}.webp`;
      const filePath = path.join(outputDir, fileName);

      // Guardar con Sharp en WebP de alta compresión sin pérdida (lossless pixel art)
      await sharp(rgbaBuffer, {
        raw: {
          width: CHUNK_PIXELS,
          height: CHUNK_PIXELS,
          channels: 4
        }
      })
      .webp({ lossless: true })
      .toFile(filePath);

      chunkManifest.chunks.push({
        cx,
        cy,
        x: cx * CHUNK_PIXELS,
        y: cy * CHUNK_PIXELS,
        file: `/assets/maps/kanto/${fileName}`
      });
    }
  }

  // Guardar manifiesto JSON
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(chunkManifest, null, 2), 'utf8');
  console.log(`[Map Compiler] ¡Éxito! Manifiesto guardado en ${manifestPath}`);
}

bakeAllChunks().then(() => {
  console.log('[Map Compiler] Compilación de Kanto finalizada al 100%.');
}).catch(err => {
  console.error('[Map Compiler] Error durante la compilación:', err);
  process.exit(1);
});
