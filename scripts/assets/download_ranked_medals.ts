/**
 * scripts/assets/download_ranked_medals.ts
 * 
 * DOWNLOADS OFFICIAL POKÉMON RANK MEDALS FROM BULBAPEDIA ARCHIVES (Node.js 26+)
 * Source: Pokémon Mystery Dungeon: Rescue Team DX official rank symbols (64x64 transparent PNG)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import sharp from 'sharp';

import { safeResolve, safeWriteFile, safeFetch } from '../lib/safePath.ts';

enableCompileCache();

const FAILURE_EXIT_CODE = 1;
const USER_AGENT_FIREFOX_HEADER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0';
const EXPECTED_ALPHA_CHANNELS = 4;

// Permissions check (Node.js 26+)
if (process.permission && (!process.permission.has('fs.read', process.cwd()) || !process.permission.has('fs.write', process.cwd()))) {
  console.error(styleText('red', '\n❌ Error: Requires read/write permissions. Run with --permission --allow-fs-read=. --allow-fs-write=.\n'));
  process.exit(FAILURE_EXIT_CODE);
}

const DEST_DIR = safeResolve(process.cwd(), '_raw-assets/public/assets/sprites/ranked_medals');

interface RankedMedalSource {
  readonly tier: string;
  readonly filename: string;
  readonly url: string;
}

const RANKED_MEDALS: readonly RankedMedalSource[] = [
  {
    tier: 'bronce',
    filename: 'bronce.png',
    url: 'https://archives.bulbagarden.net/media/upload/8/81/Bronze_Rank_RTDX.png'
  },
  {
    tier: 'plata',
    filename: 'plata.png',
    url: 'https://archives.bulbagarden.net/media/upload/5/57/Silver_Rank_RTDX.png'
  },
  {
    tier: 'oro',
    filename: 'oro.png',
    url: 'https://archives.bulbagarden.net/media/upload/2/28/Gold_Rank_RTDX.png'
  },
  {
    tier: 'platino',
    filename: 'platino.png',
    url: 'https://archives.bulbagarden.net/media/upload/e/e0/Platinum_Rank_RTDX.png'
  },
  {
    tier: 'diamante',
    filename: 'diamante.png',
    url: 'https://archives.bulbagarden.net/media/upload/f/fb/Diamond_Rank_RTDX.png'
  },
  {
    tier: 'maestro',
    filename: 'maestro.png',
    url: 'https://archives.bulbagarden.net/media/upload/9/95/Master_Rank_RTDX.png'
  }
];

async function downloadFile(rawUrl: string, filepath: string): Promise<boolean> {
  try {
    const safeTargetFile = safeResolve(filepath);

    const response = await safeFetch(rawUrl, {
      headers: {
        'User-Agent': USER_AGENT_FIREFOX_HEADER,
        'Referer': 'https://archives.bulbagarden.net/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate transparency and image integrity via sharp
    const metadata = await sharp(buffer).metadata();
    if (metadata.channels !== EXPECTED_ALPHA_CHANNELS || !metadata.hasAlpha) {
      console.warn(styleText('yellow', `   ⚠️ Warning: Image at ${rawUrl} might not contain an alpha transparency channel.`));
    }

    await safeWriteFile(safeTargetFile, buffer);
    console.log(styleText('green', `   ✅ Saved ${path.basename(safeTargetFile)} (${metadata.width}x${metadata.height}, ${buffer.byteLength} bytes)`));
    return true;
  } catch (e: unknown) {
    console.error(styleText('red', `   ❌ Error downloading ${rawUrl}: ${(e as Error).message}`));
    return false;
  }
}

async function main(): Promise<void> {
  console.log(styleText('bold', '\n--- 🏅 OFFICIAL RANKED MEDALS DOWNLOADER ---'));
  console.log(styleText('cyan', `Destination: ${DEST_DIR}\n`));
  await fs.mkdir(DEST_DIR, { recursive: true });

  let successCount = 0;
  for (const medal of RANKED_MEDALS) {
    const targetFile = safeResolve(DEST_DIR, medal.filename);
    console.log(styleText('blue', `📥 Downloading ${medal.tier.toUpperCase()} (${medal.filename})...`));
    const success = await downloadFile(medal.url, targetFile);
    if (success) {
      successCount++;
    }
  }

  console.log(styleText('bold', `\nDownloaded ${successCount}/${RANKED_MEDALS.length} official rank medals.`));
  if (successCount < RANKED_MEDALS.length) {
    process.exit(FAILURE_EXIT_CODE);
  }
}

main().catch((err: unknown) => {
  console.error(styleText('red', `Fatal error: ${(err as Error).message}`));
  process.exit(FAILURE_EXIT_CODE);
});
