import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRepositoryFiles } from '../lib/auditorBase.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET_EXTENSIONS = new Set(['.ts', '.vue']); // runtime-set: Fast O(1) membership lookup set
let fixed = 0; // singleton-ok: Singleton instance state container

for (const file of collectRepositoryFiles(root, root, [], TARGET_EXTENSIONS)) {
  const content = readFileSync(file, 'utf-8');
  // Remove .ts suffix from .vue imports: './Foo.vue' → './Foo.vue'
  const updated = content.replace(/(['"])(\.\.?\/[^'"]*\.vue)\.ts(['"])/g, '$1$2$3');
  if (updated !== content) {
    writeFileSync(file, updated, 'utf-8');
    fixed++;
    console.log('Fixed:', file);
  }
}

console.log(`\n✅ Reverted .vue.ts → .vue in ${fixed} files.`);
