import fs from 'node:fs';
import path from 'node:path';

interface ModuleMeta {
  id: string;
}

interface NodePart {
  metaUid: string;
  renderedLength: number;
  gzipLength: number;
  brotliLength?: number;
}

interface VisualizerData {
  nodeMetas: Record<string, ModuleMeta>;
  nodeParts: Record<string, NodePart>;
}

const STATS_FILE = path.resolve(process.cwd(), 'scratch/bundle_stats.html');
const DIST_DIR = path.resolve(process.cwd(), 'dist/assets');
const TABLE_SEPARATOR_WIDTH = 80;

function auditBundle(): void {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  PRODUCTION BUNDLE CHUNK & BOTTLENECK AUDITOR                               ║');
  console.log('║  Familia: ARCHITECTURE  |  ID: audit_bundle_chunks                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  if (!fs.existsSync(STATS_FILE) && !fs.existsSync(DIST_DIR)) {
    console.error('\x1b[31m❌ Error: No production build or bundle stats found.\x1b[0m');
    console.error('Please run \x1b[36mnpm run build:analyze\x1b[0m or \x1b[36mnpm run build\x1b[0m first.');
    process.exit(1);
  }

  let hasErrors = false;

  // 1. Analyze from bundle_stats.html if available
  if (fs.existsSync(STATS_FILE)) {
    const content = fs.readFileSync(STATS_FILE, 'utf8');
    const match = content.match(/window\.data\s*=\s*(\{.*?\});<\/script>/s) || content.match(/const\s+data\s*=\s*(\{.*?\});/s);
    
    if (match && match[1]) {
      const data: VisualizerData = JSON.parse(match[1]);
      const metaMap = new Map<string, ModuleMeta>();
      for (const [uid, meta] of Object.entries(data.nodeMetas)) {
        metaMap.set(uid, meta);
      }

      const moduleMap = new Map<string, { rendered: number; gzip: number; heavyChunkCount: number; count: number }>();
      for (const [, part] of Object.entries(data.nodeParts)) {
        const meta = metaMap.get(part.metaUid);
        if (!meta || part.renderedLength <= 0) continue;
        const existing = moduleMap.get(meta.id) || { rendered: 0, gzip: 0, heavyChunkCount: 0, count: 0 };
        existing.rendered += part.renderedLength;
        existing.gzip += part.gzipLength;
        existing.count += 1;
        if (part.renderedLength > 10 * 1024) {
          existing.heavyChunkCount += 1;
        }
        moduleMap.set(meta.id, existing);
      }

      const sortedModules = Array.from(moduleMap.entries())
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => b.rendered - a.rendered);

      console.log('\n📦 Top 15 Heaviest Source Modules in Bundle:');
      console.log('─'.repeat(TABLE_SEPARATOR_WIDTH));
      sortedModules.slice(0, 15).forEach((m, idx) => {
        const rKB = (m.rendered / 1024).toFixed(1) + ' KB';
        const gKB = (m.gzip / 1024).toFixed(1) + ' KB';
        const dupe = m.heavyChunkCount > 1 ? ` \x1b[33m[x${m.heavyChunkCount} chunks]\x1b[0m` : '';
        console.log(` ${(idx + 1).toString().padStart(2)}. ${rKB.padStart(10)} (gzip: ${gKB.padStart(9)}) | ${m.id}${dupe}`);
        if (m.heavyChunkCount > 1 && m.rendered > 500 * 1024) {
          console.error(`\x1b[31m  ⚠️ High-severity duplicate module in multiple chunks: ${m.id}\x1b[0m`);
          hasErrors = true;
        }
      });
      console.log('─'.repeat(TABLE_SEPARATOR_WIDTH));
    }
  }

  // 2. Analyze dist/assets chunks
  if (fs.existsSync(DIST_DIR)) {
    const files = fs.readdirSync(DIST_DIR);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.br') && !f.endsWith('.gz'));

    console.log('\n📊 Production JS Chunks Status:');
    console.log('─'.repeat(TABLE_SEPARATOR_WIDTH));

    interface ChunkBudget {
      name: string;
      matcher: (filename: string) => boolean;
      limit: number;
    }

    const BUDGETS: ChunkBudget[] = [
      {
        name: 'auth',
        matcher: (f) => f.startsWith('auth-'),
        limit: 150 * 1024,
      },
      {
        name: 'sqliteEngine',
        matcher: (f) => f.startsWith('sqliteEngine-'),
        limit: 500 * 1024,
      },
      {
        name: 'game-data-system',
        matcher: (f) => f.startsWith('game-data-system-'),
        limit: 1500 * 1024,
      },
      {
        name: 'vendor-smogon-calc',
        matcher: (f) => f.startsWith('vendor-smogon-calc-'),
        limit: 500 * 1024,
      },
      {
        name: 'game (main view route)',
        matcher: (f) => f.startsWith('game-') && !f.startsWith('game-data-'),
        limit: 500 * 1024,
      },
    ];

    for (const f of jsFiles) {
      const fullPath = path.join(DIST_DIR, f);
      const stat = fs.statSync(fullPath);
      const sizeKB = (stat.size / 1024).toFixed(1);

      let status = '\x1b[32m[ OK ]\x1b[0m';
      let note = '';
      let shouldDisplay = stat.size > 500 * 1024;

      for (const budget of BUDGETS) {
        if (budget.matcher(f)) {
          shouldDisplay = true;
          if (stat.size > budget.limit) {
            status = '\x1b[31m[FAIL]\x1b[0m';
            note = ` ⚠️ Exceeds budget ${(budget.limit / 1024).toFixed(0)} KB!`;
            hasErrors = true;
          } else {
            note = ` (Budget: ${(budget.limit / 1024).toFixed(0)} KB)`;
          }
        }
      }

      if (shouldDisplay || f.includes('auth') || f.includes('sqlite') || f.includes('migration') || f.includes('game-data') || f.includes('pkmn')) {
        console.log(`  ${status} ${sizeKB.padStart(8)} KB │ ${f}${note}`);
      }
    }
    console.log('─'.repeat(TABLE_SEPARATOR_WIDTH));
  }

  if (hasErrors) {
    console.error('\n\x1b[31m❌ Bundle audit failed: One or more chunks exceed architectural size limits.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m✨ Bundle audit passed: All critical chunk size gates satisfied.\x1b[0m\n');
    process.exit(0);
  }
}

auditBundle();
