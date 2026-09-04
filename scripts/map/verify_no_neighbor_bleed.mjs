import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const dir = 'scratch/map_lab/extracted_31_buildings';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && !f.includes('_clean'));

console.log(`Checking ${files.length} buildings for internal gaps / neighbor bleed...`);

for (const f of files) {
  const filePath = path.join(dir, f);
  const { data, info } = await sharp(filePath)
    .raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Check row solid counts
  const rowCounts = [];
  for (let y = 0; y < h; y++) {
    let solid = 0;
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) solid++;
    }
    rowCounts.push(solid);
  }

  // Find if there is an empty gap inside (solid > 0, then solid == 0 for >= 2 rows, then solid > 0 again)
  let foundFirstSolid = false;
  let gapStart = -1;
  let hasBleed = false;

  for (let y = 0; y < h; y++) {
    if (rowCounts[y] > 0) {
      if (!foundFirstSolid) {
        foundFirstSolid = true;
      } else if (gapStart !== -1 && (y - gapStart) >= 2) {
        // We found a neighbor bleed after an empty gap!
        hasBleed = true;
        console.warn(`⚠️ BLEED DETECTED in [${f}]: Gap from row ${gapStart} to ${y - 1}. Trimming to height: ${gapStart}`);
        
        // Auto-trim to clean object
        const cleanPath = path.join(dir, f.replace('.png', '_clean.png'));
        await sharp(filePath)
          .extract({ left: 0, top: 0, width: w, height: gapStart })
          .toFile(cleanPath);
        break;
      }
      gapStart = -1;
    } else {
      if (foundFirstSolid && gapStart === -1) {
        gapStart = y;
      }
    }
  }

  if (!hasBleed) {
    console.log(`✅ [${f.padEnd(30)}] 100% clean & continuous (${w}x${h})`);
  }
}
