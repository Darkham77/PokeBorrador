/**
 * scripts/fix_node_timers_imports.ts
 *
 * Removes spurious `import { setTimeout } from 'node:timers/promises'`
 * from frontend files (src/**) that were incorrectly injected by audit:fix.
 *
 * This import is ONLY valid in Node.js scripts context, never in browser code.
 * Frontend files should use the global `setTimeout` or import sleep from timeUtils.
 *
 * [PureVue-Ignore]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'backup_legacy_code', 'public', 'scripts']); // runtime-set: Fast O(1) membership lookup set

function walkDir(dir: string): string[] {
  const results: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...walkDir(full));
    else if (['.ts', '.vue'].includes(extname(full))) results.push(full);
  }
  return results;
}

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const srcDir = join(root, 'src');
const testsDir = join(root, 'tests');

let fixed = 0; // singleton-ok: Singleton instance state container

for (const dir of [srcDir, testsDir]) { // import-ok: Dynamic module import
  for (const file of walkDir(dir)) {
    const content = readFileSync(file, 'utf-8');
    // Remove the line with the bad import (including its newline)
    const updated = content.replace(/^import \{ setTimeout \} from ['"]node:timers\/promises['"];?\r?\n/gm, '');
    if (updated !== content) {
      writeFileSync(file, updated, 'utf-8');
      fixed++;
      console.log('Fixed:', file);
    }
  }
}

console.log(`\n✅ Removed spurious node:timers/promises imports from ${fixed} frontend files.`);
