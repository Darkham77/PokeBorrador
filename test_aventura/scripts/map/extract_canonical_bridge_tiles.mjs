import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const R12_PATH = 'public/assets/raw/firered_leafgreen/firered_route_12.png';
const R24_PATH = 'public/assets/raw/firered_leafgreen/firered_route_24.png';

async function extractTile(srcPath, tileX, tileY, outName, maskWater = true) {
  const { data, info } = await sharp(srcPath)
    .extract({ left: tileX * 16, top: tileY * 16, width: 16, height: 16 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(16 * 16 * 4);
  for (let i = 0; i < 16 * 16; i++) {
    const r = data[i * 3 + 0];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    // Detect water pixels: High blue, low red
    const isWater = maskWater && (b > 170 && b - r > 40 && b - g > 20);

    rgba[i * 4 + 0] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = isWater ? 0 : 255;
  }

  const outBuf = await sharp(rgba, { raw: { width: 16, height: 16, channels: 4 } })
    .resize(32, 32, { kernel: 'nearest' })
    .png()
    .toBuffer();

  const destPaths = [
    path.join('public/assets/canon/infrastructure', outName),
    path.join('public/assets/prefabs', outName),
    path.join('public/assets/tiles', outName),
    path.join('C:/Users/Ro/.gemini/antigravity/brain/9f33d42f-4abd-4f5c-a4a5-fb704290c075', outName)
  ];

  for (const dp of destPaths) {
    fs.writeFileSync(dp, outBuf);
  }
  console.log(`Extracted ${outName} from (${tileX}, ${tileY})`);
}

async function run() {
  // 1. Vertical Bridge (Route 12 & Route 24)
  await extractTile(R12_PATH, 17, 51, 'poke_bridge_v_left.png', true);
  await extractTile(R12_PATH, 18, 51, 'poke_bridge_v_right.png', true);
  await extractTile(R24_PATH, 11, 20, 'poke_bridge_v_mid.png', false);

  // 2. Horizontal Bridge (Route 12)
  await extractTile(R12_PATH, 14, 48, 'poke_bridge_h_top.png', true);
  await extractTile(R12_PATH, 14, 49, 'poke_bridge_h_mid.png', false);
  await extractTile(R12_PATH, 14, 50, 'poke_bridge_h_bot.png', true);

  // 3. Corners & Turns (Route 12)
  await extractTile(R12_PATH, 12, 48, 'poke_bridge_corner_turn_nw.png', true);
  await extractTile(R12_PATH, 12, 50, 'poke_bridge_corner_turn_sw.png', true);
  await extractTile(R12_PATH, 16, 48, 'poke_bridge_corner_turn_ne.png', true);
  await extractTile(R12_PATH, 16, 50, 'poke_bridge_corner_turn_se.png', true);

  // 4. North Shore Entrance Steps (Route 24)
  await extractTile(R24_PATH, 10, 18, 'poke_bridge_v_step_n_left.png', false);
  await extractTile(R24_PATH, 11, 18, 'poke_bridge_v_step_n_mid.png', false);
  await extractTile(R24_PATH, 13, 18, 'poke_bridge_v_step_n_right.png', false);

  console.log('All bridge tiles extracted successfully!');
}

run();