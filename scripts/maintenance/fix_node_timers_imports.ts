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

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRepositoryFiles } from '../lib/auditorBase.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcDir = path.join(root, 'src');
const testsDir = path.join(root, 'tests');
const TARGET_EXTENSIONS = new Set(['.ts', '.vue']); // runtime-set: Fast O(1) membership lookup set

let fixed = 0; // singleton-ok: Singleton instance state container

for (const dir of [srcDir, testsDir]) { // import-ok: Dynamic module import
  for (const file of collectRepositoryFiles(dir, root, [], TARGET_EXTENSIONS)) {
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
