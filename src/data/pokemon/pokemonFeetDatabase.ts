/**
 * src/data/pokemonFeetDatabase.ts
 * 
 * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 * 
 * Contiene las coordenadas de anclaje de pies (feetX y feetY) precalculadas para cada sprite,
 * así como el catálogo de mapeos de gritos (cries) de Pokémon.
 */
import packedData from './pokemonFeetDatabase.json' with { type: 'json' };

export interface FeetPoints {
  readonly feetY: number;
  readonly feetX: number;
}

const PACKED_DATA = packedData as unknown as {
  p: Record<string, [number, number]>;
  n: Record<string, [number, number]>;
  t: Record<string, [number, number]>;
  c: Record<string, string>;
};

export const POKEMON_FEET_DATABASE: Record<string, FeetPoints> = {};

for (const [key, prefix] of [
  ['p', '/assets/sprites/pokemon/'],
  ['n', '/assets/sprites/npc/'],
  ['t', '/assets/sprites/trainers/']
] as const) {
  const group = PACKED_DATA[key];
  if (group) {
    for (const [subKey, [y, x]] of Object.entries(group)) {
      POKEMON_FEET_DATABASE[`${prefix}${subKey}.webp`] = { feetY: y, feetX: x };
    }
  }
}

export const POKEMON_CRIES_DATABASE = (PACKED_DATA.c || {}) as Readonly<Record<string, string>>;
