import fs from 'node:fs';
import path from 'node:path';

// Define the pairs: Base -> Extreme
const EXTREME_PAIRS: Record<string, string> = {
  rain: 'storm',
  snow: 'blizzard',
  wind: 'strong_winds',
  sun: 'intense_sun',
  cold: 'coldwave',
  mist: 'fog',
  sandstorm: 'dust_storm'
};

const filePath = path.resolve('src/data/weather-tables.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Regex to extract the object content. 
// We look for everything inside ROUTE_WEATHER_TABLES = { ... };
const match = content.match(/export const ROUTE_WEATHER_TABLES:.*? = (\{[\s\S]*?\});/);

if (!match) {
  console.error('No se pudo encontrar ROUTE_WEATHER_TABLES en el archivo.');
  process.exit(1);
}

// Instead of parsing JSON (which fails due to TS syntax and non-quoted keys), 
// we will evaluate the object string in a safe-ish way or use a custom parser.
// Given the complexity, we'll use a functional approach: 
// we'll iterate through the lines and detect the weather blocks.

const lines = content.split('\n');
const newLines: string[] = [];

let inWeatherBlock = false;
let currentBlock: Record<string, number> = {};
let blockIndent = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect start of weather block: "morning": { "clear": 40, ... }
  const blockMatch = line.match(/^(\s+)"(morning|day|dusk|night)":\s*(\{.*\}),?$/);
  
  if (blockMatch) {
    const indent = blockMatch[1];
    const key = blockMatch[2];
    let objStr = blockMatch[3];
    
    // Convert "{ key: val }" to valid JSON if needed (though it's already mostly valid)
    // Actually, it's easier to just parse the key-value pairs manually
    const pairs = objStr.replace(/[\{\}]/g, '').split(',').map(p => p.trim());
    const weatherData: Record<string, number> = {};
    
    pairs.forEach(p => {
      const [w, v] = p.split(':').map(x => x.trim().replace(/"/g, ''));
      if (w && v) weatherData[w] = parseInt(v);
    });

    // Apply Transformation
    const transformed: Record<string, number> = { ...weatherData };
    
    for (const [base, extreme] of Object.entries(EXTREME_PAIRS)) {
      if (weatherData[base] && weatherData[base] > 0) {
        // Rule: 5% of base, minimum 1
        const delta = Math.max(1, Math.round(weatherData[base] * 0.05));
        
        // Ensure we don't go below 0 for base
        if (transformed[base] >= delta) {
          transformed[base] -= delta;
          transformed[extreme] = (transformed[extreme] || 0) + delta;
        }
      }
    }

    // Verify Sum
    const sum = Object.values(transformed).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
        // Adjustment to maintain 100% if rounding caused issues (though delta logic should be safe)
        const diff = 100 - sum;
        transformed['clear'] = (transformed['clear'] || 0) + diff;
    }

    // Reconstruct line
    const transformedStr = Object.entries(transformed)
      .map(([w, v]) => `"${w}": ${v}`)
      .join(', ');
    
    newLines.push(`${indent}"${key}": { ${transformedStr} }${line.endsWith(',') ? ',' : ''}`);
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('✅ Transformación de climas completada con éxito.');
