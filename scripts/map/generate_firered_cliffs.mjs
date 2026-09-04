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

// Deterministic 2D PRNG hash
function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) | 0;
}

/**
 * Generates an authentic Pokmon FireRed Cliff Face (32x48)
 * Seamlessly tiles horizontally (x=0 matches x=32).
 */
function createCliffFace(isGray = false) {
  const W = 32, H = 48;
  const buf = Buffer.alloc(W * H * 4);

  const p = isGray ? {
    platHi: [225, 230, 235],
    platMid: [195, 200, 208],
    platLow: [155, 160, 170],
    rimDark: [55, 58, 65],
    faceHi: [168, 172, 182],
    faceMid: [135, 140, 150],
    faceShd: [100, 105, 115],
    crack: [60, 64, 72],
    baseShd: [48, 52, 60]
  } : {
    platHi: [232, 202, 180],
    platMid: [215, 180, 152],
    platLow: [175, 135, 110],
    rimDark: [71, 43, 32],
    faceHi: [178, 140, 118],
    faceMid: [148, 114, 98],
    faceShd: [115, 78, 66],
    crack: [68, 40, 30],
    baseShd: [55, 34, 26]
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      const xA = (x / W) * Math.PI * 2;

      const strata = Math.sin(xA * 2 + y * 0.18) * 0.45 +
                     Math.sin(xA * 4 - y * 0.12) * 0.35 +
                     Math.cos(xA * 6 + y * 0.3) * 0.2;

      const n = (hash(x % 16, y, 42) % 7) - 3;

      if (y < 12) {
        if (y === 0) {
          buf[idx] = p.platHi[0]; buf[idx+1] = p.platHi[1]; buf[idx+2] = p.platHi[2]; buf[idx+3] = 255;
        } else if (y < 8) {
          const c = strata > 0.2 ? p.platHi : strata < -0.2 ? p.platLow : p.platMid;
          buf[idx] = Math.min(255, Math.max(0, c[0] + n));
          buf[idx+1] = Math.min(255, Math.max(0, c[1] + n));
          buf[idx+2] = Math.min(255, Math.max(0, c[2] + n));
          buf[idx+3] = 255;
        } else if (y < 11) {
          buf[idx] = p.platLow[0]; buf[idx+1] = p.platLow[1]; buf[idx+2] = p.platLow[2]; buf[idx+3] = 255;
        } else {
          buf[idx] = p.rimDark[0]; buf[idx+1] = p.rimDark[1]; buf[idx+2] = p.rimDark[2]; buf[idx+3] = 255;
        }
      } else if (y < 42) {
        let col = p.faceMid;
        if (strata > 0.3) {
          col = p.faceHi;
        } else if (strata < -0.35) {
          col = p.faceShd;
        }

        const crackPhase = Math.sin(xA * 3 + y * 0.4);
        if (Math.abs(crackPhase) > 0.96 && y > 14 && y < 38) {
          col = p.crack;
        }

        const depth = (y - 12) / 30;
        const shade = 1.0 - (depth * 0.22);

        buf[idx]   = Math.min(255, Math.max(0, Math.floor(col[0] * shade + n)));
        buf[idx+1] = Math.min(255, Math.max(0, Math.floor(col[1] * shade + n)));
        buf[idx+2] = Math.min(255, Math.max(0, Math.floor(col[2] * shade + n)));
        buf[idx+3] = 255;
      } else {
        if (y < 45) {
          buf[idx] = p.faceShd[0]; buf[idx+1] = p.faceShd[1]; buf[idx+2] = p.faceShd[2]; buf[idx+3] = 255;
        } else if (y === 45) {
          buf[idx] = p.baseShd[0]; buf[idx+1] = p.baseShd[1]; buf[idx+2] = p.baseShd[2]; buf[idx+3] = 255;
        } else {
          buf[idx] = p.baseShd[0]; buf[idx+1] = p.baseShd[1]; buf[idx+2] = p.baseShd[2];
          buf[idx+3] = y === 47 ? 110 : 190;
        }
      }
    }
  }
  return buf;
}

function createCliffLeft(isGray = false) {
  const W = 16, H = 48;
  const buf = Buffer.alloc(W * H * 4);
  const faceBuf = createCliffFace(isGray);

  for (let y = 0; y < H; y++) {
    const minX = y < 11 ? Math.max(0, 8 - y) : 0;

    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (x < minX) {
        buf[idx+3] = 0;
        continue;
      }

      const fIdx = (y * 32 + (x + 16)) * 4;
      buf[idx]   = faceBuf[fIdx];
      buf[idx+1] = faceBuf[fIdx+1];
      buf[idx+2] = faceBuf[fIdx+2];
      buf[idx+3] = faceBuf[fIdx+3];

      if (x === minX || x === minX + 1) {
        buf[idx]   = isGray ? 55 : 68;
        buf[idx+1] = isGray ? 58 : 40;
        buf[idx+2] = isGray ? 65 : 30;
      }
    }
  }
  return buf;
}

