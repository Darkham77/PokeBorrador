import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = 'scratch/map_lab/tilesets/pokegba/clean';
fs.mkdirSync(outDir, { recursive: true });

async function extract(src, left, top, width, height, filename, keyColor = null) {
  const dest = path.join(outDir, filename);
  if (!keyColor) {
    await sharp(src)
      .extract({ left, top, width, height })
      .toFile(dest);
  } else {
    const { data, info } = await sharp(src)
      .extract({ left, top, width, height })
      .raw().toBuffer({ resolveWithObject: true });

    const out = Buffer.alloc(width * height * 4);
    const channels = info.channels;
    for (let i = 0; i < width * height; i++) {
      const r = data[i * channels];
      const g = data[i * channels + 1];
      const b = data[i * channels + 2];
      const a = channels === 4 ? data[i * channels + 3] : 255;

      const isKey = (Math.abs(r - keyColor.r) <= keyColor.tol &&
                     Math.abs(g - keyColor.g) <= keyColor.tol &&
                     Math.abs(b - keyColor.b) <= keyColor.tol) ||
                    (r > 240 && g > 240 && b > 240);

      if (isKey) {
        out[i * 4] = 0;
        out[i * 4 + 1] = 0;
        out[i * 4 + 2] = 0;
        out[i * 4 + 3] = 0;
      } else {
        out[i * 4] = r;
        out[i * 4 + 1] = g;
        out[i * 4 + 2] = b;
        out[i * 4 + 3] = a;
      }
    }

    await sharp(out, { raw: { width, height, channels: 4 } })
      .toFile(dest);
  }
  console.log(`Extracted: ${filename} (${width}x${height})`);
}

async function run() {
  const housesSrc = 'scratch/map_lab/tilesets/pokegba/houses.png';
  const decoSrc = 'scratch/map_lab/tilesets/pokegba/decoration.png';
  const natureSrc = 'scratch/map_lab/tilesets/pokegba/nature.png';
  const fenceSrc = 'scratch/map_lab/tilesets/pokegba/fences.png';
  const pokeSrc = 'scratch/map_lab/tilesets/pokegba/pokemon.png';

  // Edificios canónicos
  await extract(housesSrc, 224, 2, 80, 78, 'pokecenter.png');
  await extract(housesSrc, 0, 2, 64, 70, 'pokemart.png');
  await extract(housesSrc, 304, 2, 112, 78, 'lab_oak.png');
  await extract(housesSrc, 64, 144, 80, 56, 'house_red.png');
  await extract(housesSrc, 144, 208, 80, 56, 'house_blue.png');
  await extract(housesSrc, 64, 0, 80, 54, 'house_green.png');
  await extract(housesSrc, 0, 144, 64, 56, 'house_orange.png');
  await extract(housesSrc, 64, 72, 80, 56, 'house_purple.png');
  await extract(housesSrc, 304, 368, 96, 80, 'gym.png');
  await extract(housesSrc, 304, 88, 112, 90, 'gym_gold.png');
  await extract(housesSrc, 64, 432, 144, 160, 'silph_tower.png');
  await extract(housesSrc, 256, 544, 160, 104, 'power_plant.png');
  await extract(housesSrc, 0, 616, 256, 104, 'pokemon_league.png');
  await extract(housesSrc, 64, 336, 112, 80, 'game_corner.png');

  // Decoraciones y Props canónicos
  await extract(decoSrc, 48, 0, 32, 48, 'street_lamp.png');
  await extract(decoSrc, 112, 48, 16, 16, 'mailbox.png');
  await extract(decoSrc, 96, 32, 16, 16, 'rock_boulder.png');
  await extract(decoSrc, 112, 0, 48, 32, 'ss_anne_truck.png');

  // Vegetación y Naturaleza canónica (con fondo verde eliminado)
  const natureKey = { r: 112, g: 200, b: 160, tol: 15 };
  await extract(natureSrc, 16, 80, 32, 48, 'tree_poke.png', natureKey);
  await extract(natureSrc, 16, 32, 16, 16, 'tree_cuttable.png', natureKey);
  await extract(natureSrc, 16, 16, 16, 16, 'flowers_red.png', natureKey);
  await extract(natureSrc, 16, 48, 16, 16, 'bush_round.png', natureKey);

  // Vallas y Cercas canónicas
  await extract(fenceSrc, 0, 0, 48, 16, 'fence_picket.png');

  // Pokémon en el Mapa
  await extract(pokeSrc, 64, 0, 32, 32, 'snorlax.png');
  await extract(pokeSrc, 16, 0, 16, 32, 'lapras.png');
  await extract(pokeSrc, 0, 0, 16, 16, 'diglett.png', natureKey);

  console.log('All authentic Pokémon GBA prefabs extracted successfully!');
}

run();
