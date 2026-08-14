import type { PokemonSpeciesId } from './pokedex.ts';
import type { PokemonStatKey } from '@/types/pokemon/pokemon';
import evYieldsJson from './evYields.json' with { type: 'json' };

export type EvYield = Partial<Record<PokemonStatKey, number>>;

const EV_YIELDS = evYieldsJson as Record<PokemonSpeciesId, EvYield>;

export function getEvYieldForSpecies(speciesId: PokemonSpeciesId): EvYield {
  return EV_YIELDS[speciesId] ?? {};
}
