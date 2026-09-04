/**
 * scripts/assets/helpers/catalogGenerators.ts
 *
 * Immutable static database and catalog generators for the asset conversion pipeline.
 * Generates bushCatalog, map-assets, pokemonFeetDatabase, npcSpriteCatalog, and animatedSpriteDatabase.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { Dex, toID } from '@pkmn/sim';
import { safeResolve, safeJoin, safeWriteFile, safeReadFile } from '../../lib/safePath.ts';

export interface AnimatedSpriteData {
  readonly frames: number;
  readonly size: number;
  readonly feetY: number;
  readonly feetX: number;
  readonly bodyH: number;
  readonly bodyW: number;
  readonly bodyRadius: number;
}

export async function generateBushCatalog(environmentFiles: string[]): Promise<void> {
  console.log(styleText('yellow', `\n   📦 Generando catálogo dinámico de arbustos y coberturas en src/logic/environment/bushCatalog.ts...`));
  
  const repeatedPrefixes = new Set<string>();
  const prefixCounts = new Map<string, number>();
  const filePrefixes = new Map<string, string>();

  for (const filename of environmentFiles) {
    const match = filename.match(/^([a-zA-Z]+)-(\d+)$/);
    if (match && match[1]) {
      const prefix = match[1];
      filePrefixes.set(filename, prefix);
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }
  }

  for (const [prefix, count] of prefixCounts.entries()) {
    if (count >= 1) {
      repeatedPrefixes.add(prefix);
    }
  }

  const dynamicCatalog: Record<string, string[]> = {};
  
  for (const prefix of repeatedPrefixes) {
    dynamicCatalog[prefix] = [];
  }

  for (const filename of environmentFiles) {
    const prefix = filePrefixes.get(filename);
    if (prefix && repeatedPrefixes.has(prefix)) {
      const catalogArr = dynamicCatalog[prefix];
      if (catalogArr) {
        catalogArr.push(filename);
      }
    }
  }

  for (const key of Object.keys(dynamicCatalog)) {
    const catalogArr = dynamicCatalog[key];
    if (catalogArr) {
      catalogArr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
  }

  const catalogDir = safeResolve(process.cwd(), 'src/logic/environment');
  await fs.mkdir(catalogDir, { recursive: true });
  const catalogPath = safeJoin(catalogDir, 'bushCatalog.ts');

  const logDetails = Object.keys(dynamicCatalog).map(k => `${dynamicCatalog[k]?.length ?? 0} ${k}`).join(', ');

  const catalogContent = `/**
 * src/logic/environment/bushCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO EDITAR MANUALMENTE
 * 
 * Contiene el inventario descubierto de assets ambientales para coberturas de combate.
 */

export const BUSH_FAMILIES = ${JSON.stringify(dynamicCatalog, null, 2)} as const;

export type BushFamily = keyof typeof BUSH_FAMILIES;
`;

  await safeWriteFile(catalogPath, catalogContent);
  console.log(styleText('green', `   [OK] Catálogo generado con éxito: ${logDetails || 'Ninguno'}.`));
}

export async function generateBattleMapCatalog(
  sourceDir: string,
  mapRouteMapping: Record<string, string>
): Promise<string[]> {
  console.log(styleText('yellow', `\n   📦 Generando catálogo de mapas de combate en src/data/map-assets.ts...`));
  const battleMapsSourceDir = safeResolve(sourceDir, 'public/assets/maps_battle');
  const battleMaps: string[] = []; // no-domain: Non-domain utility collection or data structure
  try {
    const entries = await fs.readdir(battleMapsSourceDir);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        battleMaps.push(path.parse(entry).name);
      }
    }
  } catch (err) {
    console.log(styleText('yellow', `   ⚠️ Warning: No se pudo leer maps_battle para el catálogo: ${(err as Error).message}`));
  }
  battleMaps.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(styleText('yellow', `   🔍 Validando correspondencia de mapas de combate...`));
  const missingMaps: string[] = []; // no-domain: Non-domain utility collection or data structure
  const suffixes = ['_dia', '_noche', '_atardecer', '_amanecer'] as const;

  for (const [routeId, baseName] of Object.entries(mapRouteMapping)) {
    if (baseName.includes('/')) continue;
    const hasBase = battleMaps.includes(baseName);
    const hasAnySuffix = suffixes.some(suffix => battleMaps.includes(`${baseName}${suffix}`));
    if (!hasBase && !hasAnySuffix) {
      missingMaps.push(`${routeId} (${baseName})`);
    }
  }

  if (missingMaps.length > 0) {
    console.error(styleText('red', `\n   ❌ ERROR: No se encontró ningún fondo de combate para las siguientes rutas:`));
    for (const missing of missingMaps) {
      console.error(styleText('red', `      - ${missing}`));
    }
    console.error(styleText('red', `   Por favor, añade al menos la versión base o una con ciclo (_dia, _noche, etc.) en _raw-assets/public/assets/maps_battle/\n`));
    process.exit(1);
  }
  console.log(styleText('green', `   [OK] Todos los mapas tienen su correspondiente fondo de combate.`));

  const mapAssetsPath = safeResolve(process.cwd(), 'src/data/world/map-assets.ts');
  let mapAssetsContent = await safeReadFile(mapAssetsPath, 'utf-8');
  
  const marker = 'const AVAILABLE_BATTLE_MAPS';
  const exportMarker = 'export const AVAILABLE_BATTLE_MAPS';
  let cutIndex = mapAssetsContent.indexOf(exportMarker);
  if (cutIndex === -1) cutIndex = mapAssetsContent.indexOf(marker);
  if (cutIndex !== -1) {
    mapAssetsContent = mapAssetsContent.substring(0, cutIndex).trimEnd() + '\n';
  } else {
    mapAssetsContent = mapAssetsContent.trimEnd() + '\n';
  }

  const generatedContent = `${mapAssetsContent}
