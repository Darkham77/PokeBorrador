import { Dex, toID, type ID } from '@pkmn/sim';
import { ACTIVE_GENERATION, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { requirePokemonMoveId, type PokemonMoveId } from '@/data/battle/moves';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils';

const MAX_LEGAL_RANDOM_MOVE_SLOTS = 4;

function enqueueSpeciesLineage(currId: ID | PokemonSpeciesId, queue: ID[]): void {
  const species = Dex.species.get(currId);
  if (species.exists) {
    if (species.baseSpecies && toID(species.baseSpecies) !== currId) {
      queue.push(toID(species.baseSpecies));
    }
    if (species.prevo && toID(species.prevo) !== currId) {
      queue.push(toID(species.prevo));
    }
    if (species.battleOnly) {
      const battleBase = typeof species.battleOnly === 'string' ? species.battleOnly : species.battleOnly[0];
      if (battleBase) queue.push(toID(battleBase));
    }
  }
}

/**
 * Verifica si un Pokémon puede aprender un determinado movimiento según Showdown y base de datos local.
 * Si se especifica `level`, los movimientos aprendidos por nivel requieren `learnLevel <= level`.
 */
export function canLearnMove(speciesId: PokemonSpeciesId, moveId: PokemonMoveId, level?: number): boolean {
  if (!speciesId || !moveId) return false;
  const normMoveId = toID(moveId);
  const visited = new Set<string>(); // runtime-set: Lineage traversal set
  const queue: ID[] = [toID(speciesId)]; // domain-dex: Showdown ID lineage queue

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (visited.has(currId)) continue;
    visited.add(currId);

    const data = Dex.data.Learnsets[currId];
    if (data && data.learnset && data.learnset[normMoveId]) {
      if (level === undefined) return true;
      const sources = data.learnset[normMoveId];
      if (Array.isArray(sources)) {
        for (const src of sources) {
          // Machine (M), Egg (E), Tutor (T), Special/Event (S), Dream World (D), Virtual Console (V) are legal at any level
          if (/^\d+[METSDV]/.test(src)) {
            return true;
          }
          // Level-up moves (L): valid if learn level <= current level
          const match = src.match(/^(\d+)L(\d+)$/);
          if (match && parseInt(match[2]!, 10) <= level) {
            return true;
          }
        }
      }
    }

    enqueueSpeciesLineage(currId, queue);
  }

  // Fallback to local DB learnset
  const dbData = pokemonDataProvider.getPokemonData(speciesId, true);
  if (dbData && dbData.learnset) {
    const found = dbData.learnset.find(m => toID(m.id) === normMoveId);
    if (found) {
      if (level === undefined || found.lv <= level) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Obtiene la lista completa de movimientos legales para una especie dada y un nivel opcional.
 */
export function getLegalSpeciesMoves(speciesId: PokemonSpeciesId, level?: number): PokemonMoveId[] {
  if (!speciesId) return [];
  const visited = new Set<string>(); // runtime-set: Lineage traversal set
  const queue: ID[] = [toID(speciesId)]; // domain-dex: Showdown ID lineage queue
  const legalMoveIds = new Set<PokemonMoveId>(); // runtime-set: Legal moves accumulator set
  const targetLevel = level !== undefined ? Math.max(1, Math.min(MAX_POKEMON_LEVEL, level)) : undefined;

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (visited.has(currId)) continue;
    visited.add(currId);

    const data = Dex.data.Learnsets[currId];
    if (data && data.learnset) {
      for (const [moveId, sources] of Object.entries(data.learnset)) {
        let isLegalAtLevel = targetLevel === undefined;
        if (!isLegalAtLevel && Array.isArray(sources)) {
          for (const src of sources) {
            if (/^\d+[METSDV]/.test(src)) {
              isLegalAtLevel = true;
              break;
            }
            const match = src.match(/^(\d+)L(\d+)$/);
            if (match && parseInt(match[2]!, 10) <= targetLevel!) {
              isLegalAtLevel = true;
              break;
            }
          }
        }

        if (isLegalAtLevel) {
          try {
            const canonicalMoveId = requirePokemonMoveId(moveId);
            const moveData = Dex.forGen(ACTIVE_GENERATION).moves.get(canonicalMoveId);
            if (moveData && moveData.exists && moveData.isNonstandard !== 'Past') {
              legalMoveIds.add(canonicalMoveId);
            }
          } catch {
            // Ignore invalid move IDs
          }
        }
      }
    }

    enqueueSpeciesLineage(currId, queue);
  }

  // Fallback to local DB if Dex returned 0 moves
  if (legalMoveIds.size === 0) {
    const dbData = pokemonDataProvider.getPokemonData(speciesId, true);
    if (dbData && dbData.learnset) {
      for (const m of dbData.learnset) {
        if (targetLevel === undefined || m.lv <= targetLevel) {
          try {
            legalMoveIds.add(requirePokemonMoveId(m.id));
          } catch {
            // Ignore
          }
        }
      }
    }
  }

  if (legalMoveIds.size === 0) {
    const fallbackId = speciesId === 'unown' ? 'hiddenpower' : 'tackle';
    legalMoveIds.add(requirePokemonMoveId(fallbackId));
  }

  return Array.from(legalMoveIds);
}

/**
 * Calcula la cantidad máxima de movimientos legales que puede poseer un Pokémon según su nivel.
 */
export function getMaxAllowedMoves(speciesId: PokemonSpeciesId, level: number): number {
  if (!speciesId) return 1;
  try {
    const defaultMoves = getMovesAtLevel(speciesId, level, true);
    return Math.max(1, Math.min(MAX_LEGAL_RANDOM_MOVE_SLOTS, defaultMoves.length));
  } catch {
    return MAX_LEGAL_RANDOM_MOVE_SLOTS;
  }
}

/**
 * Selecciona hasta `maxSlots` movimientos legales aleatorios para una especie y nivel.
 * Respeta la cantidad máxima de movimientos que el Pokémon puede conocer a ese nivel
 * y rellena los slots restantes con `null`.
 */
export function getRandomLegalMoves(
  speciesId: PokemonSpeciesId,
  level: number,
  maxSlots: number = MAX_LEGAL_RANDOM_MOVE_SLOTS
): (PokemonMoveId | null)[] {
  const legalMoves = getLegalSpeciesMoves(speciesId, level);
  if (legalMoves.length === 0) {
    return [requirePokemonMoveId('tackle'), null, null, null];
  }

  const maxAllowed = getMaxAllowedMoves(speciesId, level);
  const targetCount = Math.min(maxSlots, maxAllowed);
  const shuffled = [...legalMoves].sort(() => 0.5 - Math.random());
  const selectedCount = Math.min(targetCount, shuffled.length);
  const result: (PokemonMoveId | null)[] = [];

  for (let i = 0; i < maxSlots; i++) {
    const move = shuffled[i];
    if (i < selectedCount && move) {
      result.push(move);
    } else {
      result.push(null);
    }
  }

  return result;
}
