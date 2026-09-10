import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { requirePokemonMoveId, type PokemonMoveId } from '@/data/battle/moves';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils';
import { getSpeciesHistory } from '@/logic/pokemon/evolutionEngine';
import { POKEMON_DB, isPokemonDbSpeciesId } from '@/data/pokemon/pokemonDB';
import { getSpeciesEggMoves } from '@/data/pokemon/eggMoves';

const MAX_LEGAL_RANDOM_MOVE_SLOTS = 4;

/**
 * Verifica si un Pokémon puede aprender un determinado movimiento según la base de datos precomputada.
 * Revisa el linaje evolutivo completo de la especie (pre-evoluciones) en la BD canónica.
 * Si se especifica `level`, los movimientos aprendidos por nivel requieren `learnLevel <= level`.
 * Los movimientos compatibles (TM, Tutor, Egg, Especial, transferencias pasadas) son legales a cualquier nivel.
 */
export function canLearnMove(speciesId: PokemonSpeciesId, moveId: PokemonMoveId, level?: number): boolean {
  if (!speciesId || !moveId) return false;

  const history = getSpeciesHistory(speciesId);
  const targetSpecies = history.length > 0 ? history : [speciesId];

  for (const spId of targetSpecies) {
    if (!isPokemonDbSpeciesId(spId)) continue;
    const staticData = POKEMON_DB[spId];

    // 1. Compat moves (TM, Egg, Tutor, Special, Past transfers) are legal at any level
    if (staticData.compatMoves && staticData.compatMoves.includes(moveId)) {
      return true;
    }

    const eggMoves = getSpeciesEggMoves(spId);
    if (eggMoves.includes(moveId)) {
      return true;
    }

    // 2. Level-up moves
    if (staticData.learnset) {
      const found = staticData.learnset.find(m => m.id === moveId);
      if (found && (level === undefined || found.lv <= level)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Obtiene la lista completa de movimientos legales para una especie dada y un nivel opcional.
 * Incluye movimientos aprendidos a través de pre-evoluciones y movimientos compatibles.
 */
export function getLegalSpeciesMoves(speciesId: PokemonSpeciesId, level?: number): PokemonMoveId[] {
  if (!speciesId) return [];
  const legalMoveIds = new Set<PokemonMoveId>(); // runtime-set: Legal moves accumulator set
  const targetLevel = level !== undefined ? Math.max(1, Math.min(MAX_POKEMON_LEVEL, level)) : undefined;

  const history = getSpeciesHistory(speciesId);
  const targetSpecies = history.length > 0 ? history : [speciesId];

  for (const spId of targetSpecies) {
    if (!isPokemonDbSpeciesId(spId)) continue;
    const staticData = POKEMON_DB[spId];

    if (staticData.learnset) {
      for (const m of staticData.learnset) {
        if (targetLevel === undefined || m.lv <= targetLevel) {
          legalMoveIds.add(m.id);
        }
      }
    }

    if (staticData.compatMoves) {
      for (const mId of staticData.compatMoves) {
        legalMoveIds.add(mId);
      }
    }

    const eggMoves = getSpeciesEggMoves(spId);
    for (const em of eggMoves) {
      legalMoveIds.add(em);
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
  if (!speciesId || !isPokemonDbSpeciesId(speciesId)) return 1;
  const defaultMoves = getMovesAtLevel(speciesId, level, true);
  return Math.max(1, Math.min(MAX_LEGAL_RANDOM_MOVE_SLOTS, defaultMoves.length));
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
