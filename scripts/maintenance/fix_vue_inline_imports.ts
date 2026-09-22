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

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRepositoryFiles } from '../lib/auditorBase.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcDir = path.join(root, 'src');
const TARGET_EXTENSIONS = new Set(['.ts', '.vue']); // runtime-set: Fast O(1) membership lookup set

let fixed = 0; // singleton-ok: Singleton instance state container

for (const file of collectRepositoryFiles(srcDir, root, [], TARGET_EXTENSIONS)) {
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
