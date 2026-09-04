import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outLpc = 'scratch/map_lab/tilesets/lpc';
const outClean = 'scratch/map_lab/tilesets/pokegba/clean';
fs.mkdirSync(outLpc, { recursive: true });
fs.mkdirSync(outClean, { recursive: true });

async function saveToBoth(buffer, filename) {
  await fs.promises.writeFile(path.join(outLpc, filename), buffer);
  await fs.promises.writeFile(path.join(outClean, filename), buffer);
}

function keyOut(buffer, width, height, keyR, keyG, keyB, tol = 20) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = buffer[i * 4];
    const g = buffer[i * 4 + 1];
    const b = buffer[i * 4 + 2];
    const a = buffer[i * 4 + 3];

    const isKey = Math.abs(r - keyR) <= tol &&
                  Math.abs(g - keyG) <= tol &&
                  Math.abs(b - keyB) <= tol;

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
  return out;
}

async function extractCliffs() {
  const hills = 'scratch/map_lab/tilesets/pokegba/hills.png';

  // 1. BROWN CLIFFS (Mt. Moon, Cerulean Cape, Rock Tunnel)
  // Face (32x48) - row 0 (top: 0, h:16), row 2 (top: 32, h:16), row 3 (top: 48, h:16)
  const bFaceBuf = await sharp({ create: { width: 32, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(hills).extract({ left: 16, top: 0, width: 32, height: 16 }).toBuffer(), top: 0, left: 0 },
      { input: await sharp(hills).extract({ left: 16, top: 32, width: 32, height: 16 }).toBuffer(), top: 16, left: 0 },
      { input: await sharp(hills).extract({ left: 16, top: 48, width: 32, height: 16 }).toBuffer(), top: 32, left: 0 },
    ])
    .raw()
    .toBuffer();

  const bFaceCleanRaw = keyOut(bFaceBuf, 32, 48, 112, 200, 160, 25);
  for (let y = 0; y < 16; y++) {
    for (let x of [0, 31]) {
      const idx = (y * 32 + x) * 4;
      if (bFaceCleanRaw[idx + 3] === 0) {
        const nIdx = (y * 32 + (x === 0 ? 1 : 30)) * 4;
        bFaceCleanRaw[idx] = bFaceCleanRaw[nIdx];
        bFaceCleanRaw[idx + 1] = bFaceCleanRaw[nIdx + 1];
        bFaceCleanRaw[idx + 2] = bFaceCleanRaw[nIdx + 2];
        bFaceCleanRaw[idx + 3] = 255;
      }
    }
  }
  const bFacePng = await sharp(bFaceCleanRaw, { raw: { width: 32, height: 48, channels: 4 } }).png().toBuffer();
  await saveToBoth(bFacePng, 'poke_cliff_brown_face.png');

  // Left Corner (16x48)
  const bLeftBuf = await sharp({ create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(hills).extract({ left: 0, top: 0, width: 16, height: 16 }).toBuffer(), top: 0, left: 0 },
      { input: await sharp(hills).extract({ left: 0, top: 32, width: 16, height: 16 }).toBuffer(), top: 16, left: 0 },
      { input: await sharp(hills).extract({ left: 0, top: 48, width: 16, height: 16 }).toBuffer(), top: 32, left: 0 },
    ])
    .raw()
    .toBuffer();
  const bLeftCleanRaw = keyOut(bLeftBuf, 16, 48, 112, 200, 160, 25);
  const bLeftPng = await sharp(bLeftCleanRaw, { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveToBoth(bLeftPng, 'poke_cliff_brown_left.png');

  // Right Corner (16x48)
  const bRightBuf = await sharp({ create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(hills).extract({ left: 64, top: 0, width: 16, height: 16 }).toBuffer(), top: 0, left: 0 },
      { input: await sharp(hills).extract({ left: 64, top: 32, width: 16, height: 16 }).toBuffer(), top: 16, left: 0 },
      { input: await sharp(hills).extract({ left: 64, top: 48, width: 16, height: 16 }).toBuffer(), top: 32, left: 0 },
    ])
    .raw()
    .toBuffer();
  const bRightCleanRaw = keyOut(bRightBuf, 16, 48, 112, 200, 160, 25);
  const bRightPng = await sharp(bRightCleanRaw, { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveToBoth(bRightPng, 'poke_cliff_brown_right.png');

  // Peak (32x32)
  const bPeakBuf = await sharp(hills).extract({ left: 16, top: 16, width: 32, height: 32 }).ensureAlpha().raw().toBuffer();
  const bPeakCleanRaw = keyOut(bPeakBuf, 32, 32, 112, 200, 160, 25);
  const bPeakPng = await sharp(bPeakCleanRaw, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveToBoth(bPeakPng, 'poke_cliff_brown_peak.png');

  // 2. GRAY CLIFFS (Victory Road, Indigo Plateau)
  const gFaceBuf = await sharp({ create: { width: 32, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(hills).extract({ left: 96, top: 0, width: 32, height: 16 }).toBuffer(), top: 0, left: 0 },
      { input: await sharp(hills).extract({ left: 96, top: 32, width: 32, height: 16 }).toBuffer(), top: 16, left: 0 },
      { input: await sharp(hills).extract({ left: 96, top: 48, width: 32, height: 16 }).toBuffer(), top: 32, left: 0 },
    ])
    .raw()
    .toBuffer();
  const gFaceCleanRaw = keyOut(gFaceBuf, 32, 48, 112, 200, 160, 25);
  for (let y = 0; y < 16; y++) {
    for (let x of [0, 31]) {
      const idx = (y * 32 + x) * 4;
      if (gFaceCleanRaw[idx + 3] === 0) {
        const nIdx = (y * 32 + (x === 0 ? 1 : 30)) * 4;
        gFaceCleanRaw[idx] = gFaceCleanRaw[nIdx];
        gFaceCleanRaw[idx + 1] = gFaceCleanRaw[nIdx + 1];
        gFaceCleanRaw[idx + 2] = gFaceCleanRaw[nIdx + 2];
        gFaceCleanRaw[idx + 3] = 255;
      }
    }
  }
  const gFacePng = await sharp(gFaceCleanRaw, { raw: { width: 32, height: 48, channels: 4 } }).png().toBuffer();
  await saveToBoth(gFacePng, 'poke_cliff_gray_face.png');

  const gLeftBuf = await sharp({ create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(hills).extract({ left: 80, top: 0, width: 16, height: 16 }).toBuffer(), top: 0, left: 0 },
      { input: await sharp(hills).extract({ left: 80, top: 32, width: 16, height: 16 }).toBuffer(), top: 16, left: 0 },
      { input: await sharp(hills).extract({ left: 80, top: 48, width: 16, height: 16 }).toBuffer(), top: 32, left: 0 },
    ])
    .raw()
    .toBuffer();
  const gLeftCleanRaw = keyOut(gLeftBuf, 16, 48, 112, 200, 160, 25);
  const gLeftPng = await sharp(gLeftCleanRaw, { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveToBoth(gLeftPng, 'poke_cliff_gray_left.png');

  const gRightBuf = await sharp({ create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(hills).extract({ left: 144, top: 0, width: 16, height: 16 }).toBuffer(), top: 0, left: 0 },
      { input: await sharp(hills).extract({ left: 144, top: 32, width: 16, height: 16 }).toBuffer(), top: 16, left: 0 },
      { input: await sharp(hills).extract({ left: 144, top: 48, width: 16, height: 16 }).toBuffer(), top: 32, left: 0 },
    ])
    .raw()
    .toBuffer();
  const gRightCleanRaw = keyOut(gRightBuf, 16, 48, 112, 200, 160, 25);
  const gRightPng = await sharp(gRightCleanRaw, { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveToBoth(gRightPng, 'poke_cliff_gray_right.png');

  const gPeakBuf = await sharp(hills).extract({ left: 96, top: 16, width: 32, height: 32 }).ensureAlpha().raw().toBuffer();
  const gPeakCleanRaw = keyOut(gPeakBuf, 32, 32, 112, 200, 160, 25);
  const gPeakPng = await sharp(gPeakCleanRaw, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveToBoth(gPeakPng, 'poke_cliff_gray_peak.png');

  console.log('? Mountain cliffs extracted and assembled cleanly!');
}

async function extractRoadProps() {
  const road = 'scratch/map_lab/tilesets/pokegba/road.png';

  // Cycling Road Railing (Tile 2: 32x32 at x=64, y=0)
  const railPng = await sharp(road).extract({ left: 64, top: 0, width: 32, height: 32 }).png().toBuffer();
  await saveToBoth(railPng, 'poke_cycling_railing.png');

  // Boardwalk Planks (Tile 0: 32x32 at x=0, y=0)
  const bwPng = await sharp(road).extract({ left: 0, top: 0, width: 32, height: 32 }).png().toBuffer();
  await saveToBoth(bwPng, 'poke_boardwalk_planks.png');

  console.log('? Cycling Railing and Boardwalk extracted!');
}

async function runAll() {
  await extractCliffs();
  await extractRoadProps();
  console.log('?? All canonical GBA assets ready!');
}

runAll();
