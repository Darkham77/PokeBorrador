import sharp from 'sharp';

async function run() {
  let svg = '<svg width="432" height="800" xmlns="http://www.w3.org/2000/svg">';
  for (let x = 0; x <= 432; x += 16) {
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="800" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`;
  }
  for (let y = 0; y <= 800; y += 16) {
    svg += `<line x1="0" y1="${y}" x2="432" y2="${y}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`;
  }
  for (let y = 0; y < 800; y += 64) {
    for (let x = 0; x < 432; x += 64) {
      svg += `<text x="${x + 2}" y="${y + 11}" fill="#ffff00" font-size="9" font-family="monospace" font-weight="bold">(${x},${y})</text>`;
    }
  }
  svg += '</svg>';

  await sharp('scratch/map_lab/tilesets/pokegba/houses.png')
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFile('scratch/map_lab/houses_grid.png');

  console.log('houses_grid.png generated successfully!');
}

run();
