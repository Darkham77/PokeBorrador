/**
 * scripts/maintenance/vite-plugin-precompress.ts
 * 
 * Vite build plugin for zero-dependency static pre-compression using native Node.js zlib.
 * Generates .br (Brotli max level 11) and .gz (Gzip max level 9) assets in dist/
 * so production web servers / CDNs can serve compressed files instantly without on-the-fly CPU load.
 */
import type { Plugin } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const COMPRESSIBLE_EXTENSIONS = [
  '.js',
  '.css',
  '.html',
  '.wasm',
  '.svg',
  '.json',
  '.ico',
  '.txt'
] as const;
type CompressibleExtension = (typeof COMPRESSIBLE_EXTENSIONS)[number];

function isCompressibleExtension(ext: string): ext is CompressibleExtension {
  return (COMPRESSIBLE_EXTENSIONS as readonly string[]).includes(ext); // domain-ok
}

const MIN_SIZE_TO_COMPRESS_BYTES = 512;

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await getAllFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export function staticPrecompressPlugin(): Plugin {
  return {
    name: 'vite-plugin-static-precompress',
    apply: 'build',
    async closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      try {
        await fs.access(distDir);
      } catch {
        return;
      }

      const files = await getAllFiles(distDir);
      let compressedCount = 0;
      let totalOriginalBytes = 0;
      let totalBrotliBytes = 0;

      for (const filePath of files) {
        const ext = path.extname(filePath).toLowerCase();
        if (!isCompressibleExtension(ext)) continue;
        if (filePath.endsWith('.gz') || filePath.endsWith('.br')) continue;

        try {
          const content = await fs.readFile(filePath);
          if (content.byteLength < MIN_SIZE_TO_COMPRESS_BYTES) continue;

          totalOriginalBytes += content.byteLength;

          // 1. Brotli (Level 11)
          const brotliBuffer = zlib.brotliCompressSync(content, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 11
            }
          });
          await fs.writeFile(`${filePath}.br`, brotliBuffer);
          totalBrotliBytes += brotliBuffer.byteLength;

          // 2. Gzip (Level 9)
          const gzipBuffer = zlib.gzipSync(content, {
            level: 9
          });
          await fs.writeFile(`${filePath}.gz`, gzipBuffer);

          compressedCount++;
        } catch (err) {
          console.warn(`[precompress] Failed to compress ${path.basename(filePath)}:`, (err as Error).message);
        }
      }

      if (compressedCount > 0) {
        const origKb = (totalOriginalBytes / 1024).toFixed(1);
        const brKb = (totalBrotliBytes / 1024).toFixed(1);
        const savingsPercent = (((totalOriginalBytes - totalBrotliBytes) / totalOriginalBytes) * 100).toFixed(1);
        console.log(`⚡ [Precompress] ${compressedCount} archivos precomprimidos con Brotli & Gzip (${origKb} kB -> ${brKb} kB Brotli, -${savingsPercent}%).`);
      }
    }
  };
}
