import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Load houses.png
const { data, info } = await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
  .raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

function isSolid(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  return data[(y * W + x) * 4 + 3] > 20;
}

// Extract the primary contiguous block (isolating from above/below neighbors)
function extractPrimaryBlock(l, t, w, h) {
  // 1. Calculate row solid counts
  const rowCounts = [];
  for (let y = t; y < t + h; y++) {
    let solid = 0;
    for (let x = l; x < l + w; x++) {
      if (isSolid(x, y)) solid++;
    }
    rowCounts.push(solid);
  }

  // 2. Identify contiguous blocks of rows with solid pixels (separated by >= 2 blank rows)
  const blocks = [];
  let blockStart = -1;
  let blankCount = 0;

  for (let i = 0; i < rowCounts.length; i++) {
    if (rowCounts[i] > 0) {
      if (blockStart === -1) {
        blockStart = i;
      }
      blankCount = 0;
    } else {
      if (blockStart !== -1) {
        blankCount++;
        if (blankCount >= 2) {
          blocks.push({
            start: t + blockStart,
            end: t + (i - blankCount),
            height: (i - blankCount) - blockStart + 1
          });
          blockStart = -1;
          blankCount = 0;
        }
      }
    }
  }
  if (blockStart !== -1) {
    blocks.push({
      start: t + blockStart,
      end: t + (rowCounts.length - 1 - blankCount),
      height: (rowCounts.length - 1 - blankCount) - blockStart + 1
    });
  }

  if (blocks.length === 0) return null;

  // 3. Find the primary/largest block
  blocks.sort((a, b) => b.height - a.height);
  const bestBlock = blocks[0];

  // 4. Calculate tight horizontal bounds for the best block
  let minX = l + w, maxX = l;
  for (let y = bestBlock.start; y <= bestBlock.end; y++) {
    for (let x = l; x < l + w; x++) {
      if (isSolid(x, y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  return {
    l: minX,
    t: bestBlock.start,
    w: maxX - minX + 1,
    h: bestBlock.end - bestBlock.start + 1,
    totalBlocksFound: blocks.length
  };
}

const definitions = [
  // Row 1
  { id: 'pokemart', name: 'Tienda PokéMart (GBA)', win: [0, 0, 64, 80] },
  { id: 'house_green_small', name: 'Casa Tejado Verde Pequeña', win: [64, 0, 80, 80] },
  { id: 'house_gray_small', name: 'Casa Tejado Gris Pequeña', win: [144, 0, 80, 80] },
  { id: 'pokecenter', name: 'Centro Pokémon Oficial (P.C.)', win: [224, 0, 80, 90] },
  { id: 'lab_oak', name: 'Laboratorio de Investigación (Prof. Oak)', win: [304, 0, 112, 90] },

  // Row 2
  { id: 'house_orange_planters', name: 'Casa Tejado Naranja con Jardineras', win: [0, 70, 80, 80] },
  { id: 'house_purple_dormer', name: 'Casa Lavanda con Buhardilla', win: [64, 70, 80, 80] },
  { id: 'house_wood_brown', name: 'Casa / Almacén de Madera', win: [144, 70, 80, 80] },
  { id: 'house_twostory_yellow_1', name: 'Casa Dos Pisos Amarilla (1)', win: [224, 80, 64, 110] },
  { id: 'gym_gold', name: 'Gran Gimnasio Cúpula Dorada', win: [304, 80, 112, 100] },

  // Row 3
  { id: 'house_orange_gable', name: 'Casa Tejado Naranja Sencilla', win: [0, 140, 64, 80] },
  { id: 'house_red', name: 'Casa de Red (Pueblo Paleta)', win: [64, 140, 80, 80] },
  { id: 'house_green_bungalow', name: 'Bungalow Tejado Verde con Chimenea', win: [144, 140, 80, 80] },
  { id: 'house_twostory_red', name: 'Casa Dos Pisos Tejado Rojo', win: [224, 180, 64, 110] },
  { id: 'mansion_school', name: 'Escuela de Entrenadores / Gran Mansión', win: [304, 170, 112, 140] },

  // Row 4
  { id: 'house_twostory_mint', name: 'Casa Dos Pisos Verde Menta', win: [0, 200, 64, 100] },
  { id: 'house_purple_cottage', name: 'Cabaña Tejado Lavanda', win: [64, 220, 80, 80] },
  { id: 'house_blue', name: 'Casa de Blue (Pueblo Paleta)', win: [144, 200, 80, 80] },
  { id: 'house_green_flowerbeds', name: 'Casa Verde con Jardineras', win: [224, 270, 80, 90] },
  { id: 'safari_arena_capsule', name: 'Arena de Batalla / Cúpula Cápsula', win: [304, 300, 112, 100] },

  // Row 5
  { id: 'house_twostory_greenroof', name: 'Casa Dos Pisos Amarilla Tejado Verde', win: [0, 290, 64, 100] },
  { id: 'game_corner', name: 'Casino Rocket / Tienda de Premios', win: [64, 320, 112, 100] },
  { id: 'daycare_cottage', name: 'Guardería Pokémon Tejado Verde', win: [224, 360, 80, 90] },
  { id: 'gym', name: 'Gimnasio Pokémon Oficial (GYM)', win: [304, 360, 96, 90] },

  // Row 6
  { id: 'office_commercial_awning', name: 'Edificio Comercial con Toldo a Rayas', win: [0, 380, 64, 140] },
  { id: 'silph_tower', name: 'Sede Central Silph S.A. (Torre Corporativa)', win: [64, 420, 144, 170] },
  { id: 'house_twostory_urban', name: 'Casa Urbana Dos Pisos', win: [224, 470, 64, 110] },
  { id: 'daycare_long_ranch', name: 'Rancho / Guardería Alargada Tejado Cian', win: [288, 530, 112, 80] },

  // Row 7
  { id: 'house_teal_bungalow', name: 'Bungalow Tejado Cian', win: [224, 580, 80, 70] },
  { id: 'power_plant', name: 'Central de Energía de Kanto (4 Chimeneas)', win: [256, 530, 160, 120] },
  { id: 'pokemon_league', name: 'Palacio de la Liga Pokémon (Meseta Añil)', win: [0, 600, 256, 120] }
];

const outDir = 'scratch/map_lab/extracted_31_clean';
fs.mkdirSync(outDir, { recursive: true });

console.log('--- REFINING 31 BUILDINGS WITH DYNAMIC GAP SEGMENTATION ---');
const cleanCatalog = [];

for (const b of definitions) {
  const clean = extractPrimaryBlock(b.win[0], b.win[1], b.win[2], b.win[3]);
  if (!clean) {
    console.error(`ERROR on ${b.id}`);
    continue;
  }

  console.log(`[${b.id.padEnd(26)}] Isolated cleanly: ${clean.w}x${clean.h} at (${clean.l}, ${clean.t}) (Ignored ${clean.totalBlocksFound - 1} neighbor fragments)`);

  await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
    .extract({ left: clean.l, top: clean.t, width: clean.w, height: clean.h })
    .toFile(path.join(outDir, `${b.id}.png`));

  cleanCatalog.push({
    id: b.id,
    name: b.name,
    ...clean
  });
}

console.log(`\nAll ${cleanCatalog.length} buildings cleanly extracted with ZERO neighbor fragments!`);
