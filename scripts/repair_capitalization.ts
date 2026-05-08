/**
 * scripts/repair_capitalization.ts
 * 
 * EMERGENCY REPAIR SCRIPT
 * 
 * Revierte la capitalización errónea de funciones SASS y transformaciones CSS.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist']);

async function walk(dir: string): Promise<string[]> {
  let files: string[] = [];
  const list = await fs.readdir(dir);
  for (const file of list) {
    if (IGNORE_DIRS.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(await walk(fullPath));
    } else if (file.endsWith('.scss') || file.endsWith('.vue') || file.endsWith('.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function repair(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');
  let original = content;

  // 1. Revertir color.Scale -> color.scale
  content = content.replace(/color\.Scale\(/g, 'color.scale(');

  // 2. Revertir transform:.*Scale -> transform:.*scale
  // Buscamos cualquier Scale que no esté precedido por "filter"
  content = content.replace(/(transform:\s*.*?)Scale\(/g, '$1scale(');

  // 3. Revertir Scale en animaciones (keyframes)
  // Generalmente están en líneas solas o con transform
  content = content.replace(/(\s+)Scale\(/g, '$1scale(');

  if (content !== original) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[FIXED] ${filePath}`);
  }
}

async function main() {
  const files = await walk(path.join(process.cwd(), 'src'));
  for (const file of files) {
    await repair(file);
  }
  console.log('\n✨ Reparación finalizada.');
}

main();
