import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();

async function cleanCaveStones(relPath: string): Promise<void> {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return;

  const { data, info } = await sharp(fullPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i]!;
    const g = buf[i + 1]!;
    const b = buf[i + 2]!;
    // Key out cave floor tan: b === 112, r >= 120, g >= 120
    if (b === 112 && r >= 120 && g >= 120) {
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
      buf[i + 3] = 0;
    }
  }

  const out = await sharp(buf, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();

  fs.writeFileSync(fullPath, out);
  console.log(`Cleaned cave rock: ${relPath}`);
}

async function cleanBrownBoulder(relPath: string): Promise<void> {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return;

  const { data, info } = await sharp(fullPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i]!;
    const g = buf[i + 1]!;
    const b = buf[i + 2]!;
    // Key out green grass corners: r === 112 && g === 200 && b === 160
    if (r === 112 && g === 200 && b === 160) {
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
      buf[i + 3] = 0;
    }
  }

  const out = await sharp(buf, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();

  fs.writeFileSync(fullPath, out);
  console.log(`Cleaned brown boulder: ${relPath}`);
}

async function cleanMossyBoulder(relPath: string): Promise<void> {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return;

  const { data, info } = await sharp(fullPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i]!;
    const g = buf[i + 1]!;
    const b = buf[i + 2]!;
    // Key out gray background: r === 144 && g === 152 && b === 160
    if (r === 144 && g === 152 && b === 160) {
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
      buf[i + 3] = 0;
    }
  }

  const out = await sharp(buf, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();

  fs.writeFileSync(fullPath, out);
  console.log(`Cleaned mossy boulder: ${relPath}`);
}

async function run(): Promise<void> {
  await cleanCaveStones('public/assets/tiles/poke_cave_boulder_rock.png');
  await cleanCaveStones('public/assets/tiles/poke_cave_rubble_stones.png');

  const brownTargets = [
    'public/assets/tiles/poke_rock_boulder_brown_large.png',
    'public/assets/prefabs/props/poke_rock_boulder_brown_large.png',
    'public/assets/prefabs/poke_rock_boulder_brown_large.png',
    'public/assets/essentials/prefabs/props/poke_rock_boulder_brown_large.png'
  ] as const;
  for (const t of brownTargets) {
    await cleanBrownBoulder(t);
  }

  const mossyTargets = [
    'public/assets/tiles/poke_rock_boulder_mossy_1.png',
    'public/assets/tiles/poke_rock_boulder_mossy_2.png',
    'public/assets/prefabs/props/poke_rock_boulder_mossy_1.png',
    'public/assets/prefabs/props/poke_rock_boulder_mossy_2.png',
    'public/assets/prefabs/poke_rock_boulder_mossy_1.png',
    'public/assets/prefabs/poke_rock_boulder_mossy_2.png',
    'public/assets/essentials/prefabs/props/poke_rock_boulder_mossy_1.png',
    'public/assets/essentials/prefabs/props/poke_rock_boulder_mossy_2.png'
  ] as const;
  for (const t of mossyTargets) {
    await cleanMossyBoulder(t);
  }

  console.log('All decorative rock assets cleaned successfully with 100% alpha transparency!');
}

run().catch((err) => {
  console.error('Failed to clean rock assets:', err);
  process.exit(1);
});
