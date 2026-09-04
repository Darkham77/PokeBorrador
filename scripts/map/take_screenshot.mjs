import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  const htmlPath = 'file://' + path.resolve('scratch/map_lab/kanto_world_studio.html').replace(/\\/g, '/');
  console.log('Loading:', htmlPath);
  await page.goto(htmlPath);
  
  // Wait for loading overlay to disappear
  await page.waitForSelector('#loading-overlay.opacity-0', { timeout: 15000 });
  await page.waitForTimeout(500); // Wait for canvas render

  const screenshotPath = path.resolve('scratch/map_lab/current_render.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);
  
  await browser.close();
}

capture().catch(err => {
  console.error('Error taking screenshot:', err);
  process.exit(1);
});
