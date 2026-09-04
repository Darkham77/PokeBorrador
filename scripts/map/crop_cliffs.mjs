import sharp from 'sharp';

async function cropCliffs() {
  // Let's inspect the dimensions of ref_mtmoon_pewter.png
  const meta = await sharp('scratch/map_lab/ref_mtmoon_pewter.png').metadata();
  console.log('ref_mtmoon_pewter dimensions:', meta.width, meta.height);
  
  // Mt Moon cliffs are on the right half of ref_mtmoon_pewter.png
  await sharp('scratch/map_lab/ref_mtmoon_pewter.png')
    .extract({ left: Math.floor(meta.width * 0.45), top: Math.floor(meta.height * 0.35), width: 120, height: 80 })
    .resize(360, 240, { kernel: 'nearest' })
    .toFile('scratch/map_lab/sample_firered_cliff.png');
    
  console.log('Saved scratch/map_lab/sample_firered_cliff.png');
}

cropCliffs();
