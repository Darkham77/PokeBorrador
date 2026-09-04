import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  const htmlPath = 'file://' + path.resolve('scratch/map_lab/kanto_world_studio.html').replace(/\\/g, '/');
  await page.goto(htmlPath);
  await page.waitForSelector('#loading-overlay.opacity-0', { timeout: 15000 });
  await page.waitForTimeout(500);

  // 1. LOD 0 (Zoom 1.0x)
  await page.screenshot({ path: path.resolve('scratch/map_lab/lod0_closeup.png') });

  // 2. Set Zoom 0.45x (LOD 1)
  await page.evaluate(() => {
    // Zoom out by dispatching on canvas
    const c = document.getElementById('map-canvas');
    for (let i = 0; i < 5; i++) {
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, clientX: 700, clientY: 450 }));
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve('scratch/map_lab/lod1_overview.png') });

  // 3. Set Zoom 0.18x (LOD 2)
  await page.evaluate(() => {
    const c = document.getElementById('map-canvas');
    for (let i = 0; i < 15; i++) {
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, clientX: 700, clientY: 450 }));
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve('scratch/map_lab/lod2_continental.png') });

  console.log('Captures completed!');
  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
