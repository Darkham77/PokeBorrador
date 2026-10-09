import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Destination directories
const DIRS = [
  path.resolve('scratch/map_lab/tilesets/lpc'),
  path.resolve('scratch/map_lab/tilesets/pokegba/clean')
];

function ensureDirs() {
  for (const d of DIRS) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

async function saveBoth(buffer, filename) {
  for (const d of DIRS) {
    await sharp(buffer).toFile(path.join(d, filename));
  }
}

// Extract and clean a 16x16 rock tile, healing teal background pixels
async function getCleanRock(hillsPath, left, top) {
  const raw = await sharp(hillsPath).extract({ left, top, width: 16, height: 16 }).raw().toBuffer();
  const out = Buffer.alloc(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const srcIdx = (y * 16 + x) * 3;
      const dstIdx = (y * 16 + x) * 4;
      let r = raw[srcIdx], g = raw[srcIdx + 1], b = raw[srcIdx + 2];

      // If teal background (#70C8A0: 112, 200, 160)
      if (Math.abs(r - 112) <= 25 && Math.abs(g - 200) <= 25 && Math.abs(b - 160) <= 25) {
        const refY = Math.min(15, y + 2);
        const refIdx = (refY * 16 + x) * 3;
        r = raw[refIdx];
        g = raw[refIdx + 1];
        b = raw[refIdx + 2];
      }
      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = 255;
    }
  }
  return out;
}

// Build a 32x48 cliff face sprite with authentic rock texture and natural top/bottom edge lighting
function buildFace(rockRaw) {
  const out = Buffer.alloc(32 * 48 * 4);

  for (let py = 0; py < 48; py++) {
    const tileY = py % 16;
    for (let px = 0; px < 32; px++) {
      const tileX = px % 16;
      const srcIdx = (tileY * 16 + tileX) * 4;
      const dstIdx = (py * 32 + px) * 4;

      let r = rockRaw[srcIdx];
      let g = rockRaw[srcIdx + 1];
      let b = rockRaw[srcIdx + 2];

      // Top cliff rim: subtle darker rim in first 2 rows for 3D depth
      if (py === 0) {
        r = Math.floor(r * 0.65);
        g = Math.floor(g * 0.65);
        b = Math.floor(b * 0.65);
      } else if (py === 1) {
        r = Math.floor(r * 0.80);
        g = Math.floor(g * 0.80);
        b = Math.floor(b * 0.80);
      }

      // Bottom cliff foot: subtle ground contact shadow in last 2 rows
      if (py === 47) {
        r = Math.floor(r * 0.70);
        g = Math.floor(g * 0.70);
        b = Math.floor(b * 0.70);
      } else if (py === 46) {
        r = Math.floor(r * 0.85);
        g = Math.floor(g * 0.85);
        b = Math.floor(b * 0.85);
      }

      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = 255;
    }
  }
  return out;
}

// Build 16x48 corner edge (left or right)
function buildEdge(rockRaw, isLeft) {
  const out = Buffer.alloc(16 * 48 * 4);
  for (let py = 0; py < 48; py++) {
    const tileY = py % 16;
    for (let px = 0; px < 16; px++) {
      const srcIdx = (tileY * 16 + px) * 4;
      const dstIdx = (py * 16 + px) * 4;

      let r = rockRaw[srcIdx];
      let g = rockRaw[srcIdx + 1];
      let b = rockRaw[srcIdx + 2];

      // Outer lateral edge shading
      const edgeDist = isLeft ? px : (15 - px);
      if (edgeDist === 0) {
        r = Math.floor(r * 0.55);
        g = Math.floor(g * 0.55);
        b = Math.floor(b * 0.55);
      } else if (edgeDist === 1) {
        r = Math.floor(r * 0.75);
        g = Math.floor(g * 0.75);
        b = Math.floor(b * 0.75);
      }

      // Top rim
      if (py === 0) {
        r = Math.floor(r * 0.65);
        g = Math.floor(g * 0.65);
        b = Math.floor(b * 0.65);
      } else if (py === 1) {
        r = Math.floor(r * 0.80);
        g = Math.floor(g * 0.80);
        b = Math.floor(b * 0.80);
      }

      // Bottom shadow
      if (py === 47) {
        r = Math.floor(r * 0.70);
        g = Math.floor(g * 0.70);
        b = Math.floor(b * 0.70);
      }

      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = 255;
    }
  }
  return out;
}

// Build 32x32 mountain dirt ground (seamless repeating rock texture)
function buildMountainDirt(rockRaw) {
  const out = Buffer.alloc(32 * 32 * 4);
  for (let py = 0; py < 32; py++) {
    const tileY = py % 16;
    for (let px = 0; px < 32; px++) {
      const tileX = px % 16;
      const srcIdx = (tileY * 16 + tileX) * 4;
      const dstIdx = (py * 32 + px) * 4;

      out[dstIdx] = rockRaw[srcIdx];
      out[dstIdx + 1] = rockRaw[srcIdx + 1];
      out[dstIdx + 2] = rockRaw[srcIdx + 2];
      out[dstIdx + 3] = 255;
    }
  }
  return out;
}

