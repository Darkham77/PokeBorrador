import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const { data, info } = await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
  .raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

function isSolid(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  return data[(y * W + x) * 4 + 3] > 20;
}

// Column bands in GBA sheets (16px grid alignment)
const colBands = [
  { name: 'Col 0 (left)',      minX: 0,   maxX: 80 },
  { name: 'Col 1 (mid-left)',  minX: 64,  maxX: 160 },
  { name: 'Col 2 (center)',    minX: 144, maxX: 240 },
  { name: 'Col 3 (mid-right)', minX: 224, maxX: 320 },
  { name: 'Col 4 (right)',     minX: 304, maxX: 432 }
];

console.log('--- SCANNING ENTIRE HOUSES.PNG WITH COLUMN-BAND GAP SEGMENTATION ---');

const detectedSprites = [];
const outDir = 'scratch/map_lab/extracted_perfect_all';
fs.mkdirSync(outDir, { recursive: true });

for (const col of colBands) {
  // Compute solid counts per row in this column
  const rowCounts = [];
  for (let y = 0; y < H; y++) {
    let solid = 0;
    for (let x = col.minX; x < col.maxX; x++) {
      if (isSolid(x, y)) solid++;
    }
    rowCounts.push(solid);
  }

  // Find continuous spans of solid rows separated by >= 2 empty rows
  let spanStart = -1;
  let emptyCount = 0;

  for (let y = 0; y < H; y++) {
    if (rowCounts[y] > 0) {
      if (spanStart === -1) {
        spanStart = y;
      }
      emptyCount = 0;
    } else {
      if (spanStart !== -1) {
        emptyCount++;
        if (emptyCount >= 2) {
          const spanEnd = y - emptyCount;
          const spanHeight = spanEnd - spanStart + 1;
          if (spanHeight >= 20) { // filter out 1-line noise
            // Find tight X bounds
            let minX = col.maxX, maxX = col.minX;
            for (let sy = spanStart; sy <= spanEnd; sy++) {
              for (let sx = col.minX; sx < col.maxX; sx++) {
                if (isSolid(sx, sy)) {
                  if (sx < minX) minX = sx;
                  if (sx > maxX) maxX = sx;
                }
              }
            }

            detectedSprites.push({
              col: col.name,
              x: minX,
              y: spanStart,
              w: maxX - minX + 1,
              h: spanHeight
            });
          }
          spanStart = -1;
          emptyCount = 0;
        }
      }
    }
  }

  // Last span if any
  if (spanStart !== -1) {
    const spanEnd = H - 1 - emptyCount;
    const spanHeight = spanEnd - spanStart + 1;
    if (spanHeight >= 20) {
      let minX = col.maxX, maxX = col.minX;
      for (let sy = spanStart; sy <= spanEnd; sy++) {
        for (let sx = col.minX; sx < col.maxX; sx++) {
          if (isSolid(sx, sy)) {
            if (sx < minX) minX = sx;
            if (sx > maxX) maxX = sx;
          }
        }
      }
      detectedSprites.push({
        col: col.name,
        x: minX,
        y: spanStart,
        w: maxX - minX + 1,
        h: spanHeight
      });
    }
  }
}

// Remove duplicates (when a wide building spanned across 2 columns)
const unique = [];
for (const s of detectedSprites) {
  const isDupe = unique.some(u => {
    // Overlapping bounding box
    const xOverlap = Math.max(0, Math.min(u.x + u.w, s.x + s.w) - Math.max(u.x, s.x));
    const yOverlap = Math.max(0, Math.min(u.y + u.h, s.y + s.h) - Math.max(u.y, s.y));
    const overlapArea = xOverlap * yOverlap;
    const minArea = Math.min(u.w * u.h, s.w * s.h);
    return (overlapArea / minArea) > 0.6;
  });

  if (!isDupe) {
    unique.push(s);
  } else {
    // Merge if wider
    const existing = unique.find(u => {
      const xOverlap = Math.max(0, Math.min(u.x + u.w, s.x + s.w) - Math.max(u.x, s.x));
      const yOverlap = Math.max(0, Math.min(u.y + u.h, s.y + s.h) - Math.max(u.y, s.y));
      return (xOverlap * yOverlap) / Math.min(u.w * u.h, s.w * s.h) > 0.6;
    });
    if (existing) {
      const newMinX = Math.min(existing.x, s.x);
      const newMaxX = Math.max(existing.x + existing.w, s.x + s.w);
      const newMinY = Math.min(existing.y, s.y);
      const newMaxY = Math.max(existing.y + existing.h, s.y + s.h);
      existing.x = newMinX;
      existing.y = newMinY;
      existing.w = newMaxX - newMinX;
      existing.h = newMaxY - newMinY;
    }
  }
}

unique.sort((a, b) => a.y - b.y || a.x - b.x);

console.log(`Discovered ${unique.length} unique, complete sprites without any hardcoded windows!`);
for (let i = 0; i < unique.length; i++) {
  const s = unique[i];
  console.log(`[#${String(i).padStart(2, '0')}] x: ${String(s.x).padStart(3)}, y: ${String(s.y).padStart(3)}, w: ${String(s.w).padStart(3)}, h: ${String(s.h).padStart(3)}`);
  await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
    .extract({ left: s.x, top: s.y, width: s.w, height: s.h })
    .toFile(path.join(outDir, `sprite_${String(i).padStart(2, '0')}_${s.w}x${s.h}.png`));
}
