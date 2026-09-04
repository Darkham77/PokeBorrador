import sharp from 'sharp';

async function inspect() {
  const meta = await sharp('scratch/map_lab/tilesets/lpc/dirt.png').metadata();
  console.log(`dirt.png dimensions: ${meta.width}x${meta.height}`);

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) {
      const buf = await sharp('scratch/map_lab/tilesets/lpc/dirt.png')
        .extract({ left: c * 32, top: r * 32, width: 32, height: 32 })
        .raw()
        .toBuffer();
      let transparent = 0;
      for (let i = 3; i < buf.length; i += 4) {
        if (buf[i] < 10) transparent++;
      }
      console.log(`row ${r} col ${c} (y=${r*32}, x=${c*32}): transparent=${transparent}/${32*32}`);
    }
  }
}

inspect();
