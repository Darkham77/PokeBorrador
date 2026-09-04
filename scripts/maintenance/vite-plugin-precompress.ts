/**
 * scripts/maintenance/vite-plugin-precompress.ts
 * 
 * Vite build plugin for zero-dependency static pre-compression using native Node.js zlib.
 * Generates .br (Brotli max level 11) and .gz (Gzip max level 9) assets in dist/
 * so production web servers / CDNs can serve compressed files instantly without on-the-fly CPU load.
 * Displays a consolidated Box-Drawing compression breakdown in console upon build completion.
 */
import type { Plugin } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import util from 'node:util';

const COMPRESSIBLE_EXTENSIONS = [
  '.js',
  '.css',
  '.html',
  '.wasm',
  '.svg',
  '.json',
  '.ico',
  '.txt',
  '.webmanifest'
] as const;
type CompressibleExtension = (typeof COMPRESSIBLE_EXTENSIONS)[number];

function isCompressibleExtension(ext: string): ext is CompressibleExtension {
  return (COMPRESSIBLE_EXTENSIONS as readonly string[]).includes(ext); // domain-ok: Open dynamic text or non-domain string payload
}

const MIN_SIZE_TO_COMPRESS_BYTES = 512;
const BYTES_IN_KB = 1024;
const BYTES_IN_MB = 1024 * 1024;
const PWA_WARN_THRESHOLD_BYTES = 5 * BYTES_IN_MB;

type AssetCategory = 'Worker' | 'WASM' | 'App Shell' | 'Vendor' | 'Game Data' | 'UI / View' | 'Asset';

interface AssetCompressionStat {
  relPath: string;
  category: AssetCategory;
  origBytes: number;
  gzipBytes: number;
  brotliBytes: number;
  savingsPercent: number;
}

function detectCategory(relPath: string): AssetCategory {
  const norm = relPath.replace(/\\/g, '/');
  if (norm.includes('.worker') || norm.includes('worker-')) return 'Worker';
  if (norm.endsWith('.wasm')) return 'WASM';
  if (norm.includes('vendor-')) return 'Vendor';
  if (norm.includes('game-data-')) return 'Game Data';
  if (norm.includes('index-') || norm === 'index.html' || norm.includes('manifest')) return 'App Shell';
  if (norm.includes('View-') || norm.includes('Modal-') || norm.endsWith('.css')) return 'UI / View';
  return 'Asset';
}

function formatBytes(bytes: number): string {
  if (bytes >= BYTES_IN_MB) {
    return `${(bytes / BYTES_IN_MB).toFixed(2)} MB`;
  }
  return `${(bytes / BYTES_IN_KB).toFixed(2)} kB`;
}

function padRight(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length - 1) + '…';
  return str + ' '.repeat(length - str.length);
}

function padLeft(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return ' '.repeat(length - str.length) + str;
}

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

