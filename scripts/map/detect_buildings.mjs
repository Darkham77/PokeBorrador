import sharp from 'sharp';
import fs from 'fs';

async function run() {
  const { data, info } = await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
    .raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  const visited = new Uint8Array(w * h);
  const boxes = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] || data[idx * 4 + 3] < 10) continue;

      let minX = x, maxX = x, minY = y, maxY = y;
      const q = [idx];
      visited[idx] = 1;

      while (q.length > 0) {
        const cur = q.pop();
        const cy = Math.floor(cur / w);
        const cx = cur % w;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = ny * w + nx;
            if (!visited[nidx] && data[nidx * 4 + 3] >= 10) {
              visited[nidx] = 1;
              q.push(nidx);
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (bw > 30 && bh > 30) {
        boxes.push({ minX, minY, maxX, maxY, w: bw, h: bh });
      }
    }
  }

  boxes.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  console.log('Found ' + boxes.length + ' buildings:');
  fs.mkdirSync('scratch/map_lab/extracted_buildings', { recursive: true });

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    console.log(`[${i}] x: ${b.minX}, y: ${b.minY}, w: ${b.w}, h: ${b.h}`);
    await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
      .extract({ left: b.minX, top: b.minY, width: b.w, height: b.h })
      .toFile(`scratch/map_lab/extracted_buildings/bldg_${i}_${b.w}x${b.h}.png`);
  }
}

run();
