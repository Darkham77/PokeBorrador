import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateFireredCliffs } from './generate_firered_cliffs.mjs';

// Standard Directories
const DIRS = {
  raw: path.resolve('scratch/map_lab/tilesets/raw'),
  pokegba: path.resolve('scratch/map_lab/tilesets/pokegba'),
  clean: path.resolve('scratch/map_lab/tilesets/pokegba/clean'),
  lpc: path.resolve('scratch/map_lab/tilesets/lpc'),
  catalogJson: path.resolve('scratch/map_lab/tile_catalog.json'),
  catalogJs: path.resolve('scratch/map_lab/tile_catalog.js'),
  manifest: path.resolve('scratch/map_lab/.asset_manifest.json')
};

function ensureDirs() {
  for (const d of [DIRS.raw, DIRS.pokegba, DIRS.clean, DIRS.lpc]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buf).digest('hex');
}

/**
 * Saves a PNG buffer to both clean/ and lpc/ directories
 */
async function saveAsset(buffer, filename, rawInfo = null) {
  const cleanPath = path.join(DIRS.clean, filename);
  const lpcFilename = filename.startsWith('poke_') ? filename : 'poke_' + filename;
  const lpcPath = path.join(DIRS.lpc, lpcFilename);

  if (rawInfo) {
    const pngBuf = await sharp(buffer, { raw: rawInfo }).png().toBuffer();
    await sharp(pngBuf).toFile(cleanPath);
    await sharp(pngBuf).toFile(lpcPath);
  } else {
    await sharp(buffer).toFile(cleanPath);
    await sharp(buffer).toFile(lpcPath);
  }
}

/**
 * Extracts a rectangular subregion, optionally applying chroma-key transparency
 */
async function extractRegion(src, left, top, width, height, keyColor = null) {
  if (!keyColor) {
    return await sharp(src)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();
  }

  const { data, info } = await sharp(src)
    .extract({ left, top, width, height })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(width * height * 4);
  const channels = info.channels;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    const isKey = (Math.abs(r - keyColor.r) <= keyColor.tol &&
                   Math.abs(g - keyColor.g) <= keyColor.tol &&
                   Math.abs(b - keyColor.b) <= keyColor.tol);

    if (isKey) {
      out[i * 4] = 0;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 0;
      out[i * 4 + 3] = 0;
    } else {
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = channels === 4 ? data[i * channels + 3] : 255;
    }
  }

  return await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Slices the authentic Pokemon GBA FireRed hills.png into 8 structural cliff tiles
 */