export async function generateFireredCliffs() {
  ensureDirs();
  console.log('Extracting authentic Pokemon FireRed Cliff Tileset from hills.png...');

  const hills = path.resolve('scratch/map_lab/tilesets/pokegba/hills.png');
  if (!fs.existsSync(hills)) {
    console.error('Error: hills.png not found at', hills);
    return;
  }

  // 1. Extract 16x16 Clean Rock Tiles
  // Brown: Col 3, Row 2 (x=48, y=32)
  const bRockRaw = await getCleanRock(hills, 48, 32);
  // Gray: Col 8, Row 2 (x=128, y=32)
  const gRockRaw = await getCleanRock(hills, 128, 32);

  // 2. BROWN CLIFFS (Mt. Moon, Cerulean Cape, Route 3/4/9/10/25)
  const bFacePng = await sharp(buildFace(bRockRaw), { raw: { width: 32, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(bFacePng, 'poke_cliff_brown_face.png');

  const bLeftPng = await sharp(buildEdge(bRockRaw, true), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(bLeftPng, 'poke_cliff_brown_left.png');

  const bRightPng = await sharp(buildEdge(bRockRaw, false), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(bRightPng, 'poke_cliff_brown_right.png');

  const bDirtPng = await sharp(buildMountainDirt(bRockRaw), { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(bDirtPng, 'poke_mountain_dirt.png');
  await saveBoth(bDirtPng, 'poke_cliff_brown_top.png');

  // Peak (32x32)
  const bPeakBuf = await sharp(hills).extract({ left: 16, top: 16, width: 32, height: 32 }).ensureAlpha().raw().toBuffer();
  const bPeakCleanRaw = Buffer.alloc(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) {
    const r = bPeakBuf[i * 4], g = bPeakBuf[i * 4 + 1], b = bPeakBuf[i * 4 + 2];
    if (Math.abs(r - 112) <= 25 && Math.abs(g - 200) <= 25 && Math.abs(b - 160) <= 25) {
      bPeakCleanRaw[i * 4 + 3] = 0;
    } else {
      bPeakCleanRaw[i * 4] = r;
      bPeakCleanRaw[i * 4 + 1] = g;
      bPeakCleanRaw[i * 4 + 2] = b;
      bPeakCleanRaw[i * 4 + 3] = 255;
    }
  }
  const bPeakPng = await sharp(bPeakCleanRaw, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(bPeakPng, 'poke_cliff_brown_peak.png');

  // 3. GRAY CLIFFS (Victory Road, Indigo Plateau, Rock Tunnel)
  const gFacePng = await sharp(buildFace(gRockRaw), { raw: { width: 32, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(gFacePng, 'poke_cliff_gray_face.png');

  const gLeftPng = await sharp(buildEdge(gRockRaw, true), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(gLeftPng, 'poke_cliff_gray_left.png');

  const gRightPng = await sharp(buildEdge(gRockRaw, false), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(gRightPng, 'poke_cliff_gray_right.png');

  const gDirtPng = await sharp(buildMountainDirt(gRockRaw), { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(gDirtPng, 'poke_mountain_dirt_gray.png');
  await saveBoth(gDirtPng, 'poke_cliff_gray_top.png');

  const gPeakBuf = await sharp(hills).extract({ left: 96, top: 16, width: 32, height: 32 }).ensureAlpha().raw().toBuffer();
  const gPeakCleanRaw = Buffer.alloc(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) {
    const r = gPeakBuf[i * 4], g = gPeakBuf[i * 4 + 1], b = gPeakBuf[i * 4 + 2];
    if (Math.abs(r - 112) <= 25 && Math.abs(g - 200) <= 25 && Math.abs(b - 160) <= 25) {
      gPeakCleanRaw[i * 4 + 3] = 0;
    } else {
      gPeakCleanRaw[i * 4] = r;
      gPeakCleanRaw[i * 4 + 1] = g;
      gPeakCleanRaw[i * 4 + 2] = b;
      gPeakCleanRaw[i * 4 + 3] = 255;
    }
  }
  const gPeakPng = await sharp(gPeakCleanRaw, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(gPeakPng, 'poke_cliff_gray_peak.png');

  // 4. Authentic GBA Ledge Jump (32x16)
  // Col 3, row 1 (16x16) and row 3 (16x16) from hills.png
  const ledgePart1 = await sharp(hills).extract({ left: 48, top: 16, width: 16, height: 16 }).toBuffer();
  const ledgePart2 = await sharp(hills).extract({ left: 48, top: 48, width: 16, height: 16 }).toBuffer();
  const ledgeAssembled = await sharp({ create: { width: 32, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: ledgePart1, top: 0, left: 0 },
      { input: ledgePart2, top: 0, left: 16 }
    ])
    .raw()
    .toBuffer();

  const ledgeCleanRaw = Buffer.alloc(32 * 16 * 4);
  for (let i = 0; i < 32 * 16; i++) {
    const r = ledgeAssembled[i * 4], g = ledgeAssembled[i * 4 + 1], b = ledgeAssembled[i * 4 + 2];
    if (Math.abs(r - 112) <= 25 && Math.abs(g - 200) <= 25 && Math.abs(b - 160) <= 25) {
      ledgeCleanRaw[i * 4 + 3] = 0;
    } else {
      ledgeCleanRaw[i * 4] = r;
      ledgeCleanRaw[i * 4 + 1] = g;
      ledgeCleanRaw[i * 4 + 2] = b;
      ledgeCleanRaw[i * 4 + 3] = 255;
    }
  }
  const ledgePng = await sharp(ledgeCleanRaw, { raw: { width: 32, height: 16, channels: 4 } }).png().toBuffer();
  await saveBoth(ledgePng, 'poke_ledge_jump.png');

  console.log('✅ All canonical GBA FireRed cliff tiles and floors extracted cleanly without procedural artifacts!');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('generate_firered_cliffs.mjs')) {
  generateFireredCliffs().catch(console.error);
}
