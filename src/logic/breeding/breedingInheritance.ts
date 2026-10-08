import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon';
import type { PokemonMoveId } from '@/data/battle/moves';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { BASE_SHINY_DENOMINATOR } from '@/logic/constants/gameplay.ts';
import { canLearnMove } from '@/logic/pokemon/pokemonLearnset.ts';
import { POKEMON_STAT_KEYS } from '@/types/pokemon/pokemon.ts';
import { generateRandomIVs } from '@/logic/pokemon/pokemonUtils.ts';
import { getSpeciesEggMoves } from '@/data/pokemon/eggMoves.ts';
import { BREEDING_CONSTANTS } from './breedingData.ts';
import { getBreedingBaseId, getEggSpecies } from './breedingEngine.ts';

const HIDDEN_ABILITY_HERITAGE_PCT = 60;

function getEggMoves(speciesId: PokemonSpeciesId): readonly PokemonMoveId[] {
  return getSpeciesEggMoves(speciesId);
}

/**
 * Calcula la herencia de IVs de la cría.
 * Soporta Objetos Recios (force stat) y Lazo Destino (hereda 5 stats).
 */
export function calculateInheritance(pA: Pokemon, pB: Pokemon, itemA: string, itemB: string, playerClass: string = ''): PokemonIVs {
  const ivs: PokemonIVs = generateRandomIVs();

  const powerMap: Record<string, keyof PokemonIVs> = {
    power_weight: 'hp',
    powerweight: 'hp',
    power_bracer: 'atk',
    powerbracer: 'atk',
    power_belt: 'def',
    powerbelt: 'def',
    power_lens: 'spa',
    powerlens: 'spa',
    power_band: 'spd',
    powerband: 'spd',
    power_anklet: 'spe',
    poweranklet: 'spe'
  };
  
  const forcedA = powerMap[itemA];
  const forcedB = powerMap[itemB];
  
  if (forcedA) ivs[forcedA] = pA.ivs[forcedA];
  if (forcedB && forcedB !== forcedA) ivs[forcedB] = pB.ivs[forcedB];
  else if (forcedB && forcedB === forcedA) {
    ivs[forcedB] = Math.random() < 0.5 ? pA.ivs[forcedB] : pB.ivs[forcedB];
  }
  
  const hasDestinyKnot = itemA === 'destinyknot' || itemB === 'destinyknot';
  const forcedCount = (forcedA && forcedB && forcedA !== forcedB) ? 2 : ((forcedA || forcedB) ? 1 : 0);
  
  // Criador hereda +1 stat adicional base
  let baseInheritCount = hasDestinyKnot ? BREEDING_CONSTANTS.IV_INHERIT_DESTINY_KNOT : BREEDING_CONSTANTS.IV_INHERIT_DEFAULT;
  if (playerClass === 'criador') baseInheritCount++;
  
  const countToInherit = Math.max(0, baseInheritCount - forcedCount);
  
  const remainingStats = POKEMON_STAT_KEYS.filter(s => s !== forcedA && s !== forcedB)
    .sort(() => Math.random() - 0.5)
    .slice(0, countToInherit);
    
  remainingStats.forEach(s => {
    ivs[s] = Math.random() < 0.5 ? pA.ivs[s] : pB.ivs[s];
  });
  
  return ivs;
}

/**
 * Calcula la herencia de movimientos.
 * Prioridad: Egg Moves > TMs learned by parents > Level-up moves shared.
 */
export function inheritMoves(pA: Pokemon, pB: Pokemon, eggSpeciesId: PokemonSpeciesId): PokemonMoveId[] {
  const babyId = getBreedingBaseId(eggSpeciesId);
  const possibleEggMoves = getEggMoves(babyId);
  const inheritedMoves: PokemonMoveId[] = [];

  // 1. Egg Moves (si el padre o la madre lo conocen Y está en la DB de posibles egg moves)
  const parentsMoves = [...(pA.moves || []), ...(pB.moves || [])];
  possibleEggMoves.forEach(moveId => {
    if (parentsMoves.some(m => m && m.id === moveId)) {
      if (!inheritedMoves.includes(moveId)) inheritedMoves.push(moveId);
    }
  });

  // 2. TMs / Movimientos legales compartidos que la cría puede aprender a nivel 1
  const sharedMoves = (pA.moves || []).filter(ma => ma?.id && (pB.moves || []).some(mb => mb?.id === ma.id));
  sharedMoves.forEach(m => {
    if (m?.id && !inheritedMoves.includes(m.id) && inheritedMoves.length < 4) {
      if (canLearnMove(babyId, m.id, 1)) {
        inheritedMoves.push(m.id);
      }
    }
  });

  // Limitamos a los últimos 4 movimientos encontrados
  return inheritedMoves.slice(-4);
}