export const AVAILABLE_BATTLE_MAPS = ${JSON.stringify(battleMaps, null, 2)} as const;
export type BattleMapAssetId = (typeof AVAILABLE_BATTLE_MAPS)[number];

export function isBattleMapAssetId(value: string): value is BattleMapAssetId {
  return AVAILABLE_BATTLE_MAPS.some(id => id === value);
}

export function requireBattleMapAssetId(value: string): BattleMapAssetId {
  if (isBattleMapAssetId(value)) return value;
  throw new Error(\`Invalid battle map asset id: \${value}\`);
}
`;

  await safeWriteFile(mapAssetsPath, generatedContent);
  console.log(styleText('green', `   [OK] Catálogo de mapas de combate integrado en src/data/map-assets.ts (${battleMaps.length} mapas)`));
  return battleMaps;
}

export interface PackedFeetData {
  p: Record<string, [number, number]>;
  n: Record<string, [number, number]>;
  t: Record<string, [number, number]>;
  c: Record<string, string>;
}

function packFeetCoordinates(
  pokemonFeetDatabase: Record<string, { feetY: number; feetX: number }>,
  packed: PackedFeetData
): void {
  for (const key of Object.keys(pokemonFeetDatabase)) {
    const isVariation = key.includes('v') && (key.includes('/animated/Front') || key.includes('/animated/Back'));
    if (isVariation) {
      const idleKey = key.replace(/v/, 'i');
      const idleVal = pokemonFeetDatabase[idleKey];
      if (idleVal) {
        pokemonFeetDatabase[key] = idleVal;
      }
    }
  }

  for (const key of Object.keys(pokemonFeetDatabase).sort()) {
    const val = pokemonFeetDatabase[key]!;
    if (key.startsWith('/assets/sprites/pokemon/') && key.endsWith('.webp')) {
      const subKey = key.slice('/assets/sprites/pokemon/'.length, -'.webp'.length);
      packed.p[subKey] = [val.feetY, val.feetX];
    } else if (key.startsWith('/assets/sprites/npc/') && key.endsWith('.webp')) {
      const subKey = key.slice('/assets/sprites/npc/'.length, -'.webp'.length);
      packed.n[subKey] = [val.feetY, val.feetX];
    } else if (key.startsWith('/assets/sprites/trainers/') && key.endsWith('.webp')) {
      const subKey = key.slice('/assets/sprites/trainers/'.length, -'.webp'.length);
      packed.t[subKey] = [val.feetY, val.feetX];
    }
  }
}

function resolveSpeciesCryFallback(
  spec: ReturnType<typeof Dex.species.all>[number],
  specId: string,
  existingCries: Set<string>,
  packed: PackedFeetData,
  pipelineWarnings: string[]
): boolean {
  if (existingCries.has(specId)) {
    packed.c[specId] = specId;
    return true;
  }

  const baseId = spec.baseSpecies ? toID(spec.baseSpecies) : '';
  if (baseId && existingCries.has(baseId)) {
    packed.c[specId] = baseId;
    if (spec.num > 0 && spec.isNonstandard !== 'CAP' && spec.isNonstandard !== 'Custom') {
      pipelineWarnings.push(`Grito para ${spec.name} (${specId}): fallback especie base '${baseId}'`);
    }
    return true;
  }

  let current = spec;
  while (current.prevo) {
    const prevSpecies = Dex.species.get(current.prevo);
    if (prevSpecies && prevSpecies.exists) {
      const prevId = toID(prevSpecies.name);
      if (existingCries.has(prevId)) {
        packed.c[specId] = prevId;
        if (spec.num > 0 && spec.isNonstandard !== 'CAP' && spec.isNonstandard !== 'Custom') {
          pipelineWarnings.push(`Grito para ${spec.name} (${specId}): fallback pre-evolución '${prevId}'`);
        }
        return true;
      }
      current = prevSpecies;
    } else {
      break;
    }
  }

  return false;
}

export async function generateFeetAndCriesDatabase(
  pokemonFeetDatabase: Record<string, { feetY: number; feetX: number }>,
  criesDir: string,
  targetDir: string,
  pipelineWarnings: string[],
  pipelineErrors: string[]
): Promise<PackedFeetData> {
  console.log(styleText('yellow', `\n   📦 Generando base de datos estática de anclajes en src/data/pokemonFeetDatabase.ts...`));
  await fs.mkdir(targetDir, { recursive: true });
  const databasePath = safeJoin(targetDir, 'pokemonFeetDatabase.ts');

  const packed: PackedFeetData = {
    p: {},
    n: {},
    t: {},
    c: {}
  };

  packFeetCoordinates(pokemonFeetDatabase, packed);

  console.log(styleText('yellow', `   🔊 Pre-procesando base de datos de gritos (cries)...`));
  try {
    const cryFiles = await fs.readdir(criesDir);
    const existingCries = new Set(
      cryFiles
        .filter(f => f.endsWith('.mp3') || f.endsWith('.ogg'))
        .map(f => path.parse(f).name.toLowerCase())
    );

    const missingOfficialCries: string[] = []; // no-domain: Non-domain utility collection or data structure
    const allSpecies = Dex.species.all();

    for (const spec of allSpecies) {
      const specId = toID(spec.name);
      const resolved = resolveSpeciesCryFallback(spec, specId, existingCries, packed, pipelineWarnings);

      if (!resolved) {
        packed.c[specId] = specId;
        if (spec.num > 0 && spec.isNonstandard !== 'CAP' && spec.isNonstandard !== 'Custom') {
          missingOfficialCries.push(`${spec.name} (${specId})`);
        }
      }
    }

    if (missingOfficialCries.length > 0) {
      console.error(styleText('red', `\n❌ ERROR: No se encontró ningún grito ni fallback válido para los siguientes ${missingOfficialCries.length} Pokémon oficiales:`));
      for (const missing of missingOfficialCries) {
        console.error(styleText('red', `   ${missing}`));
        pipelineErrors.push(`Grito faltante oficial: ${missing}`);
      }
      console.error(styleText('red', `   Por favor descarga o añade los gritos correspondientes en public/cries/`));
      process.exit(1);
    }
  } catch (err) {
    console.error(styleText('red', `\n❌ ERROR: No se pudo procesar la base de datos de gritos: ${(err as Error).message}`));
    pipelineErrors.push(`Procesamiento de gritos falló: ${(err as Error).message}`);
    process.exit(1);
  }

  const jsonPath = safeJoin(targetDir, 'pokemonFeetDatabase.json');
  await safeWriteFile(jsonPath, JSON.stringify(packed, null, 2));

  const criesJsonPath = safeJoin(targetDir, 'pokemonCriesDatabase.json');
  await safeWriteFile(criesJsonPath, JSON.stringify(packed.c, null, 2));

  const databaseContent = `/**
 * src/data/pokemonFeetDatabase.ts
 * 
 * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 * 
 * Contiene las coordenadas de anclaje de pies (feetX y feetY) precalculadas para cada sprite,
 * así como el catálogo de mapeos de gritos (cries) de Pokémon.
 */
import { FEET_COORDINATES_DATA } from './feetCoordinatesData.ts';

const packedData = FEET_COORDINATES_DATA;

export interface FeetPoints {
  readonly feetY: number;
  readonly feetX: number;
}

const PACKED_DATA = packedData;

const _FEET_SPRITE_GROUP_KEYS = ['p', 'n', 't'] as const;
type FeetSpriteGroupKey = (typeof _FEET_SPRITE_GROUP_KEYS)[number];
type FeetSpritePrefix = '/assets/sprites/pokemon/' | '/assets/sprites/npc/' | '/assets/sprites/trainers/';
export type FeetDatabasePath = \`\${FeetSpritePrefix}\${string}.webp\`;

const POKEMON_FEET_DATABASE: Partial<Record<FeetDatabasePath, FeetPoints>> = {};

function requireFeetMetric(values: readonly number[], path: FeetDatabasePath, index: number): number {
  const value = values[index];
  if (value !== undefined) return value;
  throw new Error(\`[pokemonFeetDatabase] Invalid feet tuple for path: \${path}\`);
}

for (const [key, prefix] of [
  ['p', '/assets/sprites/pokemon/'],
  ['n', '/assets/sprites/npc/'],
  ['t', '/assets/sprites/trainers/']
] as const satisfies readonly (readonly [FeetSpriteGroupKey, FeetSpritePrefix])[]) {
  const group = (PACKED_DATA as Record<string, Record<string, readonly number[]>>)[key] ?? {}; // open-record: Generic key-value data dictionary container
  for (const [subKey, tuple] of Object.entries(group)) {
    const dbPath: FeetDatabasePath = \`\${prefix}\${subKey}.webp\`;
    const y = requireFeetMetric(tuple as readonly number[], dbPath, 0);
    const x = requireFeetMetric(tuple as readonly number[], dbPath, 1);
    POKEMON_FEET_DATABASE[dbPath] = { feetY: y, feetX: x };
  }
}

function hasFeetDatabasePath(value: string): value is FeetDatabasePath {
  return Object.hasOwn(POKEMON_FEET_DATABASE, value);
}

function resolveFeetPath(raw: string): FeetDatabasePath {
  if (!raw) {
    throw new Error('[pokemonFeetDatabase] Path cannot be empty');
  }

  let cleaned = decodeURIComponent(raw).trim();
  if (!cleaned.endsWith('.webp')) {
    cleaned = cleaned.replace(/\\.(png|jpg|jpeg|gif)$/i, '') + '.webp';
  }

  if (hasFeetDatabasePath(cleaned)) return cleaned;

  // Shiny variants share identical physical geometry with the base sprite
  const baseSpritePath = cleaned
    .replace('/Back shiny/', '/Back/')
    .replace('/Front shiny/', '/Front/')
    .replace('/Icons shiny/', '/Icons/')
    .replace('/Back_shiny/', '/Back/')
    .replace('/Front_shiny/', '/Front/')
    .replace('/Icons_shiny/', '/Icons/');

  if (hasFeetDatabasePath(baseSpritePath)) return baseSpritePath;

  throw new Error(\`[pokemonFeetDatabase] Unknown feet database path: \${raw}\`);
}

export function requireFeetDatabasePath(value: string): FeetDatabasePath {
  return resolveFeetPath(value);
}

export function requireFeetPoints(value: string): FeetPoints {
  const resolvedPath = resolveFeetPath(value);
  const points = POKEMON_FEET_DATABASE[resolvedPath];
  if (points) return points;
  throw new Error(\`[pokemonFeetDatabase] Missing feet points for path: \${resolvedPath}\`);
}

export {
  POKEMON_CRIES_DATABASE,
  isPokemonCryId,
  getPokemonCryFilename
} from './pokemonCriesDatabase.ts';
`;

  await safeWriteFile(databasePath, databaseContent);
  console.log(styleText('green', `   [OK] Base de datos de anclaje y gritos integrada generada con éxito.`));
  return packed;
}

function classifyNpcSprite(
  baseName: string,
  normalized: string,
  archetypeKeywords: Record<string, string[]>,
  catalogLists: Record<string, string[]>
): void {
  for (const archetype of Object.keys(archetypeKeywords)) {
    const keywords = archetypeKeywords[archetype] || [];
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        if (keyword === 'bea' && normalized.includes('beauty')) continue;
        if (catalogLists[archetype]) {
          catalogLists[archetype].push(baseName);
          return;
        }
      }
    }
  }

  if (['acerola', 'allister', 'fantina'].some(n => normalized.includes(n)) && catalogLists.medium) {
    catalogLists.medium.push(baseName);
  } else if (['adaman', 'irida', 'arezu', 'mai'].some(n => normalized.includes(n)) && catalogLists.default) {
    catalogLists.default.push(baseName);
  } else if (['lance', 'drake', 'dragontamer'].some(n => normalized.includes(n)) && catalogLists.domador) {
    catalogLists.domador.push(baseName);
  } else if (['koga', 'janine', 'ninja'].some(n => normalized.includes(n)) && catalogLists.luchador) {
    catalogLists.luchador.push(baseName);
  } else if (catalogLists.default) {
    catalogLists.default.push(baseName);
  }
}

