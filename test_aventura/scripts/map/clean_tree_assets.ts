import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();

async function run(): Promise<void> {
  const pokeTreePath = path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation/poke_tree_poke.png');
  const fullTallPath = path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs/poke_tree_full_tall.png');

  // 1. Copy clean poke_tree_poke.png to all poke_tree_oak_clean.png locations
  const oakCleanTargets = [
    path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation/poke_tree_oak_clean.png'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/poke_tree_oak_clean.png'),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/vegetation/poke_tree_oak_clean.png'),
    path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs/poke_tree_oak_clean.png')
  ];

  const cleanOakBuffer = fs.readFileSync(pokeTreePath);
  for (const target of oakCleanTargets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, cleanOakBuffer);
    console.log('Updated clean oak tree:', target);
  }

  // 2. Generate clean autumn golden-yellow oak tree from poke_tree_poke.png
  const { data: oakData, info: oakInfo } = await sharp(pokeTreePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const yellowData = Buffer.from(oakData);
  for (let i = 0; i < yellowData.length; i += 4) {
    const a = yellowData[i + 3]!;
    if (a === 0) continue;

    const r = yellowData[i]!;
    const g = yellowData[i + 1]!;
    const b = yellowData[i + 2]!;

    // Detect green tree foliage: g is high relative to b, and g >= r * 0.85
    if (g > b + 15 && g >= r * 0.8 && !(r > 100 && g < 80)) {
      // Shift toward warm golden-amber autumn foliage
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      if (brightness > 0.7) {
        // Highlight golden
        yellowData[i] = Math.min(255, Math.round(g * 1.05));
        yellowData[i + 1] = Math.round(g * 0.95);
        yellowData[i + 2] = Math.round(b * 0.7);
      } else if (brightness > 0.45) {
        // Midtone amber
        yellowData[i] = Math.min(255, Math.round(g * 1.15));
        yellowData[i + 1] = Math.round(g * 0.92);
        yellowData[i + 2] = Math.round(b * 0.5);
      } else if (brightness > 0.25) {
        // Shadow russet
        yellowData[i] = Math.min(255, Math.round(g * 1.2));
        yellowData[i + 1] = Math.round(g * 0.85);
        yellowData[i + 2] = Math.round(b * 0.4);
      } else {
        // Deep shadow
        yellowData[i] = Math.min(255, Math.round(g * 1.1));
        yellowData[i + 1] = Math.round(g * 0.8);
        yellowData[i + 2] = Math.round(b * 0.3);
      }
    }
  }

  const cleanYellowBuffer = await sharp(yellowData, {
    raw: { width: oakInfo.width, height: oakInfo.height, channels: 4 }
  })
    .png()
    .toBuffer();

  const oakYellowTargets = [
    path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation/poke_tree_oak_yellow.png'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/poke_tree_oak_yellow.png'),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/vegetation/poke_tree_oak_yellow.png')
  ];

  for (const target of oakYellowTargets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, cleanYellowBuffer);
    console.log('Updated clean yellow oak tree:', target);
  }

  // 3. Fix poke_tree_pine_small.png using clean pine sprite
  // Inspect poke_tree_full_tall.png and remove teal grass base if present
  const { data: pineData, info: pineInfo } = await sharp(fullTallPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleanPineData = Buffer.from(pineData);
  const pw = pineInfo.width;
  const ph = pineInfo.height;

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = (y * pw + x) * 4;
      const a = cleanPineData[idx + 3]!;
      if (a === 0) continue;
      const r = cleanPineData[idx]!;
      const g = cleanPineData[idx + 1]!;
      const b = cleanPineData[idx + 2]!;

      // In the lower half, remove background teal grass plate and white border dots
      if (y >= 60) {
        // Teal grass base
        if (g > 140 && b > 120 && r < 120) {
          cleanPineData[idx + 3] = 0;
        }
        // White border dots
        if (r > 190 && g > 210 && b > 190) {
          cleanPineData[idx + 3] = 0;
        }
      }
    }
  }

  // Resize clean pine to 64x96 matching manifest contract (2x3 tiles)
  const cleanPineBuffer = await sharp(cleanPineData, {
    raw: { width: pineInfo.width, height: pineInfo.height, channels: 4 }
  })
    .resize(64, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const pineSmallTargets = [
    path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation/poke_tree_pine_small.png'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/poke_tree_pine_small.png'),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/vegetation/poke_tree_pine_small.png'),
    path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs/poke_tree_pine_small.png')
  ];

  for (const target of pineSmallTargets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, cleanPineBuffer);
    console.log('Updated clean pine tree:', target);
  }

  // 4. Generate clean authentic terracotta Dojo from firered_saffron_city.png
  const saffronCityPath = path.resolve(ROOT_DIR, 'public/assets/raw/firered_leafgreen/firered_saffron_city.png');
  const { data: rawDojoData, info: rawDojoInfo } = await sharp(saffronCityPath)
    .extract({ left: 601, top: 161, width: 96, height: 64 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const dojoBuf = Buffer.from(rawDojoData);
  const dw = rawDojoInfo.width;
  const dh = rawDojoInfo.height;

  // Row 0 transparent
  for (let x = 0; x < dw; x++) {
    dojoBuf[(0 * dw + x) * 4 + 3] = 0;
  }
  // Row 1 clean trees / fence pole
  for (let x = 0; x < dw; x++) {
    const idx = (1 * dw + x) * 4;
    const r = dojoBuf[idx]!;
    const g = dojoBuf[idx + 1]!;
    const b = dojoBuf[idx + 2]!;
    if (g > b + 10 || (x < 6 && r < 100) || (r === 148 && g === 164)) {
      dojoBuf[idx + 3] = 0;
    }
  }

  // Cobblestone ground below wall baseline: y >= 59 for x < 38 and x > 65
  for (let y = 59; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      if (x < 38 || x > 65) {
        dojoBuf[(y * dw + x) * 4 + 3] = 0;
      }
    }
  }

  // Right edge tree sliver cleanup and terracotta hue shift
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const idx = (y * dw + x) * 4;
      if (dojoBuf[idx + 3] === 0) continue;
      const r = dojoBuf[idx]!;
      const g = dojoBuf[idx + 1]!;
      const b = dojoBuf[idx + 2]!;

      // Right edge tree sliver
      if (x >= 94 && g > b + 20 && r < 180) {
        dojoBuf[idx + 3] = 0;
        continue;
      }

      // Roof bricks: y between 5 and 40 (in 96x64 coordinates), yellow roof brick color
      if (y >= 5 && y <= 40 && r > 140 && g > 110 && b < 130 && r >= g * 0.9) {
        dojoBuf[idx] = Math.min(255, Math.round(r * 1.05));
        dojoBuf[idx + 1] = Math.round(g * 0.65);
        dojoBuf[idx + 2] = Math.round(b * 0.45);
      }
    }
  }

  const cleanDojoBuffer = await sharp(dojoBuf, { raw: { width: dw, height: dh, channels: 4 } })
    .resize(192, 128, { kernel: 'nearest' })
    .png()
    .toBuffer();

  const dojoTargets = [
    path.resolve(ROOT_DIR, 'public/assets/canon/buildings/poke_dojo.png'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings/poke_dojo.png'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/poke_dojo.png'),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/buildings/poke_dojo.png'),
    path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs/poke_dojo.png')
  ];

  for (const target of dojoTargets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, cleanDojoBuffer);
    console.log('Updated clean dojo building:', target);
  }

  console.log('\n[SUCCESS] All tree sprites and dojo building cleaned and updated!');
}

run().catch(console.error);

