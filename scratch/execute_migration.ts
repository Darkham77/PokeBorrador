import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_MAP: Record<string, string> = {
  cuerpo_pesado: 'heavy_slam',
  hiper_colmillo: 'hyper_fang',
  patada_salto_alta: 'high_jump_kick',
  pajaro_osado: 'brave_bird',
  engullir: 'swallow',
  somnifera: 'sleep_powder',
  velocidad_extrema: 'extreme_speed',
  mismodestino: 'destiny_bond',
  pantalla_humo: 'smokescreen',
  super_colmillo: 'super_fang',
  huevo_bomba: 'egg_bomb',
  hueso_rus: 'bone_rush',
  mega_patada: 'mega_kick',
  mega_puno: 'mega_punch',
  pozo_venenoso: 'toxic_spikes',
  vampiro: 'horn_leech',
  psicocorte: 'psycho_cut',
  arena: 'sand_attack',
  minimizar: 'minimize',
  golpe_karatazo: 'karate_chop',
  mov_sismico: 'seismic_toss',
  tajo_aereo: 'air_slash',
  acidificacion: 'acid_armor',
  recurrente: 'bullet_seed',
  tormenta_de_arena: 'sandstorm'
};

const projectRoot = 'c:/Users/franc/Trabajo/Juegos/Pokemon-Online';

// 1. Migrate moves.ts
const movesPath = join(projectRoot, 'src/data/moves.ts');
let movesContent = readFileSync(movesPath, 'utf-8');

// Replace key definitions and values
for (const [spa, eng] of Object.entries(MIGRATION_MAP)) {
  // Replace: 'spa': { id: 'spa'
  const regexDef = new RegExp(`'${spa}':\\s*{\\s*id:\\s*'${spa}'`, 'g');
  movesContent = movesContent.replace(regexDef, `'${eng}': { id: '${eng}'`);
}

// Special case: sand_attack and sandstorm duplicates merging
// 'arena' is merged to 'sand_attack'. Let's delete the 'arena' entry if 'sand_attack' is present.
// Since sand_attack is already in moves.ts, we can just delete the line for 'arena'.
movesContent = movesContent.split('\n').filter(line => !line.trim().startsWith("'arena':") && !line.trim().startsWith("'tormenta_de_arena':")).join('\n');

writeFileSync(movesPath, movesContent, 'utf-8');
console.log('moves.ts migrated.');

// 2. Migrate pokemonDB.ts
const dbPath = join(projectRoot, 'src/data/pokemonDB.ts');
let dbContent = readFileSync(dbPath, 'utf-8');

for (const [spa, eng] of Object.entries(MIGRATION_MAP)) {
  // Replace: id: 'spa' in learnset
  const regexId = new RegExp(`id:\\s*'${spa}'`, 'g');
  dbContent = dbContent.replace(regexId, `id: '${eng}'`);
}

writeFileSync(dbPath, dbContent, 'utf-8');
console.log('pokemonDB.ts migrated.');
