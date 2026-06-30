
import { EGG_GROUPS, BABY_MAP, EGG_MOVES_DB, BREEDING_CONSTANTS } from './breedingData.ts'
import { getFirstEvolution } from '@/logic/pokemon/evolutionEngine'
import type { Pokemon, PokemonIVs, BreedingCompatibility } from '@/types/pokemon/pokemon'

/**
 * breedingEngine.ts
 * Motor lógico de crianza: compatibilidad, herencia y generación de especies.
 */

/**
 * Retorna el ID base de un Pokémon (remueve sufijos de género si existen).
 */
export function getBreedingBaseId(id: string): string {
  if (!id) return id
  if (id === 'nidoranf' || id === 'nidoranm') return id
  return id.endsWith('_m') || id.endsWith('_f') ? id.slice(0, -2) : id
}

export { getFirstEvolution };

/**
 * Determina qué especie nacerá de un huevo.
 * Considera si la forma base tiene una forma "Bebé".
 */
export function getEggSpecies(motherId: string): string {
  const firstEvo = getFirstEvolution(motherId)
  return BABY_MAP[firstEvo] || firstEvo
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
    const mother = pA.gender === 'F' ? pA : pB
    const species = getEggSpecies(mother.id)
    const level = (idA === idB) ? 3 : 2
    return { level, eggSpecies: species, reason: 'OK', sharedGroups: shared }
  }

  return { level: 0, reason: 'Sin grupo huevo común', sharedGroups: [] }
}

/**
 * Calcula la herencia de IVs de la cría.
 * Soporta Objetos Recios (force stat) y Lazo Destino (hereda 5 stats).
 */
