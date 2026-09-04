import fs from 'fs';
import path from 'path';

async function exportMtMoonFocus() {
  console.log('🔍 Exporting high-resolution Mt. Moon / Route 3 focus crop...');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const studioPath = 'file://' + path.resolve('scratch/map_lab/kanto_world_studio.html').replace(/\\/g, '/');
  await page.goto(studioPath, { waitUntil: 'load' });
  await page.waitForFunction(() => window.isEngineReady === true, { timeout: 30000 });
  await page.waitForTimeout(500);

  // Extract Pewter City -> Route 3 -> Mt. Moon (crop from 4K canvas)
  const base64Png = await page.evaluate(() => {
    // Pewter: x~1400, y~1350; Mt Moon: x~2200, y~1350
    const cropX = 1200;
    const cropY = 700;
    const cropW = 1400;
    const cropH = 900;

    const exp = document.createElement('canvas');
    exp.width = cropW;
    exp.height = cropH;
    const ctx = exp.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const mgr = window.chunkManager;
    mgr.chunks.forEach(c => {
      if (c.baked) {
        // Draw relative to cropX, cropY
        ctx.drawImage(c.canvas, c.wx - cropX, c.wy - cropY);
      }
    });

    return exp.toDataURL('image/png');
  });

  const outFile = path.resolve('scratch/map_lab/test_mtmoon_focus.png');
  const base64Data = base64Png.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outFile, Buffer.from(base64Data, 'base64'));
  console.log(`✅ Saved focus crop to: ${outFile}`);

  await browser.close();
}

exportMtMoonFocus().catch(console.error);
