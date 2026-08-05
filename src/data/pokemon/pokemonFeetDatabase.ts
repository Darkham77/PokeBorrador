/**
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

type FeetSpriteGroupKey = 'p' | 'n' | 't';
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
  const group = (PACKED_DATA as Record<string, Record<string, readonly number[]>>)[key] ?? {}; // open-record
  for (const [subKey, tuple] of Object.entries(group)) {
    const dbPath: FeetDatabasePath = `${prefix}${subKey}.webp`;
    const y = requireFeetMetric(tuple as readonly number[], dbPath, 0);
    const x = requireFeetMetric(tuple as readonly number[], dbPath, 1);
    POKEMON_FEET_DATABASE[dbPath] = { feetY: y, feetX: x };
  }
}

function hasFeetDatabasePath(value: string): value is FeetDatabasePath {
  return Object.hasOwn(POKEMON_FEET_DATABASE, value);
}

export function requireFeetDatabasePath(value: string): FeetDatabasePath {
  if (hasFeetDatabasePath(value)) return value;
  throw new Error(`[pokemonFeetDatabase] Unknown feet database path: ${value}`);
}

export function requireFeetPoints(value: string): FeetPoints {
  const path = requireFeetDatabasePath(value);
  const points = POKEMON_FEET_DATABASE[path];
  if (points) return points;
  throw new Error(`[pokemonFeetDatabase] Missing feet points for path: ${path}`);
}

const POKEMON_CRIES_DATABASE = ((PACKED_DATA as Record<string, Record<string, string>>).c ?? {}) as Record<string, string>; // open-record
export type PokemonCryId = keyof typeof POKEMON_CRIES_DATABASE;

function isPokemonCryId(raw: string): raw is PokemonCryId {
  return raw in POKEMON_CRIES_DATABASE;
}

export function getPokemonCryFilename(speciesId: string): string {
  if (isPokemonCryId(speciesId)) {
    return POKEMON_CRIES_DATABASE[speciesId] ?? speciesId;
  }
  return speciesId;
}
