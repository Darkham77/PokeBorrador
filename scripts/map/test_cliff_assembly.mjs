import sharp from 'sharp';

async function testCliff() {
  const hills = 'scratch/map_lab/tilesets/pokegba/hills.png';

  // Brown Face: c1,r0 (16x16) + c2,r0 (16x16) at y=0
  //             c1,r2 (16x16) + c2,r2 (16x16) at y=16
  //             c1,r3 (16x16) + c2,r3 (16x16) at y=32
  // Total: 32x48 px
  const faceParts = [
    { input: await sharp(hills).extract({ left: 16, top: 0, width: 32, height: 16 }).toBuffer(), top: 0, left: 0 },
    { input: await sharp(hills).extract({ left: 16, top: 32, width: 32, height: 16 }).toBuffer(), top: 16, left: 0 },
    { input: await sharp(hills).extract({ left: 16, top: 48, width: 32, height: 16 }).toBuffer(), top: 32, left: 0 },
  ];
  const brownFace = await sharp({ create: { width: 32, height: 48, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } })
    .composite(faceParts).png().toBuffer();

  // Left Corner: c0,r0 (16x16) at y=0, c0,r2 at y=16, c0,r3 at y=32
  const leftParts = [
    { input: await sharp(hills).extract({ left: 0, top: 0, width: 16, height: 16 }).toBuffer(), top: 0, left: 0 },
    { input: await sharp(hills).extract({ left: 0, top: 32, width: 16, height: 16 }).toBuffer(), top: 16, left: 0 },
    { input: await sharp(hills).extract({ left: 0, top: 48, width: 16, height: 16 }).toBuffer(), top: 32, left: 0 },
  ];
  const brownLeft = await sharp({ create: { width: 16, height: 48, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } })
    .composite(leftParts).png().toBuffer();

  // Right Corner: c4,r0 (16x16) at y=0, c4,r2 at y=16, c4,r3 at y=32
  const rightParts = [
    { input: await sharp(hills).extract({ left: 64, top: 0, width: 16, height: 16 }).toBuffer(), top: 0, left: 0 },
    { input: await sharp(hills).extract({ left: 64, top: 32, width: 16, height: 16 }).toBuffer(), top: 16, left: 0 },
    { input: await sharp(hills).extract({ left: 64, top: 48, width: 16, height: 16 }).toBuffer(), top: 32, left: 0 },
  ];
  const brownRight = await sharp({ create: { width: 16, height: 48, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } })
    .composite(rightParts).png().toBuffer();

  // Now compose a wall: Left + 4x Face + Right
  // Width: 16 + 4*32 + 16 = 160 px, Height: 48 px
  const wall = await sharp({ create: { width: 160, height: 48, channels: 4, background: { r: 70, g: 200, b: 160, alpha: 1 } } })
    .composite([
      { input: brownLeft, top: 0, left: 0 },
      { input: brownFace, top: 0, left: 16 },
      { input: brownFace, top: 0, left: 48 },
      { input: brownFace, top: 0, left: 80 },
      { input: brownFace, top: 0, left: 112 },
      { input: brownRight, top: 0, left: 144 },
    ])
    .png()
    .toFile('scratch/map_lab/test_assembled_cliff.png');

  console.log('Saved scratch/map_lab/test_assembled_cliff.png');
}

testCliff();
