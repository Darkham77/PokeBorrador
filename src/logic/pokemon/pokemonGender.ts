import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonGender, Pokemon } from '@/types/pokemon/pokemon';
import { SPECIES_GENDERS } from '@/data/pokemon/speciesGenders.ts';

export function isGenderlessSpeciesId(id: PokemonSpeciesId): boolean {
  return SPECIES_GENDERS[id] === 'N';
}

export function isSingleGenderSpeciesId(id: PokemonSpeciesId): boolean {
  const rule = SPECIES_GENDERS[id];
  return rule === 'N' || rule === 'M' || rule === 'F';
}

export function assignGender(id: PokemonSpeciesId): PokemonGender {
  const rule = SPECIES_GENDERS[id];
  if (rule === 'N') return null;
  if (rule === 'M') return 'm';
  if (rule === 'F') return 'f';
  if (typeof rule === 'number') {
    return Math.random() < rule ? 'm' : 'f';
  }
  return Math.random() < 0.5 ? 'm' : 'f';
}

export function ensurePokemonGender(p: Pokemon): boolean {
  if (!p) return false;
  const isGenderless = isGenderlessSpeciesId(p.id);
  if (p.gender === undefined || (!p.gender && !isGenderless)) {
    p.gender = assignGender(p.id);
    return true;
  }
  return false;
}