export function calculateInheritance(pA: Pokemon, pB: Pokemon, itemA: string, itemB: string, playerClass: string = ''): PokemonIVs {
  const STATS: (keyof PokemonIVs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
  const ivs: PokemonIVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  STATS.forEach(s => ivs[s] = Math.floor(Math.random() * 32))
  
  const powerMap: Record<string, keyof PokemonIVs> = {
    power_weight: 'hp',
    power_bracer: 'atk',
    power_belt: 'def',
    power_lens: 'spa',
    power_band: 'spd',
    power_anklet: 'spe'
  }
  
  const forcedA = powerMap[itemA]
  const forcedB = powerMap[itemB]
  
  if (forcedA) ivs[forcedA] = pA.ivs[forcedA]
  if (forcedB && forcedB !== forcedA) ivs[forcedB] = pB.ivs[forcedB]
  else if (forcedB && forcedB === forcedA) {
    ivs[forcedB] = Math.random() < 0.5 ? pA.ivs[forcedB] : pB.ivs[forcedB]
  }
  
  const hasDestinyKnot = itemA === 'destinyknot' || itemB === 'destinyknot'
  const forcedCount = (forcedA && forcedB && forcedA !== forcedB) ? 2 : ((forcedA || forcedB) ? 1 : 0)
  
  // Criador hereda +1 stat adicional base
  let baseInheritCount = hasDestinyKnot ? BREEDING_CONSTANTS.IV_INHERIT_DESTINY_KNOT : BREEDING_CONSTANTS.IV_INHERIT_DEFAULT
  if (playerClass === 'criador') baseInheritCount++
  
  const countToInherit = Math.max(0, baseInheritCount - forcedCount)
  
  const remainingStats = STATS.filter(s => s !== forcedA && s !== forcedB)
    .sort(() => Math.random() - 0.5)
    .slice(0, countToInherit)
    
  remainingStats.forEach(s => {
    ivs[s] = Math.random() < 0.5 ? pA.ivs[s] : pB.ivs[s]
  })
  
  return ivs
}

/**
 * Calcula la herencia de movimientos.
 * Prioridad: Egg Moves > TMs learned by parents > Level-up moves shared.
 */
export function inheritMoves(pA: Pokemon, pB: Pokemon, eggSpeciesId: string): string[] {
  const babyId = getBreedingBaseId(eggSpeciesId)
  const possibleEggMoves = EGG_MOVES_DB[babyId] || []
  const inheritedMoves: string[] = []

  // 1. Egg Moves (si el padre o la madre lo conocen Y está en la DB de posibles egg moves)
  const parentsMoves = [...(pA.moves || []), ...(pB.moves || [])]
  possibleEggMoves.forEach(moveId => {
    if (parentsMoves.some(m => m && m.name === moveId)) {
      if (!inheritedMoves.includes(moveId)) inheritedMoves.push(moveId)
    }
  })

  // 2. TMs: Si ambos padres conocen una MT que la cría puede aprender (simplificación legacy)
  const sharedMoves = (pA.moves || []).filter(ma => ma && (pB.moves || []).some(mb => mb && mb.name === ma.name))
  sharedMoves.forEach(m => {
    if (m && !inheritedMoves.includes(m.name) && inheritedMoves.length < 4) {
      inheritedMoves.push(m.name)
    }
  })

  // Limitamos a los últimos 4 movimientos encontrados
  return inheritedMoves.slice(-4)
}

/**
 * Determina la habilidad heredada.
 * La madre tiene 60% de probabilidad de pasar su habilidad (incluyendo Ocultas).
 * Si hay un Ditto, el otro padre actúa como "madre".
 */
export function inheritAbility(pA: Pokemon, pB: Pokemon): string | null {
  const isADitto = getBreedingBaseId(pA.id) === 'ditto'
  const isBDitto = getBreedingBaseId(pB.id) === 'ditto'
  
  let source: Pokemon | null;
  if (isADitto) source = pB
  else if (isBDitto) source = pA
  else source = pA.gender === 'F' ? pA : pB // La madre manda
  
  if (!source) return null
  
  if (Math.random() < BREEDING_CONSTANTS.HIDDEN_ABILITY_CHANCE) {
    return source.ability || null
  }
  
  return null // Habilidad aleatoria (slot 1 o 2 estándar)
}

/**
 * Calcula la probabilidad de Shiny considerando el Método Masuda y eventos.
 * standardRate suele ser 1/8192 o 1/4096.
 */
export function calculateShinyChance(pA: Pokemon, pB: Pokemon, standardRate: number = 1/4096, eventShinyMult: number = 1): number {
  const isForeign = pA.region !== pB.region || pA.ot_id !== pB.ot_id // Simplificación Método Masuda
  const masudaBonus = isForeign ? (BREEDING_CONSTANTS.MASUDA_MULTIPLIER - 1) : 0
  const eventBonus = eventShinyMult - 1
  
  const totalMult = 1 + masudaBonus + eventBonus // Additive stacking
  return standardRate * totalMult
}

/**
 * Determina la naturaleza heredada (Piedra Eterna).
 */
export function inheritNature(pA: Pokemon, pB: Pokemon, itemA: string, itemB: string): string | null {
  if (itemA === 'everstone' && itemB === 'everstone') {
    return Math.random() < 0.5 ? pA.nature : pB.nature
  }
  if (itemA === 'everstone') return pA.nature
  if (itemB === 'everstone') return pB.nature
  
  // Si no hay piedra, la naturaleza será aleatoria (se manejará al crear el objeto Pokémon)
  return null
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
  const itemA = pA.heldItem || ''
  const itemB = pB.heldItem || ''
  
  const hasEverstone = itemA === 'everstone' || itemB === 'everstone'
  const hasDestinyKnot = itemA === 'destinyknot' || itemB === 'destinyknot'
  const isForeign = pA.region !== pB.region || pA.ot_id !== pB.ot_id
  
  const ivCount = (hasDestinyKnot ? BREEDING_CONSTANTS.IV_INHERIT_DESTINY_KNOT : BREEDING_CONSTANTS.IV_INHERIT_DEFAULT) + (playerClass === 'criador' ? 1 : 0)
  
  // Calcular si hay posibles Egg Moves
  const babyId = getBreedingBaseId(getEggSpecies(pA.id))
  const possibleEggMoves = EGG_MOVES_DB[babyId] || []
  const parentsMoves = [...(pA.moves || []), ...(pB.moves || [])]
  const eggMovesDetected = possibleEggMoves.filter(moveId => parentsMoves.some(m => m && m.name === moveId))

  return {
    natureGuaranteed: hasEverstone,
    ivsInherited: ivCount,
    masudaActive: isForeign,
    eggMovesCount: eggMovesDetected.length,
    shinyMultiplier: isForeign ? BREEDING_CONSTANTS.MASUDA_MULTIPLIER : 1,
    hiddenAbilityChance: 60 // Porcentaje fijo
  }
}
