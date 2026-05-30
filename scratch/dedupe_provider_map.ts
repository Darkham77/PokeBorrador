import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = 'c:/Users/Franco/Trabajos/Juegos/PokeBorrador';
const providerPath = join(projectRoot, 'src/logic/providers/pokemonDataProvider.ts');
let content = readFileSync(providerPath, 'utf-8');

// Parse LEGACY_MOVE_MAPPING block
const startIdx = content.indexOf('const LEGACY_MOVE_MAPPING: Record<string, string> = {');
const endIdx = content.indexOf('};', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const block = content.substring(startIdx, endIdx + 2);
  const lines = block.split('\n');
  const uniqueLines: string[] = [];
  const seenKeys = new Set<string>();
  
  lines.forEach((line) => {
    const match = /^\s*'([^']+)':\s*'([^']+)',?/g.exec(line);
    if (match) {
      const key = match[1]!;
      if (seenKeys.has(key)) {
        // Skip duplicate key
        return;
      }
      seenKeys.add(key);
    }
    uniqueLines.push(line);
  });
  
  const newBlock = uniqueLines.join('\n');
  content = content.replace(block, newBlock);
  writeFileSync(providerPath, content, 'utf-8');
  console.log('Deduplicated LEGACY_MOVE_MAPPING in pokemonDataProvider.ts successfully!');
} else {
  console.log('Could not find LEGACY_MOVE_MAPPING block!');
}