function createCliffRight(isGray = false) {
  const W = 16, H = 48;
  const buf = Buffer.alloc(W * H * 4);
  const faceBuf = createCliffFace(isGray);

  for (let y = 0; y < H; y++) {
    const maxX = y < 11 ? Math.min(15, 8 + y) : 15;

    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (x > maxX) {
        buf[idx+3] = 0;
        continue;
      }

      const fIdx = (y * 32 + x) * 4;
      buf[idx]   = faceBuf[fIdx];
      buf[idx+1] = faceBuf[fIdx+1];
      buf[idx+2] = faceBuf[fIdx+2];
      buf[idx+3] = faceBuf[fIdx+3];

      if (x === maxX || x === maxX - 1) {
        buf[idx]   = isGray ? 55 : 68;
        buf[idx+1] = isGray ? 58 : 40;
        buf[idx+2] = isGray ? 65 : 30;
      }
    }
  }
  return buf;
}

function createCliffTop(isGray = false) {
  const W = 32, H = 32;
  const buf = Buffer.alloc(W * H * 4);

  const base = isGray ? [195, 200, 208] : [215, 180, 152];
  const hi   = isGray ? [225, 230, 235] : [232, 202, 180];
  const shd  = isGray ? [155, 160, 170] : [175, 135, 110];
  const speck= isGray ? [110, 115, 125] : [130, 95, 75];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const xA = (x / W) * Math.PI * 2;
      const yA = (y / H) * Math.PI * 2;

      const pNoise = Math.sin(xA * 2 + yA * 2) * 0.4 + Math.cos(xA * 4 - yA * 3) * 0.3;
      const speckVal = hash(x, y, 99) % 23;

      let col = base;
      if (speckVal === 0) {
        col = speck;
      } else if (pNoise > 0.25) {
        col = hi;
      } else if (pNoise < -0.25) {
        col = shd;
      }

      buf[idx]   = col[0];
      buf[idx+1] = col[1];
      buf[idx+2] = col[2];
      buf[idx+3] = 255;
    }
  }
  return buf;
}

function createLedgeJump() {
  const W = 32, H = 16;
  const buf = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const n = (hash(x % 8, y, 77) % 5) - 2;

      if (y === 0) {
        buf[idx] = 225 + n; buf[idx+1] = 195 + n; buf[idx+2] = 160 + n; buf[idx+3] = 255;
      } else if (y >= 1 && y <= 4) {
        buf[idx] = 185 + n; buf[idx+1] = 145 + n; buf[idx+2] = 110 + n; buf[idx+3] = 255;
      } else if (y >= 5 && y <= 7) {
        buf[idx] = 95 + n; buf[idx+1] = 60 + n; buf[idx+2] = 40 + n; buf[idx+3] = 255;
      } else if (y >= 8 && y <= 12) {
        buf[idx] = 150 + n; buf[idx+1] = 115 + n; buf[idx+2] = 85 + n; buf[idx+3] = 255;
      } else {
        buf[idx] = 75; buf[idx+1] = 50; buf[idx+2] = 35;
        buf[idx+3] = y === 15 ? 110 : 190;
      }
    }
  }
  return buf;
}

export async function generateFireredCliffs() {
  ensureDirs();
  console.log('Generating authentic Pokemon FireRed Cliff Tileset...');

  const bFace = await sharp(createCliffFace(false), { raw: { width: 32, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(bFace, 'poke_cliff_brown_face.png');

  const bLeft = await sharp(createCliffLeft(false), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(bLeft, 'poke_cliff_brown_left.png');

  const bRight = await sharp(createCliffRight(false), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(bRight, 'poke_cliff_brown_right.png');

  const bTop = await sharp(createCliffTop(false), { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(bTop, 'poke_cliff_brown_top.png');

  const gFace = await sharp(createCliffFace(true), { raw: { width: 32, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(gFace, 'poke_cliff_gray_face.png');

  const gLeft = await sharp(createCliffLeft(true), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(gLeft, 'poke_cliff_gray_left.png');

  const gRight = await sharp(createCliffRight(true), { raw: { width: 16, height: 48, channels: 4 } }).png().toBuffer();
  await saveBoth(gRight, 'poke_cliff_gray_right.png');

  const gTop = await sharp(createCliffTop(true), { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
  await saveBoth(gTop, 'poke_cliff_gray_top.png');

  const ledge = await sharp(createLedgeJump(), { raw: { width: 32, height: 16, channels: 4 } }).png().toBuffer();
  await saveBoth(ledge, 'poke_ledge_jump.png');

  console.log('All 9 authentic Pokemon FireRed cliff tiles generated and synchronized!');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('generate_firered_cliffs.mjs')) {
  generateFireredCliffs().catch(console.error);
}
