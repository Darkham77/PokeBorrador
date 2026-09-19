/**
 * src/data/pokemonFeetDatabase.ts
 * 
 * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 * 
 * Contiene las coordenadas de anclaje de pies (feetX y feetY) precalculadas para cada sprite,
 * así como el catálogo de mapeos de gritos (cries) de Pokémon.
 */
import { FEET_COORDINATES_DATA } from './feetCoordinatesData.ts';
import type { GlobalShadowConfig } from '@/types/pokemon/spriteShadows';

const packedData = FEET_COORDINATES_DATA;

export interface FeetPoints {
  readonly feetY: number;
  readonly feetX: number;
  readonly isFlying?: boolean;
  readonly shadowScale?: number;
}

const PACKED_DATA = packedData;

const DEFAULT_GLOBAL_SHADOW_WIDTH_RATIO = 1.0;
const DEFAULT_GLOBAL_SHADOW_HEIGHT_RATIO = 0.28;
const DEFAULT_GLOBAL_SHADOW_PIXELATION = 14;

export const GLOBAL_SHADOW_CONFIG: GlobalShadowConfig = {
  widthRatio: PACKED_DATA.shadow?.widthRatio ?? DEFAULT_GLOBAL_SHADOW_WIDTH_RATIO,
  heightRatio: PACKED_DATA.shadow?.heightRatio ?? DEFAULT_GLOBAL_SHADOW_HEIGHT_RATIO,
  pixelation: PACKED_DATA.shadow?.pixelation ?? DEFAULT_GLOBAL_SHADOW_PIXELATION
} as const;

const _FEET_SPRITE_GROUP_KEYS = ['p', 'n', 't'] as const;
type FeetSpriteGroupKey = (typeof _FEET_SPRITE_GROUP_KEYS)[number];
type FeetSpritePrefix = '/assets/sprites/pokemon/' | '/assets/sprites/npc/' | '/assets/sprites/trainers/';
export type FeetDatabasePath = `${FeetSpritePrefix}${string}.webp`;

const POKEMON_FEET_DATABASE: Partial<Record<FeetDatabasePath, FeetPoints>> = {};

function requireFeetMetric(values: readonly number[], path: FeetDatabasePath, index: number): number {
  const value = values[index];
  if (value !== undefined) return value;
  throw new Error(`[pokemonFeetDatabase] Invalid feet tuple for path: ${path}`);
}

for (const [key, prefix] of [
  ['p', '/assets/sprites/pokemon/'],
  ['n', '/assets/sprites/npc/'],
  ['t', '/assets/sprites/trainers/']
] as const satisfies readonly (readonly [FeetSpriteGroupKey, FeetSpritePrefix])[]) {
  const group = (PACKED_DATA as Record<string, Record<string, readonly number[]>>)[key] ?? {}; // open-record: Generic key-value data dictionary container
  for (const [subKey, tuple] of Object.entries(group)) {
    const dbPath: FeetDatabasePath = `${prefix}${subKey}.webp`;
    const y = requireFeetMetric(tuple as readonly number[], dbPath, 0);
    const x = requireFeetMetric(tuple as readonly number[], dbPath, 1);
    const isFlying = (tuple as readonly number[])[2] === 1;
    const shadowScale = (tuple as readonly number[])[3];
    POKEMON_FEET_DATABASE[dbPath] = {
      feetY: y,
      feetX: x,
      ...(isFlying ? { isFlying: true } : {}),
      ...(shadowScale !== undefined ? { shadowScale } : {})
    };
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
  if (!cleaned.startsWith('/') && cleaned.startsWith('assets/')) {
    cleaned = `/${cleaned}`;
  }
  if (!cleaned.endsWith('.webp')) {
    cleaned = cleaned.replace(/\.(png|jpg|jpeg|gif)$/i, '') + '.webp';
  }

  if (hasFeetDatabasePath(cleaned)) return cleaned;

  // Check frame fallback on exact variant first (e.g. Back shiny/656v -> Back shiny/656i)
  const cleanedIdle = cleaned
    .replace(/(\/animated\/[^/]+\/\d+)\.webp$/i, '$1i.webp')
    .replace(/(\/animated\/[^/]+\/[^/]+)v([^/]*\.webp)$/i, '$1i$2');
  if (hasFeetDatabasePath(cleanedIdle)) return cleanedIdle;

  // Shiny variants share identical physical geometry with the base sprite
  const baseSpritePath = cleaned
    .replace('/Back shiny/', '/Back/')
    .replace('/Front shiny/', '/Front/')
    .replace('/Icons shiny/', '/Icons/')
    .replace('/Back_shiny/', '/Back/')
    .replace('/Front_shiny/', '/Front/')
    .replace('/Icons_shiny/', '/Icons/')
    .replace('/shiny/', '/');

  if (hasFeetDatabasePath(baseSpritePath)) return baseSpritePath;

  // Fallback for variation 'v' or missing frame suffix on base sprite (e.g. 656v -> 656i, 26 -> 26i, 112v_f -> 112i_f)
  const baseIdle = baseSpritePath
    .replace(/(\/animated\/[^/]+\/\d+)\.webp$/i, '$1i.webp')
    .replace(/(\/animated\/[^/]+\/[^/]+)v([^/]*\.webp)$/i, '$1i$2');
  if (hasFeetDatabasePath(baseIdle)) return baseIdle;

  throw new Error(`[pokemonFeetDatabase] Unknown feet database path: ${raw}`);
}

export function requireFeetDatabasePath(value: string): FeetDatabasePath {
  return resolveFeetPath(value);
}

export function requireFeetPoints(value: string): FeetPoints {
  const resolvedPath = resolveFeetPath(value);
  const points = POKEMON_FEET_DATABASE[resolvedPath];
  if (points) return points;
  throw new Error(`[pokemonFeetDatabase] Missing feet points for path: ${resolvedPath}`);
}

export {
  POKEMON_CRIES_DATABASE,
  isPokemonCryId,
  getPokemonCryFilename
} from './pokemonCriesDatabase.ts';
