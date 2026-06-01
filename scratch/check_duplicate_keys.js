import fs from 'node:fs';

const content = fs.readFileSync('./src/data/moves.ts', 'utf-8');
const lines = content.split(/\r?\n/);
const keys = {};

lines.forEach((line, index) => {
  const match = line.match(/'([^']+)':/);
  if (match) {
    const key = match[1];
    keys[key] = (keys[key] || 0) + 1;
  }
});

console.log("Matched keys count:", Object.keys(keys).length);
console.log("Duplicates:", Object.entries(keys).filter(e => e[1] > 1));
