import sharp from 'sharp';

async function main() {
  const left = 8 * 16;
  const top = 42 * 16;
  const W_tiles = 18;
  const H_tiles = 25;

  const cropped = await sharp('public/assets/raw/firered_leafgreen/firered_route_12.png')
    .extract({ left, top, width: W_tiles * 16, height: H_tiles * 16 })
    .toBuffer();

  let svg = `<svg width="${W_tiles * 32}" height="${H_tiles * 32}" xmlns="http://www.w3.org/2000/svg">`;
  for (let y = 0; y < H_tiles; y++) {
    for (let x = 0; x < W_tiles; x++) {
      const absX = 8 + x;
      const absY = 42 + y;
      svg += `<rect x="${x * 32}" y="${y * 32}" width="32" height="32" fill="none" stroke="rgba(255,0,0,0.5)" stroke-width="1"/>`;
      svg += `<text x="${x * 32 + 2}" y="${y * 32 + 10}" font-size="8" fill="yellow" font-family="monospace" font-weight="bold">${absX},${absY}</text>`;
    }
  }
  svg += `</svg>`;

  const base = await sharp(cropped)
    .resize(W_tiles * 32, H_tiles * 32, { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(base)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile('scratch/route12_annotated_grid.png');

  console.log('Annotated grid written to scratch/route12_annotated_grid.png');
}

main().catch(console.error);