export async function generateNpcSpriteCatalog(
  sourceDir: string,
  npcCatalogPath: string,
  pipelineWarnings: string[]
): Promise<Record<string, string[]>> {
  console.log(styleText('yellow', `\n   📦 Generando catálogo de sprites de NPCs en src/data/npcSpriteCatalog.ts...`));
  const { ARCHETYPE_KEYWORDS } = await import('../../../src/logic/utils/npcSpriteRouter.ts');
  const { TRAINER_TYPES } = await import('../../../src/data/player/trainerTypes.ts');

  const catalogLists: Record<string, string[]> = Object.fromEntries(
    Object.keys(TRAINER_TYPES).map(key => [key, []])
  );

  const npcSourceDir = safeResolve(sourceDir, 'public/assets/sprites/npc');

  try {
    const entries = await fs.readdir(npcSourceDir);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        if (/_avatar|_back/i.test(entry)) continue;

        const baseName = path.parse(entry).name;
        const normalized = baseName.toLowerCase().replace(/[-_]/g, ''); // string-ok: Internal string formatting or DOM token identifier

        classifyNpcSprite(baseName, normalized, ARCHETYPE_KEYWORDS, catalogLists);
      }
    }
  } catch (err) {
    const msg = `No se pudo escanear NPCs: ${(err as Error).message}`;
    pipelineWarnings.push(msg);
    console.log(styleText('yellow', `   ⚠️ Warning: ${msg}`));
  }

  for (const key of Object.keys(catalogLists)) {
    catalogLists[key] = Array.from(new Set(catalogLists[key])).sort();
    if (catalogLists[key]!.length === 0) {
      catalogLists[key] = ['entrenador_h_front'];
    }
  }

  const npcCatalogContent = `/**
 * src/data/npcSpriteCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 */

export const ARCHETYPE_SPRITES = ${JSON.stringify(catalogLists, null, 2)} as const;

export type NpcSpriteId = (typeof ARCHETYPE_SPRITES)[keyof typeof ARCHETYPE_SPRITES][number];

export const VALID_NPC_SPRITES = Object.values(ARCHETYPE_SPRITES).flat();

export function isNpcSpriteId(value: string): value is NpcSpriteId {
  return (VALID_NPC_SPRITES as readonly string[]).includes(value); // domain-ok: Open dynamic text or non-domain string payload
}

export function requireNpcSpriteId(value: string): NpcSpriteId {
  if (isNpcSpriteId(value)) return value;
  throw new Error(\`[npcSpriteCatalog] Invalid NPC Sprite ID: \${value}\`);
}
`;

  await safeWriteFile(npcCatalogPath, npcCatalogContent);
  console.log(styleText('green', `   [OK] Catálogo de sprites de NPCs generado con éxito.`));
  return catalogLists;
}

