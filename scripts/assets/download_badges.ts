/**
 * scripts/download_badges.ts
 * 
 * DOWNLOADS KANTO GYM BADGES FROM BULBAPEDIA ARCHIVES (Node.js 26+)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

import { safeResolve, safeWriteFile, safeFetch } from '../lib/safePath.ts';

enableCompileCache();

const FAILURE_EXIT_CODE = 1;
const USER_AGENT_CHROME_VERSION = '120.0.0.0';

// Permissions check (Node.js 26+)
if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Requirements read permissions. Run with --permission --allow-fs-read=.\n'));
  process.exit(FAILURE_EXIT_CODE);
}

const DEST_DIR = safeResolve(process.cwd(), '_raw-assets/public/assets/sprites/badges');

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

async function downloadFile(rawUrl: string, filepath: string) {
  try {
    const safeTargetFile = safeResolve(filepath);

    const response = await safeFetch(rawUrl, {
      headers: {
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${USER_AGENT_CHROME_VERSION} Safari/537.36`, // no-magic
        'Referer': 'https://bulbapedia.bulbagarden.net/'
      }
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    await safeWriteFile(safeTargetFile, Buffer.from(arrayBuffer));
    console.log(styleText('green', `   ✅ Downloaded ${path.basename(safeTargetFile)}`));
  } catch (e: unknown) {
    console.error(styleText('red', `   ❌ Error downloading ${rawUrl}: ${(e as Error).message}`));
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🏆 KANTO GYM BADGES DOWNLOADER ---'));
  console.log(styleText('yellow', `Creating directory: ${DEST_DIR}`));
  await fs.mkdir(DEST_DIR, { recursive: true });

  const promises = BADGES.map(badge => {
    // Save as [id].png (e.g. pewter.png, cerulean.png)
    const filepath = safeResolve(DEST_DIR, `${badge.id}.png`);
    return downloadFile(badge.url, filepath);
  });

  await Promise.all(promises);
  console.log(styleText('bold', styleText('green', '\n✨ Badges download finished successfully! Now run conversion pipeline.\n')));
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${(err as Error).message}`));
  process.exit(FAILURE_EXIT_CODE);
});
