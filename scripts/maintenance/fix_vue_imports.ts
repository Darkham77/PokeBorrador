// fallow-ignore-file security-sink
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const IGNORE = new Set(['node_modules', 'dist', '.git', 'backup_legacy_code', 'public']);
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...walkDir(full));
    else if (['.ts', '.vue'].includes(extname(full))) results.push(full);
  }
  return results;
}

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
let fixed = 0; // singleton-ok

for (const file of walkDir(root)) {
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
