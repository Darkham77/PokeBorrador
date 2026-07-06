/**
 * scripts/download_badges.ts
 * 
 * DOWNLOADS KANTO GYM BADGES FROM BULBAPEDIA ARCHIVES (Node.js 26+)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

// Permissions check (Node.js 26+)
if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Requirements read permissions. Run with --permission --allow-fs-read=.\n'));
  process.exit(1);
}

const DEST_DIR = path.resolve(process.cwd(), '_raw-assets', 'public', 'assets', 'sprites', 'badges');

const BADGES = [
  { id: 'pewter', name: 'Boulder_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/d/dd/Boulder_Badge.png' },
  { id: 'cerulean', name: 'Cascade_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/9/9c/Cascade_Badge.png' },
  { id: 'vermilion', name: 'Thunder_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/a/a6/Thunder_Badge.png' },
  { id: 'celadon', name: 'Rainbow_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/b/b5/Rainbow_Badge.png' },
  { id: 'fuchsia', name: 'Soul_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/7/7d/Soul_Badge.png' },
  { id: 'saffron', name: 'Marsh_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/6/6b/Marsh_Badge.png' },
  { id: 'cinnabar', name: 'Volcano_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/1/12/Volcano_Badge.png' },
  { id: 'viridian', name: 'Earth_Badge.png', url: 'https://archives.bulbagarden.net/media/upload/7/78/Earth_Badge.png' }
];

async function downloadFile(url: string, filepath: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://bulbapedia.bulbagarden.net/'
      }
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(arrayBuffer));
    console.log(styleText('green', `   ✅ Downloaded ${path.basename(filepath)}`));
  } catch (e: unknown) {
    console.error(styleText('red', `   ❌ Error downloading ${url}: ${(e as Error).message}`));
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🏆 KANTO GYM BADGES DOWNLOADER ---'));
  console.log(styleText('yellow', `Creating directory: ${DEST_DIR}`));
  await fs.mkdir(DEST_DIR, { recursive: true });

  const promises = BADGES.map(badge => {
    // Save as [id].png (e.g. pewter.png, cerulean.png)
    const filepath = path.join(DEST_DIR, `${badge.id}.png`);
    return downloadFile(badge.url, filepath);
  });

  await Promise.all(promises);
  console.log(styleText('bold', styleText('green', '\n✨ Badges download finished successfully! Now run conversion pipeline.\n')));
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${(err as Error).message}`));
  process.exit(1);
});