async function processHillsSheet(hillsPath) {
  console.log('⛰️  Processing canonical GBA hills.png cliff sheets...');
  const { data, info } = await sharp(hillsPath).raw().toBuffer({ resolveWithObject: true });
  const key = { r: 112, g: 200, b: 160, tol: 15 };
  const W = info.width, H = info.height;
  const transparentHills = Buffer.alloc(W * H * 4);

  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const isKey = Math.abs(r - key.r) <= key.tol &&
                  Math.abs(g - key.g) <= key.tol &&
                  Math.abs(b - key.b) <= key.tol;
    if (isKey) {
      transparentHills[i * 4 + 3] = 0;
    } else {
      transparentHills[i * 4] = r;
      transparentHills[i * 4 + 1] = g;
      transparentHills[i * 4 + 2] = b;
      transparentHills[i * 4 + 3] = 255;
    }
  }

  function get16x16(c, r) {
    const buf = Buffer.alloc(16 * 16 * 4);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const srcIdx = ((r * 16 + y) * W + (c * 16 + x)) * 4;
        const dstIdx = (y * 16 + x) * 4;
        for (let k = 0; k < 4; k++) buf[dstIdx + k] = transparentHills[srcIdx + k];
      }
    }
    return buf;
  }

  function assemble(grid, width, height) {
    const res = Buffer.alloc(width * height * 4);
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const tileBuf = grid[row][col];
        for (let ty = 0; ty < 16; ty++) {
          for (let tx = 0; tx < 16; tx++) {
            const srcIdx = (ty * 16 + tx) * 4;
            const dstIdx = (((row * 16 + ty) * width) + (col * 16 + tx)) * 4;
            for (let k = 0; k < 4; k++) res[dstIdx + k] = tileBuf[srcIdx + k];
          }
        }
      }
    }
    return res;
  }

  // 1. Extract authentic 32x48 and 32x32 GBA Mountain Cone Hills
  for (const [color, o] of [['brown', 0], ['gray', 5]]) {
    // 32x48 Cone Hill (rows 1, 2, 3 of columns 1 and 2)
    const coneBuf = assemble([
      [get16x16(o + 1, 1), get16x16(o + 2, 1)],
      [get16x16(o + 1, 2), get16x16(o + 2, 2)],
      [get16x16(o + 1, 3), get16x16(o + 2, 3)]
    ], 32, 48);
    await saveAsset(coneBuf, `poke_cliff_cone_${color}.png`, { width: 32, height: 48, channels: 4 });

    // 32x32 Small Cone Peak (rows 1 and 2)
    const smallConeBuf = assemble([
      [get16x16(o + 1, 1), get16x16(o + 2, 1)],
      [get16x16(o + 1, 2), get16x16(o + 2, 2)]
    ], 32, 32);
    await saveAsset(smallConeBuf, `poke_cliff_cone_small_${color}.png`, { width: 32, height: 32, channels: 4 });

    // 32x32 Flat Rock Plateau Surface (row 0)
    const topBuf = assemble([
      [get16x16(o + 0, 0), get16x16(o + 3, 2)],
      [get16x16(o + 3, 3), get16x16(o + 0, 0)]
    ], 32, 32);
    await saveAsset(topBuf, `poke_cliff_${color}_top.png`, { width: 32, height: 32, channels: 4 });
  }

  // 2. Extract Authentic GBA Ledge Jump (32x16)
  // Combine the two 16x16 ledge pieces from hills.png (col 3, row 1 and row 3) into a 32x16 ledge
  const ledgePart1 = get16x16(3, 1);
  const ledgePart2 = get16x16(3, 3);
  const ledgeBuf = assemble([
    [ledgePart1, ledgePart2]
  ], 32, 16);
  await saveAsset(ledgeBuf, 'poke_ledge_jump.png', { width: 32, height: 16, channels: 4 });

  // 3. Extract Authentic GBA Mountain Ground (32x32) from hills.png
  const groundBrown = assemble([
    [get16x16(0, 0), get16x16(0, 0)],
    [get16x16(0, 0), get16x16(0, 0)]
  ], 32, 32);
  await saveAsset(groundBrown, 'poke_mountain_dirt.png', { width: 32, height: 32, channels: 4 });

  const groundGray = assemble([
    [get16x16(5, 0), get16x16(5, 0)],
    [get16x16(5, 0), get16x16(5, 0)]
  ], 32, 32);
  await saveAsset(groundGray, 'poke_mountain_dirt_gray.png', { width: 32, height: 32, channels: 4 });

  // 4. Generate Authentic Pokemon FireRed Cliff Pieces and Corners
  await generateFireredCliffs();

  console.log('✅ All canonical GBA cliff pieces and cone mountains generated and synchronized!');
}

/**
 * Main Asset Ingestion and Synchronization Engine
 */