function printReportTable(stats: AssetCompressionStat[], totalOrig: number, totalGz: number, totalBr: number): void {
  const TABLE_WIDTH = 94;
  const colAsset = 40;
  const colCat = 12;
  const colOrig = 11;
  const colGz = 11;
  const colBr = 11;
  const colSav = 7;

  console.log('\n' + '╔' + '═'.repeat(TABLE_WIDTH) + '╗');
  console.log('║  ⚡ POKÉ VICIO — PRE-COMPRESSION & ASSET SUMMARY (Brotli Q11 & Gzip L9)'.padEnd(TABLE_WIDTH + 1) + '║');
  console.log('╠' + '═'.repeat(TABLE_WIDTH) + '╣');

  const header = `║ ${padRight('Asset / Chunk', colAsset)} │ ${padRight('Category', colCat)} │ ${padLeft('Original', colOrig)} │ ${padLeft('Gzip L9', colGz)} │ ${padLeft('Brotli Q11', colBr)} │ ${padLeft('Saved', colSav)} ║`;
  console.log(header);
  console.log('╟' + '─'.repeat(TABLE_WIDTH) + '╢');

  // Sort stats: Workers and WASM first, then by original size descending
  const sorted = [...stats].sort((a, b) => {
    if (a.category === 'Worker' && b.category !== 'Worker') return -1;
    if (b.category === 'Worker' && a.category !== 'Worker') return 1;
    if (a.category === 'WASM' && b.category !== 'WASM') return -1;
    if (b.category === 'WASM' && a.category !== 'WASM') return 1;
    return b.origBytes - a.origBytes;
  });

  // Display top key chunks (all workers, wasm, app shell, vendor, and top assets up to 30 items)
  const displayItems = sorted.slice(0, 30);

  for (const item of displayItems) {
    const warnFlag = item.origBytes >= PWA_WARN_THRESHOLD_BYTES ? ' ⚠️' : '';
    const name = padRight(item.relPath + warnFlag, colAsset);
    const cat = padRight(item.category, colCat);
    const orig = padLeft(formatBytes(item.origBytes), colOrig);
    const gz = padLeft(formatBytes(item.gzipBytes), colGz);
    const br = padLeft(formatBytes(item.brotliBytes), colBr);
    const sav = padLeft(`-${item.savingsPercent.toFixed(0)}%`, colSav);

    console.log(`║ ${name} │ ${cat} │ ${orig} │ ${gz} │ ${br} │ ${sav} ║`);
  }

  if (sorted.length > displayItems.length) {
    const remainingCount = sorted.length - displayItems.length;
    const remainingOrig = sorted.slice(30).reduce((acc, curr) => acc + curr.origBytes, 0);
    const remainingGz = sorted.slice(30).reduce((acc, curr) => acc + curr.gzipBytes, 0);
    const remainingBr = sorted.slice(30).reduce((acc, curr) => acc + curr.brotliBytes, 0);
    const remSavings = (((remainingOrig - remainingBr) / (remainingOrig || 1)) * 100).toFixed(0);

    console.log(`║ ${padRight(`... and ${remainingCount} other assets`, colAsset)} │ ${padRight('Various', colCat)} │ ${padLeft(formatBytes(remainingOrig), colOrig)} │ ${padLeft(formatBytes(remainingGz), colGz)} │ ${padLeft(formatBytes(remainingBr), colBr)} │ ${padLeft(`-${remSavings}%`, colSav)} ║`);
  }

  console.log('╠' + '═'.repeat(TABLE_WIDTH) + '╣');
  const globalSavings = (((totalOrig - totalBr) / (totalOrig || 1)) * 100).toFixed(1);
  const totalLine = `║ ${padRight(`TOTAL (${stats.length} files precompressed)`, colAsset + colCat + 3)} │ ${padLeft(formatBytes(totalOrig), colOrig)} │ ${padLeft(formatBytes(totalGz), colGz)} │ ${padLeft(formatBytes(totalBr), colBr)} │ ${padLeft(`-${globalSavings}%`, colSav)} ║`;
  console.log(totalLine);
  console.log('╚' + '═'.repeat(TABLE_WIDTH) + '╝\n');
}

const asyncBrotliCompress = util.promisify(zlib.brotliCompress);
const asyncGzip = util.promisify(zlib.gzip);
const CONCURRENCY_LIMIT = 8;

async function mapConcurrent<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      if (item === undefined) break;
      const res = await fn(item);
      results[i] = res;
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
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
      const compressibleFiles = files.filter(filePath => {
        const ext = path.extname(filePath).toLowerCase();
        if (!isCompressibleExtension(ext)) return false;
        if (filePath.endsWith('.gz') || filePath.endsWith('.br')) return false;
        return true;
      });

      const statsResults = await mapConcurrent(compressibleFiles, CONCURRENCY_LIMIT, async (filePath) => {
        try {
          const content = await fs.readFile(filePath);
          if (content.byteLength < MIN_SIZE_TO_COMPRESS_BYTES) return null;

          // 1. Brotli (Level 11) - multithreaded libuv async
          const brotliBuffer = await asyncBrotliCompress(content, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 11
            }
          });
          await fs.writeFile(`${filePath}.br`, brotliBuffer);

          // 2. Gzip (Level 9) - multithreaded libuv async
          const gzipBuffer = await asyncGzip(content, {
            level: 9
          });
          await fs.writeFile(`${filePath}.gz`, gzipBuffer);

          const relPath = path.relative(distDir, filePath).replace(/\\/g, '/');
          const category = detectCategory(relPath);
          const savings = ((content.byteLength - brotliBuffer.byteLength) / content.byteLength) * 100;

          const stat: AssetCompressionStat = {
            relPath,
            category,
            origBytes: content.byteLength,
            gzipBytes: gzipBuffer.byteLength,
            brotliBytes: brotliBuffer.byteLength,
            savingsPercent: savings
          };
          return stat;
        } catch (err) {
          console.warn(`[precompress] Failed to compress ${path.basename(filePath)}:`, (err as Error).message);
          return null;
        }
      });

      const stats = statsResults.filter((s): s is AssetCompressionStat => s !== null);

      if (stats.length > 0) {
        let totalOriginalBytes = 0;
        let totalGzipBytes = 0;
        let totalBrotliBytes = 0;

        for (const s of stats) {
          totalOriginalBytes += s.origBytes;
          totalGzipBytes += s.gzipBytes;
          totalBrotliBytes += s.brotliBytes;
        }

        printReportTable(stats, totalOriginalBytes, totalGzipBytes, totalBrotliBytes);
      }
    }
  };
}
