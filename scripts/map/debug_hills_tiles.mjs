import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function sliceHills() {
  const outDir = 'scratch/map_lab/debug_hills';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      await sharp('scratch/map_lab/tilesets/pokegba/hills.png')
        .extract({ left: c * 16, top: r * 16, width: 16, height: 16 })
        .resize(64, 64, { kernel: 'nearest' })
        .toFile(path.join(outDir, 'tile_r' + r + '_c' + c + '.png'));
    }
  }

  const overlays = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      overlays.push({
        input: path.join(outDir, 'tile_r' + r + '_c' + c + '.png'),
        top: r * 64,
        left: c * 64
      });
    }
  }

  await sharp({
    create: {
      width: 10 * 64,
      height: 4 * 64,
      channels: 4,
      background: { r: 30, g: 30, b: 40, alpha: 1 }
    }
  }).composite(overlays).toFile('scratch/map_lab/debug_hills_grid.png');

  console.log('Saved debug_hills_grid.png');
}

sliceHills().catch(console.error);
