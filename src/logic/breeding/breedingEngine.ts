import { toID } from '@/logic/utils/strings.ts'
import { EGG_GROUPS, BABY_MAP } from './breedingData.ts'
import { getFirstEvolution } from '@/logic/pokemon/evolutionEngine'
import type { Pokemon, BreedingCompatibility } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'

/**
 * breedingEngine.ts
 * Motor lógico de crianza: compatibilidad y generación de especies.
 */

/**
 * Retorna el ID base de un Pokémon (remueve sufijos de género si existen).
 */
export function getBreedingBaseId(id: string): PokemonSpeciesId {
  return requirePokemonSpeciesId(id)
}

export { getFirstEvolution };

/**
 * Determina qué especie nacerá de un huevo.
 * Considera si la forma base tiene una forma "Bebé".
 */
export function getEggSpecies(motherSpeciesId: PokemonSpeciesId): PokemonSpeciesId {
  const cleanId = toID(motherSpeciesId);
  if (BABY_MAP[cleanId]) {
    return requirePokemonSpeciesId(BABY_MAP[cleanId]);
  }
  const firstEvo = getFirstEvolution(cleanId);
  const babySpecies = BABY_MAP[firstEvo] || firstEvo;
  return requirePokemonSpeciesId(babySpecies);
}

/**
 * Evalúa la compatibilidad entre dos Pokémon.
 */
export function checkCompatibility(pA: Pokemon, pB: Pokemon): BreedingCompatibility {
  const idA = getBreedingBaseId(pA.id)
  const idB = getBreedingBaseId(pB.id)
  const gA = EGG_GROUPS[idA] || []
  const gB = EGG_GROUPS[idB] || []
  
  const shared = gA.filter(g => gB.includes(g) && g !== 'ditto')
  
  // Validar "no-eggs" (Babies, Legendaries)
  if (gA.includes('no-eggs') || gB.includes('no-eggs')) {
    return { level: 0, reason: 'Uno de los Pokémon no puede criar', sharedGroups: [] }
  }

  const aDitto = idA === 'ditto'
  const bDitto = idB === 'ditto'
  
  if (aDitto && bDitto) return { level: 0, reason: 'Dos Ditto no pueden criar', sharedGroups: [] }

  // Caso Ditto + cualquier otro
  if (aDitto || bDitto) {
    const other = aDitto ? pB : pA
    const species = getEggSpecies(other.id)
    return { level: 2, eggSpecies: species, reason: 'OK', sharedGroups: [] }
  }

  // Géneros opuestos obligatorios
  if (!pA.gender || !pB.gender || pA.gender === pB.gender) {
    return { level: 0, reason: 'Se requiere macho y hembra', sharedGroups: [] }
  }

  // Grupos compatibles
  if (shared.length > 0) {
    const mother = pA.gender === 'f' ? pA : pB
    const species = getEggSpecies(mother.id)
    const level = (idA === idB) ? 3 : 2
    return { level, eggSpecies: species, reason: 'OK', sharedGroups: shared }
  }

  return { level: 0, reason: 'Sin grupo huevo común', sharedGroups: [] }
}
