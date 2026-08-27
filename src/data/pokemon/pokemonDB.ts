/**
 * src/data/pokemon/pokemonDB.ts
 * 
 * Static domain wrapper for Pokemon Database.
 * Data is precomputed at build/dev time by scripts/data/generate_pokemon_db.ts
 * avoiding @pkmn/sim Dex overhead in the browser runtime bundle.
 */
import type { PokemonBaseData, LearnsetMove } from '@/types/system/database.ts';
import type { PokemonType } from '@/data/battle/types.ts';
import { SPECIES_METADATA } from './speciesMetadata.ts';
import { MOVE_TRANSLATIONS_ES, requirePokemonMoveId } from '@/data/battle/moves.ts';
import pokemonDbJson from './pokemonDB.json' with { type: 'json' };

export type PokemonDbSpeciesId = keyof typeof SPECIES_METADATA;

interface CompactDbEntry {
  name: string; // domain-ok
  type: PokemonType;
  type2?: PokemonType;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  catchRate: number;
  learnset: [number, string, number][];
}

const rawDb = pokemonDbJson as Record<PokemonDbSpeciesId, CompactDbEntry>; // open-record
const cache = new Map<PokemonDbSpeciesId, PokemonBaseData>();

function inflatePokemon(speciesId: PokemonDbSpeciesId): PokemonBaseData | undefined {
  const cached = cache.get(speciesId);
  if (cached) return cached;

  const raw = rawDb[speciesId];
  if (!raw) return undefined;

  const learnset: LearnsetMove[] = raw.learnset.map(([lv, rawMoveId, pp]) => {
    const moveId = requirePokemonMoveId(rawMoveId);
    const trans = MOVE_TRANSLATIONS_ES[moveId];
    return {
      lv,
      id: moveId,
      name: trans ? trans.name : moveId,
      pp
    };
  });

  const entry: PokemonBaseData = {
    name: raw.name,
    type: raw.type,
    type2: raw.type2,
    hp: raw.hp,
    atk: raw.atk,
    def: raw.def,
    spa: raw.spa,
    spd: raw.spd,
    spe: raw.spe,
    catchRate: raw.catchRate,
    learnset
  };

  cache.set(speciesId, entry);
  return entry;
}

const targetDb: Partial<Record<PokemonDbSpeciesId, PokemonBaseData>> = {}; // open-record

export const POKEMON_DB: Record<PokemonDbSpeciesId, PokemonBaseData> = new Proxy(targetDb, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') return undefined;
    if (prop === 'then') return undefined;
    if (isPokemonDbSpeciesId(prop)) {
      return inflatePokemon(prop);
    }
    return undefined;
  },
  has(_target, prop: string | symbol) {
    return typeof prop === 'string' && isPokemonDbSpeciesId(prop);
  },
  ownKeys() {
    return Reflect.ownKeys(rawDb);
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    if (typeof prop === 'string' && isPokemonDbSpeciesId(prop)) {
      return {
        enumerable: true,
        configurable: true,
        value: inflatePokemon(prop)
      };
    }
    return undefined;
  }
}) as Record<PokemonDbSpeciesId, PokemonBaseData>;

export function isPokemonDbSpeciesId(id: string): id is PokemonDbSpeciesId {
  return Object.hasOwn(SPECIES_METADATA, id);
}