/**
 * Determina la habilidad heredada.
 * La madre tiene 60% de probabilidad de pasar su habilidad (incluyendo Ocultas).
 * Si hay un Ditto, el otro padre actúa como "madre".
 */
export function inheritAbility(pA: Pokemon, pB: Pokemon): string | null {
  const isADitto = getBreedingBaseId(pA.id) === 'ditto';
  const isBDitto = getBreedingBaseId(pB.id) === 'ditto';
  
  let source: Pokemon | null;
  if (isADitto) source = pB;
  else if (isBDitto) source = pA;
  else source = pA.gender === 'f' ? pA : pB; // La madre manda
  
  if (!source) return null;
  
  if (Math.random() < BREEDING_CONSTANTS.HIDDEN_ABILITY_CHANCE) {
    return source.ability || null;
  }
  
  return null; // Habilidad aleatoria (slot 1 o 2 estándar)
}

/**
 * Calcula la probabilidad de Shiny considerando el Método Masuda y eventos.
 * standardRate suele ser 1/8192 o 1/4096.
 */
export function calculateShinyChance(pA: Pokemon, pB: Pokemon, standardRate: number = (1 / BASE_SHINY_DENOMINATOR), eventShinyMult: number = 1): number {
  const isForeign = pA.region !== pB.region || pA.ot_id !== pB.ot_id; // Simplificación Método Masuda
  const masudaBonus = isForeign ? (BREEDING_CONSTANTS.MASUDA_MULTIPLIER - 1) : 0;
  const eventBonus = eventShinyMult - 1;
  
  const totalMult = 1 + masudaBonus + eventBonus; // Additive stacking
  return standardRate * totalMult;
}

/**
 * Determina la naturaleza heredada (Piedra Eterna).
 */
export function inheritNature(pA: Pokemon, pB: Pokemon, itemA: string, itemB: string): string | null {
  if (itemA === 'everstone' && itemB === 'everstone') {
    return Math.random() < 0.5 ? pA.nature : pB.nature;
  }
  if (itemA === 'everstone') return pA.nature;
  if (itemB === 'everstone') return pB.nature;
  
  // Si no hay piedra, la naturaleza será aleatoria (se manejará al crear el objeto Pokémon)
  return null;
}

export interface GeneticsForecast {
  natureGuaranteed: boolean;
  ivsInherited: number;
  masudaActive: boolean;
  eggMovesCount: number;
  shinyMultiplier: number;
  hiddenAbilityChance: number;
}

/**
 * Retorna un resumen de probabilidades para la UI.
 * No revela el resultado final, solo las reglas actuales aplicadas.
 */
export function getGeneticsForecast(pA: Pokemon, pB: Pokemon, playerClass: string = ''): GeneticsForecast {
  const itemA = pA.heldItem || '';
  const itemB = pB.heldItem || '';
  
  const hasEverstone = itemA === 'everstone' || itemB === 'everstone';
  const hasDestinyKnot = itemA === 'destinyknot' || itemB === 'destinyknot';
  const isForeign = pA.region !== pB.region || pA.ot_id !== pB.ot_id;
  
  const ivCount = (hasDestinyKnot ? BREEDING_CONSTANTS.IV_INHERIT_DESTINY_KNOT : BREEDING_CONSTANTS.IV_INHERIT_DEFAULT) + (playerClass === 'criador' ? 1 : 0);
  
  // Calcular si hay posibles Egg Moves
  const babyId = getBreedingBaseId(getEggSpecies(pA.id));
  const possibleEggMoves = getEggMoves(babyId);
  const parentsMoves = [...(pA.moves || []), ...(pB.moves || [])];
  const eggMovesDetected = possibleEggMoves.filter(moveId => parentsMoves.some(m => m && m.id === moveId));

  return {
    natureGuaranteed: hasEverstone,
    ivsInherited: ivCount,
    masudaActive: isForeign,
    eggMovesCount: eggMovesDetected.length,
    shinyMultiplier: isForeign ? BREEDING_CONSTANTS.MASUDA_MULTIPLIER : 1,
    hiddenAbilityChance: HIDDEN_ABILITY_HERITAGE_PCT
  };
}
