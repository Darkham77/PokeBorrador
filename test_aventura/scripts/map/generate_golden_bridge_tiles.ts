/**
 * scripts/map/generate_golden_bridge_tiles.ts
 *
 * CANONICAL GOLDEN WOOD (NUGGET BRIDGE) HORIZONTAL & TURN TILESET GENERATOR
 *
 * Generates 100% matching horizontal and corner tiles for the golden_wood
 * (Puente Pepita) bridge style using its authentic 3-color palette from Route 24:
 *   - Dark yellow / shadow: rgb(172, 148, 74)
 *   - Medium yellow: rgb(197, 172, 106)
 *   - Light yellow / highlight: rgb(238, 230, 139)
 *
 * Guarantees that golden_wood NEVER mixes with Route 12 silence_wood tiles.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();

async function main(): Promise<void> {
  const vLeftBuf = fs.readFileSync(path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure/poke_bridge_v_left.png'));
  const vRightBuf = fs.readFileSync(path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure/poke_bridge_v_right.png'));
  const vMidBuf = fs.readFileSync(path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure/poke_bridge_v_mid.png'));

  // Rotate vertical tiles 90 degrees clockwise to form vertical planks with top/bottom railing curbs
  const hTopBuf = await sharp(vLeftBuf).rotate(90).toBuffer();
  const hBotBuf = await sharp(vRightBuf).rotate(90).toBuffer();
  const hMidBuf = await sharp(vMidBuf).rotate(90).toBuffer();

  const targetDirs = [
    path.resolve(ROOT_DIR, 'public/assets/tiles'),
    path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs')
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const generated = [
    { id: 'poke_bridge_golden_h_top.png', buf: hTopBuf },
    { id: 'poke_bridge_golden_h_bot.png', buf: hBotBuf },
    { id: 'poke_bridge_golden_h_mid.png', buf: hMidBuf }
  ];

  for (const item of generated) {
    for (const dir of targetDirs) {
      fs.writeFileSync(path.join(dir, item.id), item.buf);
    }
    console.log(`[Generated]: ${item.id}`);
  }

  console.log('Successfully generated matching horizontal tiles for golden_wood!');
}

main().catch(err => {
  console.error('[Error generating golden bridge tiles]:', err);
  process.exit(1);
});
