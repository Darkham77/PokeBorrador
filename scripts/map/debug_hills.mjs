import sharp from 'sharp';

async function run() {
  const hills = sharp('scratch/map_lab/tilesets/pokegba/hills.png');
  let svg = '<svg width="640" height="256" xmlns="http://www.w3.org/2000/svg">';
  for (let c = 0; c < 10; c++) {
    for (let r = 0; r < 4; r++) {
      const x = c * 64;
      const y = r * 64;
      svg += `<rect x="${x}" y="${y}" width="64" height="64" fill="none" stroke="red" stroke-width="1"/>`;
      svg += `<text x="${x + 4}" y="${y + 16}" fill="yellow" font-size="12" font-family="monospace">c${c},r${r}</text>`;
    }
  }
  svg += '</svg>';

  await hills
    .resize(640, 256, { kernel: 'nearest' })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFile('scratch/map_lab/hills_grid.png');
  console.log('Saved scratch/map_lab/hills_grid.png');
}

run();
