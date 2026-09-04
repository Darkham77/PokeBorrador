import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outLpc = 'scratch/map_lab/tilesets/lpc';
const outClean = 'scratch/map_lab/tilesets/pokegba/clean';

async function saveBoth(buf, name) {
  await fs.promises.writeFile(path.join(outLpc, name), buf);
  await fs.promises.writeFile(path.join(outClean, name), buf);
}

async function buildTiles() {
  const hills = 'scratch/map_lab/tilesets/pokegba/hills.png';

  // -------------------------------------------------------------
  // 1. BROWN CLIFF FACE (32x48)
  // Top 16px: row 0 (top:0) with cleaned edges
  // Middle 16px: row 2 (top:32) - vertical rock body
  // Bottom 16px: row 2 (top:32) with bottom shadow
  // -------------------------------------------------------------
  const top16Buf = await sharp(hills).extract({ left: 16, top: 0, width: 32, height: 16 }).ensureAlpha().raw().toBuffer();
  // Fix the slits at x=0 and x=31
  for (let y = 0; y < 16; y++) {
    for (let c = 0; c < 4; c++) {
      top16Buf[(y * 32 + 0) * 4 + c] = top16Buf[(y * 32 + 2) * 4 + c];
      top16Buf[(y * 32 + 1) * 4 + c] = top16Buf[(y * 32 + 2) * 4 + c];
      top16Buf[(y * 32 + 31) * 4 + c] = top16Buf[(y * 32 + 29) * 4 + c];
      top16Buf[(y * 32 + 30) * 4 + c] = top16Buf[(y * 32 + 29) * 4 + c];
    }
  }

  const mid16Buf = await sharp(hills).extract({ left: 16, top: 32, width: 32, height: 16 }).ensureAlpha().raw().toBuffer();

  const bot16Buf = Buffer.from(mid16Buf); // copy mid rock body
  // Add subtle shadow and rocky footing in bottom 4 rows
  for (let y = 12; y < 16; y++) {
    const factor = y === 15 ? 0.65 : y === 14 ? 0.75 : 0.88;
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      bot16Buf[idx] = Math.floor(bot16Buf[idx] * factor);
      bot16Buf[idx + 1] = Math.floor(bot16Buf[idx + 1] * factor);
      bot16Buf[idx + 2] = Math.floor(bot16Buf[idx + 2] * factor);
    }
  }

  const bFaceFull = await sharp({
    create: { width: 32, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: top16Buf, raw: { width: 32, height: 16, channels: 4 }, top: 0, left: 0 },
    { input: mid16Buf, raw: { width: 32, height: 16, channels: 4 }, top: 16, left: 0 },
    { input: bot16Buf, raw: { width: 32, height: 16, channels: 4 }, top: 32, left: 0 },
  ]).png().toBuffer();
  await saveBoth(bFaceFull, 'poke_cliff_brown_face.png');

  // -------------------------------------------------------------
  // 2. BROWN LEFT CORNER (16x48)
  // -------------------------------------------------------------
  const bLeftTop = await sharp(hills).extract({ left: 0, top: 0, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const bLeftMid = await sharp(hills).extract({ left: 0, top: 32, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const bLeftBot = await sharp(hills).extract({ left: 0, top: 48, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();

  const bLeftFull = await sharp({
    create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: bLeftTop, raw: { width: 16, height: 16, channels: 4 }, top: 0, left: 0 },
    { input: bLeftMid, raw: { width: 16, height: 16, channels: 4 }, top: 16, left: 0 },
    { input: bLeftBot, raw: { width: 16, height: 16, channels: 4 }, top: 32, left: 0 },
  ]).png().toBuffer();
  await saveBoth(bLeftFull, 'poke_cliff_brown_left.png');

  // -------------------------------------------------------------
  // 3. BROWN RIGHT CORNER (16x48)
  // -------------------------------------------------------------
  const bRightTop = await sharp(hills).extract({ left: 64, top: 0, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const bRightMid = await sharp(hills).extract({ left: 64, top: 32, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const bRightBot = await sharp(hills).extract({ left: 64, top: 48, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();

  const bRightFull = await sharp({
    create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: bRightTop, raw: { width: 16, height: 16, channels: 4 }, top: 0, left: 0 },
    { input: bRightMid, raw: { width: 16, height: 16, channels: 4 }, top: 16, left: 0 },
    { input: bRightBot, raw: { width: 16, height: 16, channels: 4 }, top: 32, left: 0 },
  ]).png().toBuffer();
  await saveBoth(bRightFull, 'poke_cliff_brown_right.png');

  // -------------------------------------------------------------
  // 4. BROWN PEAK (32x32)
  // -------------------------------------------------------------
  const bPeakBuf = await sharp(hills).extract({ left: 16, top: 16, width: 32, height: 32 }).ensureAlpha().raw().toBuffer();
  // Key out teal background (r:112, g:200, b:160)
  for (let i = 0; i < 32 * 32; i++) {
    const r = bPeakBuf[i * 4], g = bPeakBuf[i * 4 + 1], b = bPeakBuf[i * 4 + 2];
    if (Math.abs(r - 112) < 30 && Math.abs(g - 200) < 30 && Math.abs(b - 160) < 30) {
      bPeakBuf[i * 4 + 3] = 0;
    }
  }
  const bPeakPng = await sharp(bPeakBuf, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(bPeakPng, 'poke_cliff_brown_peak.png');

  // -------------------------------------------------------------
  // 5. GRAY CLIFFS (Right half of hills.png, +80px)
  // -------------------------------------------------------------
  const gTop16Buf = await sharp(hills).extract({ left: 96, top: 0, width: 32, height: 16 }).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < 16; y++) {
    for (let c = 0; c < 4; c++) {
      gTop16Buf[(y * 32 + 0) * 4 + c] = gTop16Buf[(y * 32 + 2) * 4 + c];
      gTop16Buf[(y * 32 + 1) * 4 + c] = gTop16Buf[(y * 32 + 2) * 4 + c];
      gTop16Buf[(y * 32 + 31) * 4 + c] = gTop16Buf[(y * 32 + 29) * 4 + c];
      gTop16Buf[(y * 32 + 30) * 4 + c] = gTop16Buf[(y * 32 + 29) * 4 + c];
    }
  }
  const gMid16Buf = await sharp(hills).extract({ left: 96, top: 32, width: 32, height: 16 }).ensureAlpha().raw().toBuffer();
  const gBot16Buf = Buffer.from(gMid16Buf);
  for (let y = 12; y < 16; y++) {
    const factor = y === 15 ? 0.65 : y === 14 ? 0.75 : 0.88;
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      gBot16Buf[idx] = Math.floor(gBot16Buf[idx] * factor);
      gBot16Buf[idx + 1] = Math.floor(gBot16Buf[idx + 1] * factor);
      gBot16Buf[idx + 2] = Math.floor(gBot16Buf[idx + 2] * factor);
    }
  }
  const gFaceFull = await sharp({
    create: { width: 32, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: gTop16Buf, raw: { width: 32, height: 16, channels: 4 }, top: 0, left: 0 },
    { input: gMid16Buf, raw: { width: 32, height: 16, channels: 4 }, top: 16, left: 0 },
    { input: gBot16Buf, raw: { width: 32, height: 16, channels: 4 }, top: 32, left: 0 },
  ]).png().toBuffer();
  await saveBoth(gFaceFull, 'poke_cliff_gray_face.png');

  const gLeftTop = await sharp(hills).extract({ left: 80, top: 0, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const gLeftMid = await sharp(hills).extract({ left: 80, top: 32, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const gLeftBot = await sharp(hills).extract({ left: 80, top: 48, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const gLeftFull = await sharp({
    create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: gLeftTop, raw: { width: 16, height: 16, channels: 4 }, top: 0, left: 0 },
    { input: gLeftMid, raw: { width: 16, height: 16, channels: 4 }, top: 16, left: 0 },
    { input: gLeftBot, raw: { width: 16, height: 16, channels: 4 }, top: 32, left: 0 },
  ]).png().toBuffer();
  await saveBoth(gLeftFull, 'poke_cliff_gray_left.png');

  const gRightTop = await sharp(hills).extract({ left: 144, top: 0, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const gRightMid = await sharp(hills).extract({ left: 144, top: 32, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const gRightBot = await sharp(hills).extract({ left: 144, top: 48, width: 16, height: 16 }).ensureAlpha().raw().toBuffer();
  const gRightFull = await sharp({
    create: { width: 16, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: gRightTop, raw: { width: 16, height: 16, channels: 4 }, top: 0, left: 0 },
    { input: gRightMid, raw: { width: 16, height: 16, channels: 4 }, top: 16, left: 0 },
    { input: gRightBot, raw: { width: 16, height: 16, channels: 4 }, top: 32, left: 0 },
  ]).png().toBuffer();
  await saveBoth(gRightFull, 'poke_cliff_gray_right.png');

  const gPeakBuf = await sharp(hills).extract({ left: 96, top: 16, width: 32, height: 32 }).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < 32 * 32; i++) {
    const r = gPeakBuf[i * 4], g = gPeakBuf[i * 4 + 1], b = gPeakBuf[i * 4 + 2];
    if (Math.abs(r - 112) < 30 && Math.abs(g - 200) < 30 && Math.abs(b - 160) < 30) {
      gPeakBuf[i * 4 + 3] = 0;
    }
  }
  const gPeakPng = await sharp(gPeakBuf, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(gPeakPng, 'poke_cliff_gray_peak.png');

  // -------------------------------------------------------------
  // 6. TRUE POKÉMON JUMP LEDGE (32x16)
  // An authentic single horizontal jumping ledge!
  // Top: light dirt rim, Middle: crisp shadow line, Bottom: rocky drop
  // -------------------------------------------------------------
  const ledgeBuf = Buffer.alloc(32 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      const noise = ((x * 17 + y * 23) % 7) - 3;
      if (y === 0) {
        // Ground highlight rim
        ledgeBuf[idx] = 205 + noise;     // R
        ledgeBuf[idx + 1] = 175 + noise; // G
        ledgeBuf[idx + 2] = 135 + noise; // B
        ledgeBuf[idx + 3] = 255;
      } else if (y >= 1 && y <= 4) {
        // Rock ledge face
        ledgeBuf[idx] = 170 + noise;
        ledgeBuf[idx + 1] = 130 + noise;
        ledgeBuf[idx + 2] = 95 + noise;
        ledgeBuf[idx + 3] = 255;
      } else if (y >= 5 && y <= 7) {
        // Dark drop overhang shadow
        ledgeBuf[idx] = 95 + noise;
        ledgeBuf[idx + 1] = 60 + noise;
        ledgeBuf[idx + 2] = 40 + noise;
        ledgeBuf[idx + 3] = 255;
      } else if (y >= 8 && y <= 12) {
        // Vertical ledge rock
        ledgeBuf[idx] = 145 + noise;
        ledgeBuf[idx + 1] = 110 + noise;
        ledgeBuf[idx + 2] = 80 + noise;
        ledgeBuf[idx + 3] = 255;
      } else {
        // Bottom ground shadow blending to grass
        ledgeBuf[idx] = 75;
        ledgeBuf[idx + 1] = 50;
        ledgeBuf[idx + 2] = 35;
        ledgeBuf[idx + 3] = y === 15 ? 120 : 200;
      }
    }
  }
  const ledgePng = await sharp(ledgeBuf, { raw: { width: 32, height: 16, channels: 4 } }).png().toBuffer();
  await saveBoth(ledgePng, 'poke_ledge_jump.png');

  console.log('? All 9 cliff and ledge tiles perfectly crafted and saved!');
}

buildTiles();
