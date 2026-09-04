import sharp from 'sharp';

async function test() {
  const { data, info } = await sharp('scratch/map_lab/tilesets/pokegba/decoration.png')
    .raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const T = 16;
  const cols = Math.floor(w / T);
  const rows = Math.floor(h / T);

  // 16x16 grid occupancy
  const occ = Array.from({ length: rows }, () => new Uint8Array(cols));
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      let count = 0;
      for (let dy = 0; dy < T; dy++) {
        for (let dx = 0; dx < T; dx++) {
          const px = tx * T + dx;
          const py = ty * T + dy;
          if (data[(py * w + px) * 4 + 3] > 20) count++;
        }
      }
      if (count > 25) occ[ty][tx] = 1;
    }
  }

  // Find connected components in the 16x16 grid
  const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
  const components = [];

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (!occ[ty][tx] || visited[ty][tx]) continue;
      let minTx = tx, maxTx = tx, minTy = ty, maxTy = ty;
      const q = [[tx, ty]];
      visited[ty][tx] = 1;

      while (q.length > 0) {
        const [cx, cy] = q.pop();
        if (cx < minTx) minTx = cx;
        if (cx > maxTx) maxTx = cx;
        if (cy < minTy) minTy = cy;
        if (cy > maxTy) maxTy = cy;

        for (const [nx, ny] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            if (occ[ny][nx] && !visited[ny][nx]) {
              visited[ny][nx] = 1;
              q.push([nx, ny]);
            }
          }
        }
      }

      components.push({
        tx: minTx, ty: minTy,
        w: (maxTx - minTx + 1) * T,
        h: (maxTy - minTy + 1) * T,
        tileW: maxTx - minTx + 1,
        tileH: maxTy - minTy + 1,
        px: minTx * T, py: minTy * T
      });
    }
  }

  console.log('16x16 Grid components found: ' + components.length);
  components.forEach((c, idx) => {
    console.log('[' + idx + '] x: ' + c.px + ', y: ' + c.py + ', w: ' + c.w + ', h: ' + c.h + ' (' + c.tileW + 'x' + c.tileH + ' tiles)');
  });
}

test();
