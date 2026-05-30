import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = 'c:/Users/Franco/Trabajos/Juegos/PokeBorrador';
const movesTsPath = join(projectRoot, 'src/data/moves.ts');
const content = readFileSync(movesTsPath, 'utf-8');

// We will parse the generated src/data/moves.ts, find duplicate keys, and print them
const lines = content.split('\n');
const keyMap: Record<string, string[]> = {};

lines.forEach((line) => {
  const match = /^\s*'([^']+)':\s*({[^}]+})/g.exec(line);
  if (match) {
    const key = match[1];
    const val = match[2];
    if (!keyMap[key]) {
      keyMap[key] = [];
    }
    keyMap[key].push(val);
  }
});

console.log('Duplicate Keys Analysis:');
for (const [key, vals] of Object.entries(keyMap)) {
  if (vals.length > 1) {
    console.log(`Key: "${key}" has ${vals.length} occurrences:`);
    vals.forEach((v, idx) => console.log(`  [${idx}]: ${v}`));
  }
}
