import sharp from 'sharp';
import path from 'path';

async function generateCrops() {
  const mapFile = path.resolve('scratch/map_lab/kanto_world_map_4k.png');
  const img = sharp(mapFile);
  const meta = await img.metadata();
  console.log('Master Map dimensions:', meta.width, 'x', meta.height);

  // 1. Overall scaled down map for macro inspection
  await sharp(mapFile)
    .resize(1024, 1170, { fit: 'fill' })
    .toFile('scratch/map_lab/overview_macro.png');
  console.log('Saved overview_macro.png');

  // Crops (1000x800 each):
  const crops = [
    { name: 'crop_pallet_route1.png',       left: 1000, top: 3000, width: 900, height: 800 },
    { name: 'crop_viridian_forest.png',     left: 900,  top: 1800, width: 900, height: 900 },
    { name: 'crop_pewter_mtmoon.png',       left: 900,  top: 900,  width: 1400, height: 800 },
    { name: 'crop_cerulean_nugget.png',     left: 2400, top: 900,  width: 1100, height: 900 },
    { name: 'crop_central_triangle.png',    left: 2000, top: 1900, width: 1400, height: 1100 }, // Celadon - Saffron - Vermilion
    { name: 'crop_lavender_route12.png',    left: 3100, top: 2000, width: 1000, height: 1000 },
    { name: 'crop_cycling_road.png',        left: 1500, top: 2600, width: 800,  height: 1200 },
    { name: 'crop_fuchsia_safari.png',      left: 2500, top: 3200, width: 1100, height: 900 },
    { name: 'crop_cinnabar_seafoam.png',    left: 900,  top: 3800, width: 1400, height: 1000 },
    { name: 'crop_indigo_victory.png',      left: 600,  top: 400,  width: 1000, height: 900 }
  ];

  for (const c of crops) {
    await sharp(mapFile)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .toFile(path.join('scratch/map_lab', c.name));
    console.log(`Saved ${c.name}`);
  }

  console.log('All crops generated!');
}

generateCrops().catch(console.error);
