import fs from 'fs';
import path from 'path';
import { syncAssets } from './sync_assets_pipeline.mjs';

// Master 4K Map Exporter without browser canvas tainting restrictions
async function exportMap() {
  console.log('======================================================================');
  console.log('🗺️ POKÉ VICIO: MASTER FULL-RESOLUTION 4K MAP EXPORTER');
  console.log('======================================================================');
  const startTime = Date.now();

  // 1. Auto-synchronize assets if any source sheet changed
  await syncAssets();

  const outDir = path.resolve('scratch/map_lab');
  const outFile = path.join(outDir, 'kanto_world_map_4k.png');

  // We can render directly using Chromium via Playwright taking a full-size screenshot of the baked chunks
  // or by loading the studio and capturing the canvas
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const studioPath = 'file://' + path.resolve('scratch/map_lab/kanto_world_studio.html').replace(/\\/g, '/');
  console.log('Loading studio for 4K composite...');
  await page.goto(studioPath, { waitUntil: 'load' });
  await page.waitForFunction(() => window.isEngineReady === true, { timeout: 30000 });
  await page.waitForTimeout(500);

  // Render all chunks to 4K canvas and get dataURL
  console.log('Rendering 4K master canvas (4480x5120 px)...');
  const base64Png = await page.evaluate(() => {
    const exp = document.createElement('canvas');
    exp.width = window.WORLD_W_PX || 4480;
    exp.height = window.WORLD_H_PX || 5120;
    const ctx = exp.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw all baked chunks
    const mgr = window.chunkManager || window._chunkManager;
    if (!mgr || !mgr.chunks) {
      throw new Error('ChunkManager not available on window');
    }
    mgr.chunks.forEach(c => {
      if (c.baked) ctx.drawImage(c.canvas, c.wx, c.wy);
    });

    return exp.toDataURL('image/png');
  });

  if (base64Png && base64Png.startsWith('data:image/png;base64,')) {
    const base64Data = base64Png.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(outFile, Buffer.from(base64Data, 'base64'));
    console.log(`✅ 4K Ultra-HD Map saved successfully to: ${outFile}`);
  } else {
    throw new Error('Failed to generate 4K image data.');
  }

  await browser.close();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✨ EXPORT COMPLETED IN ${elapsed}s! File: scratch/map_lab/kanto_world_map_4k.png\n`);
}

exportMap().catch(console.error);
