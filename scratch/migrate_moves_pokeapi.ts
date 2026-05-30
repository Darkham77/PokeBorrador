import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = 'c:/Users/Franco/Trabajos/Juegos/PokeBorrador';

// Load PokeAPI moves cache
const cachePath = join(projectRoot, 'scripts/.cache/pokeapi_move_cache.json');
const cacheRaw = readFileSync(cachePath, 'utf-8');
const apiMoves = JSON.parse(cacheRaw);

// Map Spanish Name -> English ID (normalized to snake_case)
const esToEnId: Record<string, string> = {};
for (const move of apiMoves) {
  const enId = move.name.replace(/-/g, '_').toLowerCase(); // e.g. solar-beam -> solar_beam
  
  // Find Spanish name
  const esEntry = move.names.find((n: any) => n.language.name === 'es');
  if (esEntry) {
    esToEnId[esEntry.name.toLowerCase().trim()] = enId;
  }
}

// Add manual translations for custom moves or entries not covered
const manualOverrides: Record<string, string> = {
  'placaje': 'tackle',
  'ataque': 'tackle',
  'bofetón lodo': 'mud_slap',
  'puño lodo': 'mud_punch',
  'portazo': 'slam',
  'atizar': 'slam',
  'destructor': 'pound',
  'puñetazo': 'pound',
  'picotazo': 'peck',
  'picoteo': 'peck', // peck or pluck
  'golpe cabeza': 'headbutt',
  'cabezazo': 'headbutt',
  'persecución': 'pursuit',
  'seguimiento': 'pursuit',
  'rodar': 'rollout',
  'desenrrollar': 'rollout',
  'cola': 'tail_whip',
  'látigo': 'tail_whip',
  'psicocontrol': 'psicocontrol',
  'más psique': 'psych_up',
  'zap cannon': 'zap_cannon',
  'electrocañón': 'zap_cannon',
  'electrorrayo': 'electrorrayo',
  'chispa': 'spark',
  'envolver': 'wrap',
  'constricción': 'constrict',
  'bola lodo': 'sludge_bomb',
  'danza dragón': 'dragon_dance',
  'llantopanto': 'fake_tears',
  'onda sónica': 'sonic_boom',
  'chupa-vidas': 'leech_life'
};

function resolveToPokeApiId(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (manualOverrides[normalized]) return manualOverrides[normalized];
  if (esToEnId[normalized]) return esToEnId[normalized];
  
  // Heuristic cleanup if not found in PokeAPI cache
  return normalized
    .replace(/[áäàâ]/g, 'a')
    .replace(/[éëèê]/g, 'e')
    .replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o')
    .replace(/[úüùû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

console.log('Restoring and parsing moves with PokeAPI names...');
const backupMovesPath = join(projectRoot, 'backup_legacy_code/js/02_pokemon_data.js');
const backupContent = readFileSync(backupMovesPath, 'utf-8');

const moveDefinitionRegex = /^\s*'([^']+)':\s*({[^}]+}),?/gm;
const moves: Record<string, string> = {};

let match;
while ((match = moveDefinitionRegex.exec(backupContent)) !== null) {
  const spanishName = match[1];
  const body = match[2];
  
  // Filter out Natures (they have 'up' or 'down' properties)
  if (body.includes('up:') || body.includes('down:')) {
    continue;
  }
  
  const apiId = resolveToPokeApiId(spanishName);
  moves[apiId] = `  '${apiId}': { id: '${apiId}', name: '${spanishName}', ${body.slice(1, -1)} },`;
}

// Write src/data/moves.ts
let movesTsContent = `import type { MoveBaseData } from '@/types/database';

export const MOVE_DATA: Record<string, MoveBaseData> = {\n`;
for (const entry of Object.values(moves)) {
  movesTsContent += entry + '\n';
}
movesTsContent += '};\n';

const movesTsPath = join(projectRoot, 'src/data/moves.ts');
writeFileSync(movesTsPath, movesTsContent, 'utf-8');
console.log('src/data/moves.ts successfully migrated to PokeAPI English IDs without natures!');

// Write src/data/pokemonDB.ts
console.log('Migrating src/data/pokemonDB.ts learnsets...');
const pokemonDBPath = join(projectRoot, 'src/data/pokemonDB.ts');
let activeDBContent = readFileSync(pokemonDBPath, 'utf-8');

const learnsetEntryRegex = /\{\s*lv:\s*(\d+),\s*id:\s*'[^']*',\s*name:\s*'([^']*)',\s*pp:\s*(\d+)\s*\}/g;
activeDBContent = activeDBContent.replace(learnsetEntryRegex, (fullMatch, lv, name, pp) => {
  const apiId = resolveToPokeApiId(name);
  return `{ lv: ${lv}, id: '${apiId}', name: '${name}', pp: ${pp} }`;
});

writeFileSync(pokemonDBPath, activeDBContent, 'utf-8');
console.log('src/data/pokemonDB.ts successfully migrated!');
