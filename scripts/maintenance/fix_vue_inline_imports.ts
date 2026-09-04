/**
 * scripts/fix_vue_inline_imports.ts
 *
 * Removes spurious `import { setTimeout } from 'node:timers/promises'`
 * that was injected INLINE into `<script setup lang="ts">` tags.
 * 
 * Pattern to fix:
 *   <script setup lang="ts">import { setTimeout } from 'node:timers/promises';
 *   
 * Expected result:
 *   <script setup lang="ts">
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

let fixed = 0; // singleton-ok: Singleton instance state container

for (const file of walkDir(srcDir)) {
  const content = readFileSync(file, 'utf-8');

  // Pattern 1: <script setup lang="ts">import { setTimeout } from 'node:timers/promises';
  // Replace with: <script setup lang="ts">
  let updated = content.replace(
    /(<script[^>]*>)import \{ setTimeout \} from ['"]node:timers\/promises['"];?\r?\n/g,
    '$1\n'
  );
  
  // Pattern 2: standalone line inside vue files (fallback)
  updated = updated.replace(
    /^import \{ setTimeout \} from ['"]node:timers\/promises['"];?\r?\n/gm,
    ''
  );

  if (updated !== content) {
    writeFileSync(file, updated, 'utf-8');
    fixed++;
    console.log('Fixed:', file);
  }
}

console.log(`\n✅ Cleaned inline node:timers/promises from ${fixed} Vue/TS files.`);
