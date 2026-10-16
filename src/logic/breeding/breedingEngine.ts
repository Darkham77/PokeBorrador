import { toID } from '@/logic/utils/strings.ts';
import { EGG_GROUPS, BABY_MAP } from './breedingData.ts';
import { getFirstEvolution } from '@/logic/pokemon/evolutionEngine';
import type { Pokemon, BreedingCompatibility } from '@/types/pokemon/pokemon';
import {
  isPokemonSpeciesId,
  requirePokemonSpeciesId,
  type PokemonSpeciesId
} from '@/data/pokemon/pokedex';

/**
 * breedingEngine.ts
 * Breeding logic engine: compatibility and species generation.
 */

export { getFirstEvolution };

/**
 * Determines which species will hatch from an egg.
 * Considers whether the base form has a "Baby" form.
 */
export function getEggSpecies(motherSpeciesId: PokemonSpeciesId): PokemonSpeciesId {
  const cleanId = String(toID(motherSpeciesId));
  const directBaby = isPokemonSpeciesId(cleanId) ? BABY_MAP[cleanId] : undefined;
  if (directBaby) {
    return directBaby;
  }
  const firstEvo = String(getFirstEvolution(cleanId));
  const evoSpecies = isPokemonSpeciesId(firstEvo) ? firstEvo : undefined;
  const babySpecies =
    (evoSpecies ? BABY_MAP[evoSpecies] : undefined) || evoSpecies || motherSpeciesId;
  return requirePokemonSpeciesId(babySpecies);
}

/**
 * Evaluates compatibility between two Pokémon.
 */
export function checkCompatibility(pA: Pokemon, pB: Pokemon): BreedingCompatibility {
  const idA = requirePokemonSpeciesId(pA.id);
  const idB = requirePokemonSpeciesId(pB.id);
  const gA = EGG_GROUPS[idA] || [];
  const gB = EGG_GROUPS[idB] || [];

  const shared = gA.filter((g) => gB.includes(g) && g !== 'ditto');

  // Validate "no-eggs" (Babies, Legendaries)
  if (gA.includes('no-eggs') || gB.includes('no-eggs')) {
    return { level: 0, reason: 'Uno de los Pokémon no puede criar', sharedGroups: [] };
  }

  const aDitto = idA === 'ditto';
  const bDitto = idB === 'ditto';

  if (aDitto && bDitto) return { level: 0, reason: 'Dos Ditto no pueden criar', sharedGroups: [] };

  // Caso Ditto + cualquier otro
  if (aDitto || bDitto) {
    const other = aDitto ? pB : pA;
    const species = getEggSpecies(other.id);
    return { level: 2, eggSpecies: species, reason: 'OK', sharedGroups: [] };
  }

  // Géneros opuestos obligatorios
  if (!pA.gender || !pB.gender || pA.gender === pB.gender) {
    return { level: 0, reason: 'Se requiere macho y hembra', sharedGroups: [] };
  }

  // Grupos compatibles
  if (shared.length > 0) {
    const mother = pA.gender === 'f' ? pA : pB;
    const species = getEggSpecies(mother.id);
    const level = idA === idB ? 3 : 2;
    return { level, eggSpecies: species, reason: 'OK', sharedGroups: shared };
  }

  return { level: 0, reason: 'Sin grupo huevo común', sharedGroups: [] };
}
