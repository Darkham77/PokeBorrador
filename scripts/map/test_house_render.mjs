import sharp from 'sharp';
import path from 'path';

const houseFile = path.resolve('scratch/map_lab/tilesets/lpc/house.png');

async function testHouse() {
  const wall = await sharp(houseFile).extract({ left: 0, top: 0, width: 96, height: 96 }).toBuffer();
  const door = await sharp(houseFile).extract({ left: 96, top: 0, width: 32, height: 64 }).toBuffer();
  const windowLeft = await sharp(houseFile).extract({ left: 224, top: 0, width: 28, height: 44 }).toBuffer();
  const windowRight = await sharp(houseFile).extract({ left: 224, top: 0, width: 28, height: 44 }).toBuffer();
  const chimney = await sharp(houseFile).extract({ left: 194, top: 12, width: 20, height: 50 }).toBuffer();
  const roof = await sharp(houseFile).extract({ left: 0, top: 96, width: 96, height: 64 }).toBuffer();

  await sharp({
    create: {
      width: 160,
      height: 200,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: chimney, left: 100, top: 10 },
    { input: roof, left: 32, top: 32 },
    { input: wall, left: 32, top: 80 },
    { input: door, left: 64, top: 112 },
    { input: windowLeft, left: 36, top: 96 }
  ])
  .png()
  .toFile(path.resolve('scratch/map_lab/test_house.png'));

  console.log('House assembled with roof!');
}
testHouse();
