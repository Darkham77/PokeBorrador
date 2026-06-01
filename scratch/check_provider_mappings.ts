import { MOVE_DATA } from '../src/data/moves.ts';

console.log("Checking if all resolved IDs from name mapping exist in MOVE_DATA...");

import { readFileSync } from 'node:fs';
const content = readFileSync('./src/logic/providers/pokemonDataProvider.ts', 'utf-8');
const mapMatch = content.match(/const LEGACY_MOVE_MAPPING: Record<string, string> = {([\s\S]*?)};/);
if (mapMatch) {
  const mapStr = mapMatch[1];
  const lines = mapStr.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    const match = trimmed.match(/'([^']+)':\s*'([^']+)'/);
    if (match) {
      const name = match[1];
      const id = match[2];
      if (!MOVE_DATA[id]) {
        console.warn(`WARNING: Mapped ID "${id}" for name "${name}" does not exist in MOVE_DATA.`);
      }
    }
  }
} else {
  console.error("Could not find LEGACY_MOVE_MAPPING");
}
