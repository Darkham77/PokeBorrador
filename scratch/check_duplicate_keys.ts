import { readFileSync } from 'node:fs';

const content = readFileSync('./src/data/moves.ts', 'utf-8');
const lines = content.split('\n');
const keys: Record<string, number[]> = {};

lines.forEach((line, index) => {
  const match = line.match(/^\s*'([^']+)':/);
  if (match) {
    const key = match[1];
    if (!keys[key]) keys[key] = [];
    keys[key].push(index + 1);
  }
});

for (const [key, linesList] of Object.entries(keys)) {
  if (linesList.length > 1) {
    console.log(`Duplicate key "${key}" found on lines:`, linesList);
  }
}
