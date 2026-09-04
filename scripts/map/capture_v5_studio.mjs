import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const studioPath = 'file://' + path.resolve('scratch/map_lab/kanto_world_studio.html').replace(/\\/g, '/');

  console.log('Loading Kanto World Studio v5.0...');
  await page.goto(studioPath, { waitUntil: 'load' });
  await page.waitForTimeout(1200); // wait for initial chunk bake

  // Helper to click location button
  const jumpTo = async (text) => {
    const btn = page.locator(`button:has-text("${text}")`);
    await btn.click();
    await page.waitForTimeout(300);
  };

  // 1. Pallet Town
  await jumpTo('Pueblo Paleta');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_pallet.png' });
  console.log('Captured studio_v5_pallet.png');

  // 2. Saffron City (Metropolis)
  await jumpTo('Cd. Azafrán');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_saffron.png' });
  console.log('Captured studio_v5_saffron.png');

  // 3. Celadon City & Rocket Balloon
  await page.evaluate(() => {
    cam.x = 2200;
    cam.y = 2300;
    cam.zoom = 1.2;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_celadon.png' });
  console.log('Captured studio_v5_celadon.png');

  // 4. Snorlax & Nugget Bridge
  await jumpTo('Puente Pepita');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_nugget_bridge.png' });
  console.log('Captured studio_v5_nugget_bridge.png');

  // 5. Mt. Moon (Cliffs and Caverns)
  await jumpTo('Mt. Moon');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_mtmoon.png' });
  console.log('Captured studio_v5_mtmoon.png');

  // 6. Viridian City & NW Pond
  await jumpTo('Ciudad Verde');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_viridian.png' });
  console.log('Captured studio_v5_viridian.png');

  // 7. Cinnabar Island (Volcano & Sea)
  await jumpTo('Isla Canela');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_cinnabar.png' });
  console.log('Captured studio_v5_cinnabar.png');

  // 8. Vermilion City (Harbor & Pier)
  await jumpTo('Cd. Carmín');
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_vermilion.png' });
  console.log('Captured studio_v5_vermilion.png');

  // 9. X-Ray Mode Active!
  await page.click('#btn-toggle-xray');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scratch/map_lab/studio_v5_xray.png' });
  console.log('Captured studio_v5_xray.png');

  await browser.close();
  console.log('All Studio v5 screenshots captured successfully!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
