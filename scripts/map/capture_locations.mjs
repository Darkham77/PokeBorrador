import { chromium } from 'playwright';
import path from 'path';

async function captureLocations() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  const htmlPath = 'file://' + path.resolve('scratch/map_lab/kanto_world_studio.html').replace(/\\/g, '/');
  console.log('Loading studio from:', htmlPath);
  await page.goto(htmlPath, { waitUntil: 'domcontentloaded' });
  
  // Wait for loading overlay to disappear
  await page.waitForSelector('#loading-overlay.opacity-0', { timeout: 15000 });
  await page.waitForTimeout(600);

  const locs = [
    { name: 'pallet',      text: 'Pueblo Paleta' },
    { name: 'viridian',    text: 'Ciudad Verde' },
    { name: 'mtmoon',      text: 'Mt. Moon' },
    { name: 'cerulean',    text: 'Cd. Celeste' },
    { name: 'nuggetbridge',text: 'Puente Pepita' },
    { name: 'vermilion',   text: 'Cd. Carmín' },
    { name: 'saffron',     text: 'Cd. Azafrán' },
    { name: 'lavender',    text: 'P. Lavanda' },
    { name: 'cinnabar',    text: 'Isla Canela' },
  ];

  for (const loc of locs) {
    const btn = page.locator(`.loc-btn:has-text("${loc.text}")`);
    if (await btn.count() > 0) {
      await btn.first().click();
      await page.waitForTimeout(400);
      const outPath = path.resolve(`scratch/map_lab/view_v35_${loc.name}.png`);
      await page.screenshot({ path: outPath });
      console.log(`Captured [${loc.text}] -> ${outPath}`);
    } else {
      console.warn(`Button for [${loc.text}] not found!`);
    }
  }

  // Capture Snorlax on Route 12
  await page.evaluate(() => {
    if (window._cam) {
      window._cam.x = 1500 * 2.5;
      window._cam.y = 1060 * 2.5;
      window._cam.zoom = 1.0;
    }
  });
  await page.waitForTimeout(400);
  const snorlaxPath = path.resolve('scratch/map_lab/view_v35_snorlax.png');
  await page.screenshot({ path: snorlaxPath });
  console.log(`Captured [Snorlax on Route 12] -> ${snorlaxPath}`);

  // Capture Full World Macro Overview (LOD 1 / 2)
  await page.evaluate(() => {
    if (window._cam) {
      window._cam.x = 2240;
      window._cam.y = 2560;
      window._cam.zoom = 0.22;
      document.getElementById('zoom-indicator').innerText = 'Zoom: 22%';
      document.getElementById('info-zoom').innerText = '0.22x';
    }
  });
  await page.waitForTimeout(500);
  const overviewPath = path.resolve('scratch/map_lab/view_v35_world_overview.png');
  await page.screenshot({ path: overviewPath });
  console.log(`Captured [World Overview] -> ${overviewPath}`);

  await browser.close();
  console.log('All visual verification captures complete!');
}

captureLocations().catch(err => {
  console.error(err);
  process.exit(1);
});
