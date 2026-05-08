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

async function getFilesToRepair(dir: string): Promise<string[]> {
  const files: string[] = [];
  const pattern = '**/*.{scss,css,vue}';
  
  for await (const entry of fs.glob(pattern, { cwd: dir, exclude: (p) => Array.from(IGNORE_DIRS).some(d => p.includes(d)) })) {
    files.push(path.resolve(dir, entry));
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
  const files = await getFilesToRepair(path.join(process.cwd(), 'src'));
  for (const file of files) {
    await repair(file);
  }
  console.log('\n✨ Reparación finalizada.');
}

main();