export async function generateAnimatedSpriteDatabase(
  animatedDbData: Record<string, AnimatedSpriteData>,
  animatedVariationFrames: Record<string, number>,
  maxAnimatedSizeFront: number,
  maxAnimatedSizeBack: number
): Promise<number> {
  const animatedSpriteCount = Object.keys(animatedDbData).length;
  const animatedDbPath = safeResolve(process.cwd(), 'src/data/pokemon/animatedSpriteDatabase.ts');
  const animatedJsonPath = safeResolve(process.cwd(), 'src/data/pokemon/animatedSpriteDatabase.json');

  const compactDbJson = {
    RAW: Object.fromEntries(
      Object.entries(animatedDbData).map(([key, data]) => [
        key,
        [
          data.frames,
          data.size,
          data.feetY,
          data.feetX,
          data.bodyH,
          data.bodyW,
          data.bodyRadius
        ]
      ])
    ),
    VARIATIONS: animatedVariationFrames
  };

  await safeWriteFile(animatedJsonPath, JSON.stringify(compactDbJson, null, 2));

  const animatedDbContent = [
    '/**',
    ' * src/data/animatedSpriteDatabase.ts',
    ' *',
    ' * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE',
    ' */',
    "import dbJson from './animatedSpriteDatabase.json' with { type: 'json' };",
    '',
    'export interface AnimatedSpriteData {',
    '  readonly frames: number;',
    '  readonly size: number;',
    '  readonly feetY: number;',
    '  readonly feetX: number;',
    '  readonly bodyH: number;',
    '  readonly bodyW: number;',
    '  readonly bodyRadius: number;',
    '}',
    '',
    `/** Frame size (px) of the largest sprite in Front/Back. Used for relative combat scaling. */`,
    `export const MAX_ANIMATED_SPRITE_SIZE_FRONT = ${maxAnimatedSizeFront} as const;`,
    `export const MAX_ANIMATED_SPRITE_SIZE_BACK = ${maxAnimatedSizeBack} as const;`,
    '',
    'const RAW = dbJson.RAW;',
    'export type AnimatedSpriteId = keyof typeof RAW;',
    '',
    'export function hasAnimatedSpriteId(id: string): id is AnimatedSpriteId {',
    '  return Object.hasOwn(RAW, id);',
    '}',
    '',
    'export function requireAnimatedSpriteId(id: string): AnimatedSpriteId {',
    '  if (hasAnimatedSpriteId(id)) return id;',
    '  throw new Error(`[animatedSpriteDatabase] Unknown animated sprite id: ${id}`);',
    '}',
    '',
    'function requireAnimatedMetric(values: readonly number[], id: AnimatedSpriteId, index: number): number {',
    '  const value = values[index];',
    '  if (value !== undefined) return value;',
    '  throw new Error(`[animatedSpriteDatabase] Invalid metric tuple for sprite id: ${id}`);',
    '}',
    '',
    'export const ANIMATED_SPRITE_DATABASE: Partial<Record<AnimatedSpriteId, AnimatedSpriteData>> = {};',
    '',
    'for (const id in RAW) {',
    '  if (!hasAnimatedSpriteId(id)) continue;',
    '  const tuple = RAW[id];',
    '  const frames = requireAnimatedMetric(tuple, id, 0);',
    '  const size = requireAnimatedMetric(tuple, id, 1);',
    '  const feetY = requireAnimatedMetric(tuple, id, 2);',
    '  const feetX = requireAnimatedMetric(tuple, id, 3);',
    '  const bodyH = requireAnimatedMetric(tuple, id, 4);',
    '  const bodyW = requireAnimatedMetric(tuple, id, 5);',
    '  const bodyRadius = requireAnimatedMetric(tuple, id, 6);',
    '  ANIMATED_SPRITE_DATABASE[id] = { frames, size, feetY, feetX, bodyH, bodyW, bodyRadius };',
    '}',
    '',
    'export function requireAnimatedSpriteData(id: AnimatedSpriteId): AnimatedSpriteData {',
    '  const data = ANIMATED_SPRITE_DATABASE[id];',
    '  if (data) return data;',
    '  throw new Error(`[animatedSpriteDatabase] Missing animated sprite data for id: ${id}`);',
    '}',
    '',
    `/** Variation frame counts to keep variation sprites out of coordinate databases */`,
    `export const ANIMATED_VARIATION_FRAMES: Partial<Record<keyof typeof dbJson.VARIATIONS, number>> = dbJson.VARIATIONS;`,
    `export type AnimatedVariationId = keyof typeof ANIMATED_VARIATION_FRAMES;`,
    '',
    'export function hasAnimatedVariationId(id: string): id is AnimatedVariationId {',
    '  return Object.hasOwn(ANIMATED_VARIATION_FRAMES, id);',
    '}',
    '',
    'export function requireAnimatedVariationFrameCount(id: AnimatedVariationId): number {',
    '  const frames = ANIMATED_VARIATION_FRAMES[id];',
    '  if (frames !== undefined) return frames;',
    '  throw new Error(`[animatedSpriteDatabase] Missing variation frame count for id: ${id}`);',
    '}',
    '',
  ].join('\n');

  await safeWriteFile(animatedDbPath, animatedDbContent);
  console.log(styleText('green', `   [OK] Base de datos animada generada: ${animatedSpriteCount} sprites, maxSize: ${maxAnimatedSizeFront}px.`));
  return animatedSpriteCount;
}