export async function syncAssets(force = false) {
  ensureDirs();

  const manifest = fs.existsSync(DIRS.manifest)
    ? JSON.parse(fs.readFileSync(DIRS.manifest, 'utf-8'))
    : {};

  // Check all source files
  const sources = [
    'decoration.png', 'houses.png', 'nature.png',
    'fences.png', 'pokemon.png', 'road.png', 'hills.png'
  ];

  let needsUpdate = force;
  const currentHashes = {};

  for (const s of sources) {
    const p = path.join(DIRS.pokegba, s);
    const h = hashFile(p);
    currentHashes[s] = h;
    if (manifest[s] !== h) {
      needsUpdate = true;
    }
  }

  if (!needsUpdate) {
    console.log('✨ All map assets are up to date with catalog. Skipping extraction.');
    return;
  }

  console.log('======================================================================');
  console.log('📦 POKÉ VICIO: UNIFIED AUTOMATED ASSET INGESTION & PIPELINE');
  console.log('======================================================================');

  const natureKey = { r: 112, g: 200, b: 160, tol: 15 };

  // 1. DECORATION.PNG
  const decoSrc = path.join(DIRS.pokegba, 'decoration.png');
  if (fs.existsSync(decoSrc)) {
    console.log('🏮 Processing decoration.png...');
    // Single street lamp (16x48) - Facing right
    const lampRight = await extractRegion(decoSrc, 48, 0, 16, 48);
    await saveAsset(lampRight, 'poke_street_lamp.png');
    await saveAsset(lampRight, 'street_lamp.png');

    // Single street lamp (16x48) - Facing left
    const lampLeft = await extractRegion(decoSrc, 64, 0, 16, 48);
    await saveAsset(lampLeft, 'poke_street_lamp_left.png');

    // Mailbox (16x16)
    const mailbox = await extractRegion(decoSrc, 112, 48, 16, 16);
    await saveAsset(mailbox, 'poke_mailbox.png');

    // Rock boulder (16x16)
    const boulder = await extractRegion(decoSrc, 96, 32, 16, 16);
    await saveAsset(boulder, 'poke_rock_boulder.png');
    await saveAsset(boulder, 'rock_boulder.png');

    // Rock rubble (16x16)
    const rubble = await extractRegion(decoSrc, 96, 16, 16, 16);
    await saveAsset(rubble, 'poke_rock_rubble.png');
    await saveAsset(rubble, 'rock_rubble.png');

    // S.S. Anne Truck (48x32)
    const truck = await extractRegion(decoSrc, 112, 0, 48, 32);
    await saveAsset(truck, 'poke_ss_anne_truck.png');

    // Rocket Balloon (48x64)
    const balloon = await extractRegion(decoSrc, 0, 0, 48, 64);
    await saveAsset(balloon, 'poke_rocket_balloon.png');
  }

  // 2. NATURE.PNG
  const natureSrc = path.join(DIRS.pokegba, 'nature.png');
  if (fs.existsSync(natureSrc)) {
    console.log('🌲 Processing nature.png...');
    const tree = await extractRegion(natureSrc, 16, 80, 32, 48, natureKey);
    await saveAsset(tree, 'poke_tree_poke.png');
    await saveAsset(tree, 'tree_poke.png');

    const pineSmall = await extractRegion(natureSrc, 32, 0, 16, 32, natureKey);
    await saveAsset(pineSmall, 'poke_tree_pine_small.png');

    const cuttable = await extractRegion(natureSrc, 16, 32, 16, 16, natureKey);
    await saveAsset(cuttable, 'poke_tree_cuttable.png');

    const flowers = await extractRegion(natureSrc, 16, 16, 16, 16, natureKey);
    await saveAsset(flowers, 'poke_flowers_red.png');

    const bush = await extractRegion(natureSrc, 16, 48, 16, 16, natureKey);
    await saveAsset(bush, 'poke_bush_round.png');

    const berry = await extractRegion(natureSrc, 16, 64, 16, 16, natureKey);
    await saveAsset(berry, 'poke_berry_bush.png');
  }

  // 3. FENCES.PNG
  const fenceSrc = path.join(DIRS.pokegba, 'fences.png');
  if (fs.existsSync(fenceSrc)) {
    console.log('🪵 Processing fences.png...');
    const picket = await extractRegion(fenceSrc, 0, 0, 48, 16);
    await saveAsset(picket, 'poke_fence_picket.png');

    const woodH = await extractRegion(fenceSrc, 0, 48, 48, 16);
    await saveAsset(woodH, 'poke_fence_wood_h.png');

    const metalGate = await extractRegion(fenceSrc, 0, 96, 48, 48);
    await saveAsset(metalGate, 'poke_fence_metal_gate.png');
  }

  // 4. POKEMON.PNG
  const pokeSrc = path.join(DIRS.pokegba, 'pokemon.png');
  if (fs.existsSync(pokeSrc)) {
    console.log('🐾 Processing pokemon.png...');
    const snorlax = await extractRegion(pokeSrc, 64, 0, 32, 32);
    await saveAsset(snorlax, 'poke_snorlax.png');

    const lapras = await extractRegion(pokeSrc, 16, 0, 16, 32);
    await saveAsset(lapras, 'poke_lapras.png');

    const diglett = await extractRegion(pokeSrc, 0, 0, 16, 16, natureKey);
    await saveAsset(diglett, 'poke_diglett.png');
  }

  // 5. ROAD.PNG
  const roadSrc = path.join(DIRS.pokegba, 'road.png');
  if (fs.existsSync(roadSrc)) {
    console.log('🛣️  Processing road.png...');
    const planks = await extractRegion(roadSrc, 0, 0, 32, 32);
    await saveAsset(planks, 'poke_boardwalk_planks.png');

    const cyclingRoad = await extractRegion(roadSrc, 32, 0, 32, 32);
    await saveAsset(cyclingRoad, 'poke_cycling_road.png');

    const railing = await extractRegion(roadSrc, 64, 0, 32, 32);
    await saveAsset(railing, 'poke_cycling_railing.png');
  }

  // 6. HOUSES.PNG
  const housesSrc = path.join(DIRS.pokegba, 'houses.png');
  if (fs.existsSync(housesSrc)) {
    console.log('🏛️  Processing houses.png...');
    await saveAsset(await extractRegion(housesSrc, 224, 2, 80, 78), 'pokecenter.png');
    await saveAsset(await extractRegion(housesSrc, 0, 2, 64, 70), 'pokemart.png');
    await saveAsset(await extractRegion(housesSrc, 304, 2, 112, 78), 'lab_oak.png');
    await saveAsset(await extractRegion(housesSrc, 64, 144, 80, 56), 'house_red.png');
    await saveAsset(await extractRegion(housesSrc, 144, 208, 80, 56), 'house_blue.png');
    await saveAsset(await extractRegion(housesSrc, 64, 0, 80, 54), 'house_green.png');
    await saveAsset(await extractRegion(housesSrc, 0, 144, 64, 56), 'house_orange.png');
    await saveAsset(await extractRegion(housesSrc, 64, 72, 80, 56), 'house_purple.png');
    await saveAsset(await extractRegion(housesSrc, 304, 368, 96, 80), 'gym.png');
    await saveAsset(await extractRegion(housesSrc, 304, 88, 112, 90), 'gym_gold.png');
    await saveAsset(await extractRegion(housesSrc, 64, 432, 144, 160), 'silph_tower.png');
    await saveAsset(await extractRegion(housesSrc, 256, 544, 160, 104), 'power_plant.png');
    await saveAsset(await extractRegion(housesSrc, 0, 616, 256, 104), 'pokemon_league.png');
    await saveAsset(await extractRegion(housesSrc, 64, 336, 112, 80), 'game_corner.png');
  }

  // 7. HILLS.PNG (Canonical GBA Cliffs)
  const hillsSrc = path.join(DIRS.pokegba, 'hills.png');
  if (fs.existsSync(hillsSrc)) {
    await processHillsSheet(hillsSrc);
  }

  // 8. UPDATE CATALOG REGISTRY
  updateCatalog();

  // 9. SAVE MANIFEST
  fs.writeFileSync(DIRS.manifest, JSON.stringify(currentHashes, null, 2), 'utf-8');
  console.log('✨ All assets ingested, extracted, and synchronized successfully!\n');
}

