import { Dex, toID } from '@pkmn/sim';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { PokemonGender, Pokemon } from '@/types/pokemon/pokemon';

const GENDERLESS: readonly PokemonSpeciesId[] = [
  'articuno', 'ditto', 'electrode', 'magnemite', 'magneton', 'mew', 'mewtwo',
  'moltres', 'porygon', 'starmie', 'staryu', 'voltorb', 'zapdos'
];
const MALE_ONLY_SPECIES: readonly PokemonSpeciesId[] = ['nidoranm'];
const FEMALE_ONLY_SPECIES: readonly PokemonSpeciesId[] = ['nidoranf'];

export function isGenderlessSpeciesId(id: PokemonSpeciesId): boolean {
  return GENDERLESS.includes(id);
}

export function assignGender(id: PokemonSpeciesId): PokemonGender {
  const normId = toID(id);
  const spec = Dex.species.get(normId);
  if (spec && spec.exists) {
    if (spec.gender === 'N' || isGenderlessSpeciesId(id)) return null;
    if (spec.gender === 'M' || MALE_ONLY_SPECIES.includes(id)) return 'm';
    if (spec.gender === 'F' || FEMALE_ONLY_SPECIES.includes(id)) return 'f';
    if (spec.genderRatio) {
      return Math.random() < spec.genderRatio.M ? 'm' : 'f';
    }
  }
  if (isGenderlessSpeciesId(id)) return null;
  if (MALE_ONLY_SPECIES.includes(id)) return 'm';
  if (FEMALE_ONLY_SPECIES.includes(id)) return 'f';
  return Math.random() < 0.5 ? 'm' : 'f';
}

export function ensurePokemonGender(p: Pokemon): boolean {
  if (!p) return false;
  const spec = Dex.species.get(toID(p.id));
  const isGenderless = spec?.gender === 'N' || isGenderlessSpeciesId(p.id);
  if (p.gender === undefined || (!p.gender && !isGenderless)) {
    p.gender = assignGender(p.id);
    return true;
  }
  return false;
}