/**
 * Updates tile_catalog.json and tile_catalog.js with complete semantic definitions
 */
function updateCatalog() {
  console.log('📝 Updating tile_catalog.json & tile_catalog.js...');
  const catalog = fs.existsSync(DIRS.catalogJson)
    ? JSON.parse(fs.readFileSync(DIRS.catalogJson, 'utf-8'))
    : { version: '5.0', prefabs: { buildings: {}, props: {}, trees: {}, nature: {}, cliffs: {} } };

  if (!catalog.prefabs) catalog.prefabs = {};
  if (!catalog.prefabs.props) catalog.prefabs.props = {};
  if (!catalog.prefabs.cliffs) catalog.prefabs.cliffs = {};
  if (!catalog.prefabs.nature) catalog.prefabs.nature = {};
  if (!catalog.prefabs.buildings) catalog.prefabs.buildings = {};

  // Register Props
  catalog.prefabs.props['street_lamp'] = {
    id: 'street_lamp',
    name: 'Farola Urbana Pokémon (Poste Individual Rojo)',
    width: 16,
    height: 48,
    parts: [{ sheet: 'poke_street_lamp.png', sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 3 }]
  };

  catalog.prefabs.props['street_lamp_left'] = {
    id: 'street_lamp_left',
    name: 'Farola Urbana Pokémon (Poste Individual Izquierda)',
    width: 16,
    height: 48,
    parts: [{ sheet: 'poke_street_lamp_left.png', sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 3 }]
  };

  catalog.prefabs.props['mailbox'] = {
    id: 'mailbox',
    name: 'Buzón Residencial',
    width: 16,
    height: 16,
    parts: [{ sheet: 'poke_mailbox.png', sx: 0, sy: 0, sw: 16, sh: 16, dx: 0, dy: 0, zIndex: 2 }]
  };

  catalog.prefabs.props['rock_boulder'] = {
    id: 'rock_boulder',
    name: 'Roca / Peñasco de Fuerza',
    width: 16,
    height: 16,
    parts: [{ sheet: 'poke_rock_boulder.png', sx: 0, sy: 0, sw: 16, sh: 16, dx: 0, dy: 0, zIndex: 2 }]
  };

  catalog.prefabs.props['cycling_railing'] = {
    id: 'cycling_railing',
    name: 'Barandilla Metálica de Viaducto',
    width: 32,
    height: 32,
    parts: [{ sheet: 'poke_cycling_railing.png', sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 3 }]
  };

  catalog.prefabs.props['cycling_road'] = {
    id: 'cycling_road',
    name: 'Asfalto / Calzada de Camino de Bicis',
    width: 32,
    height: 32,
    parts: [{ sheet: 'poke_cycling_road.png', sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 1 }]
  };

  catalog.prefabs.props['boardwalk_planks'] = {
    id: 'boardwalk_planks',
    name: 'Tablones de Pasarela Marítima',
    width: 32,
    height: 32,
    parts: [{ sheet: 'poke_boardwalk_planks.png', sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 1 }]
  };

  // Register Cliffs (Brown and Gray)
  for (const color of ['brown', 'gray']) {
    const isGray = color === 'gray';
    const cName = isGray ? 'Gris (Calle Victoria)' : 'Marrón (Mt. Moon)';

    catalog.prefabs.cliffs[`cliff_${color}_face`] = {
      id: `cliff_${color}_face`,
      name: `Acantilado Frontal ${cName}`,
      width: 32,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_face.png`, sx: 0, sy: 0, sw: 32, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_left`] = {
      id: `cliff_${color}_left`,
      name: `Acantilado Lateral Izquierdo ${cName}`,
      width: 16,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_left.png`, sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_right`] = {
      id: `cliff_${color}_right`,
      name: `Acantilado Lateral Derecho ${cName}`,
      width: 16,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_right.png`, sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_vleft`] = {
      id: `cliff_${color}_vleft`,
      name: `Acantilado Pared Lateral Izquierda ${cName}`,
      width: 16,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_vleft.png`, sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_vright`] = {
      id: `cliff_${color}_vright`,
      name: `Acantilado Pared Lateral Derecha ${cName}`,
      width: 16,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_vright.png`, sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_corner_tl`] = {
      id: `cliff_${color}_corner_tl`,
      name: `Acantilado Esquina Sup-Izq ${cName}`,
      width: 16,
      height: 32,
      parts: [{ sheet: `poke_cliff_${color}_corner_tl.png`, sx: 0, sy: 0, sw: 16, sh: 32, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_corner_tr`] = {
      id: `cliff_${color}_corner_tr`,
      name: `Acantilado Esquina Sup-Der ${cName}`,
      width: 16,
      height: 32,
      parts: [{ sheet: `poke_cliff_${color}_corner_tr.png`, sx: 0, sy: 0, sw: 16, sh: 32, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_corner_bl`] = {
      id: `cliff_${color}_corner_bl`,
      name: `Acantilado Esquina Inf-Izq ${cName}`,
      width: 16,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_corner_bl.png`, sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_corner_br`] = {
      id: `cliff_${color}_corner_br`,
      name: `Acantilado Esquina Inf-Der ${cName}`,
      width: 16,
      height: 48,
      parts: [{ sheet: `poke_cliff_${color}_corner_br.png`, sx: 0, sy: 0, sw: 16, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_top`] = {
      id: `cliff_${color}_top`,
      name: `Superficie Rocosa Meseta ${cName}`,
      width: 32,
      height: 32,
      parts: [{ sheet: `poke_cliff_${color}_top.png`, sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 0 }]
    };

    catalog.prefabs.cliffs[`cliff_${color}_peak`] = {
      id: `cliff_${color}_peak`,
      name: `Pico Cumbre ${cName}`,
      width: 32,
      height: 32,
      parts: [{ sheet: `poke_cliff_${color}_peak.png`, sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 1 }]
    };

    // Authentic GBA Cone Mountain Hills
    catalog.prefabs.nature[`mountain_cone_${color}`] = {
      id: `mountain_cone_${color}`,
      name: `Cerro Montañoso Cónico ${cName}`,
      width: 32,
      height: 48,
      parts: [{ sheet: `poke_cliff_cone_${color}.png`, sx: 0, sy: 0, sw: 32, sh: 48, dx: 0, dy: 0, zIndex: 1 }]
    };
    catalog.prefabs.cliffs[`mountain_cone_${color}`] = catalog.prefabs.nature[`mountain_cone_${color}`];

    catalog.prefabs.nature[`mountain_cone_small_${color}`] = {
      id: `mountain_cone_small_${color}`,
      name: `Cerro Cónico Pequeño ${cName}`,
      width: 32,
      height: 32,
      parts: [{ sheet: `poke_cliff_cone_small_${color}.png`, sx: 0, sy: 0, sw: 32, sh: 32, dx: 0, dy: 0, zIndex: 1 }]
    };
    catalog.prefabs.cliffs[`mountain_cone_small_${color}`] = catalog.prefabs.nature[`mountain_cone_small_${color}`];
  }

  // Register Ledge
  catalog.prefabs.cliffs['ledge_jump'] = {
    id: 'ledge_jump',
    name: 'Salto de Desnivel Canónico GBA',
    width: 32,
    height: 16,
    parts: [{ sheet: 'poke_ledge_jump.png', sx: 0, sy: 0, sw: 32, sh: 16, dx: 0, dy: 0, zIndex: 1 }]
  };
  catalog.prefabs.nature['ledge_jump'] = catalog.prefabs.cliffs['ledge_jump'];

  // Index 100% of all PNG sheets in LPC folder so DynamicCatalogLoader loads them into memory
  if (!catalog.sheets) catalog.sheets = {};
  const allLpcFiles = fs.readdirSync(DIRS.lpc).filter(f => f.endsWith('.png'));
  for (const f of allLpcFiles) {
    if (!catalog.sheets[f]) {
      catalog.sheets[f] = {
        file: f,
        width: 32,
        height: 32,
        cols: 1,
        rows: 1,
        hasAlpha: true
      };
    }
  }

  // Write JSON and JS
  fs.writeFileSync(DIRS.catalogJson, JSON.stringify(catalog, null, 2), 'utf-8');
  const jsContent = `/**
 * Poké Vicio • Catálogo Semántico de Tiles (Exportación Automática v5.0)
 */
window.POKE_TILE_CATALOG = ${JSON.stringify(catalog, null, 2)};
`;
  fs.writeFileSync(DIRS.catalogJs, jsContent, 'utf-8');
  console.log('✅ tile_catalog.json & tile_catalog.js successfully updated!');
}

/**
 * Generates an automated visual contact sheet of all extracted sprites
 */
async function generateContactSheet() {
  console.log('🖼️  Generating automated visual contact sheet gallery...');
  const keySprites = [
    { file: 'poke_cliff_cone_brown.png', label: 'Cone Brown (32x48)' },
    { file: 'poke_cliff_cone_gray.png', label: 'Cone Gray (32x48)' },
    { file: 'poke_cliff_cone_small_brown.png', label: 'Cone Sm Brown (32x32)' },
    { file: 'poke_cliff_brown_face.png', label: 'Cliff Face (32x48)' },
    { file: 'poke_cliff_brown_vleft.png', label: 'Cliff Left (16x48)' },
    { file: 'poke_cliff_brown_vright.png', label: 'Cliff Right (16x48)' },
    { file: 'poke_ledge_jump.png', label: 'Ledge Jump (32x16)' },
    { file: 'poke_street_lamp.png', label: 'Street Lamp (16x48)' },
    { file: 'poke_street_lamp_left.png', label: 'Lamp Left (16x48)' },
    { file: 'poke_mailbox.png', label: 'Mailbox (16x16)' },
    { file: 'poke_rock_boulder.png', label: 'Boulder (16x16)' },
    { file: 'poke_tree_poke.png', label: 'Tree Poke (32x48)' },
    { file: 'poke_tree_pine_small.png', label: 'Pine Small (16x32)' },
    { file: 'poke_snorlax.png', label: 'Snorlax (32x32)' },
    { file: 'pokecenter.png', label: 'Pokecenter (80x78)' },
    { file: 'gym.png', label: 'Gym (96x80)' }
  ];

  const cellW = 140, cellH = 120, cols = 4;
  const rows = Math.ceil(keySprites.length / cols);
  const galleryW = cols * cellW;
  const galleryH = rows * cellH;

  const overlays = [];
  for (let i = 0; i < keySprites.length; i++) {
    const item = keySprites[i];
    const srcPath = path.join(DIRS.lpc, item.file);
    if (!fs.existsSync(srcPath)) continue;

    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = col * cellW;
    const cellY = row * cellH;

    const meta = await sharp(srcPath).metadata();
    const scale = Math.min(2.0, 70 / Math.max(meta.width, meta.height));
    const targetW = Math.max(16, Math.round(meta.width * scale));
    const targetH = Math.max(16, Math.round(meta.height * scale));

    const resizedBuf = await sharp(srcPath)
      .resize(targetW, targetH, { kernel: 'nearest' })
      .toBuffer();

    const posX = cellX + Math.floor((cellW - targetW) / 2);
    const posY = cellY + 20 + Math.floor((64 - targetH) / 2);

    overlays.push({ input: resizedBuf, top: posY, left: posX });
  }

  const sheetBuf = await sharp({
    create: {
      width: galleryW,
      height: galleryH,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  }).composite(overlays).png().toBuffer();

  const outGallery = path.resolve('scratch/map_lab/asset_contact_sheet.png');
  fs.writeFileSync(outGallery, sheetBuf);
  console.log(`✅ Automated contact sheet saved to: ${outGallery}`);
}

// Auto-run when executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/map/sync_assets_pipeline.mjs')) {
  syncAssets(true).then(() => generateContactSheet()).catch(console.error);
}
