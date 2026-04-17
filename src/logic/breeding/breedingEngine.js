import { EGG_GROUPS, BABY_MAP, EGG_MOVES_DB, BREEDING_CONSTANTS } from './breedingData'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '../../data/evolutionData'

/**
 * breedingEngine.js
 * Motor lógico de crianza: compatibilidad, herencia y generación de especies.
 */

/**
 * Retorna el ID base de un Pokémon (remueve sufijos de género si existen).
 */
export function getBreedingBaseId(id) {
  if (!id) return id
  if (id === 'nidoran_f' || id === 'nidoran_m') return id
  return id.endsWith('_m') || id.endsWith('_f') ? id.slice(0, -2) : id
}

/**
 * Encuentra la forma evolutiva más básica de un Pokémon.
 * Traversa la tabla de evoluciones hacia atrás.
 */
export function getFirstEvolution(id) {
  const baseId = getBreedingBaseId(id)
  
  // Buscar quién evoluciona a este Pokémon
  let parent = null
  
  // 1. Buscar en tabla de niveles
  for (const [key, val] of Object.entries(EVOLUTION_TABLE)) {
    if (val.to === baseId) {
      parent = key
      break
    }
  }
  
  // 2. Buscar en piedras
  if (!parent) {
    for (const [key, val] of Object.entries(STONE_EVOLUTIONS)) {
      if (val.to === baseId) {
        parent = key
        break
      }
    }
  }
  
  // 3. Buscar en intercambios
  if (!parent) {
    for (const [key, val] of Object.entries(TRADE_EVOLUTIONS)) {
      if (val === baseId) {
        parent = key
        break
      }
    }
  }

  // Si encontramos un padre, seguimos subiendo recursivamente
  if (parent) {
    return getFirstEvolution(parent)
  }
  
  return baseId
}

/**
 * Determina qué especie nacerá de un huevo.
 * Considera si la forma base tiene una forma "Bebé".
 */
export function getEggSpecies(motherId) {
  const firstEvo = getFirstEvolution(motherId)
  return BABY_MAP[firstEvo] || firstEvo
}

/**
 * Evalúa la compatibilidad entre dos Pokémon.
 */
export function checkCompatibility(pA, pB) {
  const idA = getBreedingBaseId(pA.id)
  const idB = getBreedingBaseId(pB.id)
  const gA = EGG_GROUPS[idA] || []
  const gB = EGG_GROUPS[idB] || []
  
  const shared = gA.filter(g => gB.includes(g) && g !== 'ditto')
  
  // Validar "no-eggs" (Babies, Legendaries)
  if (gA.includes('no-eggs') || gB.includes('no-eggs')) {
    return { level: 0, reason: 'Uno de los Pokémon no puede criar' }
  }

  const aDitto = idA === 'ditto'
  const bDitto = idB === 'ditto'
  
  if (aDitto && bDitto) return { level: 0, reason: 'Dos Ditto no pueden criar' }

  // Caso Ditto + cualquier otro
  if (aDitto || bDitto) {
    const other = aDitto ? pB : pA
    const species = getEggSpecies(other.id)
    return { level: 2, eggSpecies: species, reason: 'OK' }
  }

  // Géneros opuestos obligatorios
  if (!pA.gender || !pB.gender || pA.gender === pB.gender) {
    return { level: 0, reason: 'Se requiere macho y hembra' }
  }

  // Grupos compatibles
  if (shared.length > 0) {
    const mother = pA.gender === 'F' ? pA : pB
    const species = getEggSpecies(mother.id)
    const level = (idA === idB) ? 3 : 2
    return { level, eggSpecies: species, reason: 'OK', sharedGroups: shared }
  }

  return { level: 0, reason: 'Sin grupo huevo común' }
}

/**
 * Calcula la herencia de IVs de la cría.
 * Soporta Objetos Recios (force stat) y Lazo Destino (hereda 5 stats).
 */
export function calculateInheritance(pA, pB, itemA, itemB, playerClass = '') {
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
  const ivs = {}
  STATS.forEach(s => ivs[s] = Math.floor(Math.random() * 32))
  
  const powerMap = {
    'Pesa Recia': 'hp',
    'Brazal Recio': 'atk',
    'Cinto Recio': 'def',
    'Lente Recia': 'spa',
    'Banda Recia': 'spd',
    'Franja Recia': 'spe'
  }
  
  let forcedA = powerMap[itemA]
  let forcedB = powerMap[itemB]
  
  if (forcedA) ivs[forcedA] = pA.ivs[forcedA]
  if (forcedB && forcedB !== forcedA) ivs[forcedB] = pB.ivs[forcedB]
  else if (forcedB && forcedB === forcedA) {
    ivs[forcedB] = Math.random() < 0.5 ? pA.ivs[forcedB] : pB.ivs[forcedB]
  }
  
  const hasDestinyKnot = itemA === 'Lazo Destino' || itemB === 'Lazo Destino'
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
export function inheritMoves(pA, pB, eggSpeciesId) {
  const babyId = getBreedingBaseId(eggSpeciesId)
  const possibleEggMoves = EGG_MOVES_DB[babyId] || []
  const inheritedMoves = []

  // 1. Egg Moves (si el padre o la madre lo conocen Y está en la DB de posibles egg moves)
  const parentsMoves = [...(pA.moves || []), ...(pB.moves || [])]
  possibleEggMoves.forEach(moveId => {
    if (parentsMoves.some(m => m.id === moveId)) {
      if (!inheritedMoves.includes(moveId)) inheritedMoves.push(moveId)
    }
  })

  // 2. TMs: Si ambos padres conocen una MT que la cría puede aprender (simplificación legacy)
  // Nota: En Gen 3 real solo el padre pasa MTs, en este engine ambos por QoL legacy.
  const sharedMoves = (pA.moves || []).filter(ma => (pB.moves || []).some(mb => mb.id === ma.id))
  sharedMoves.forEach(m => {
    // Si no está ya y es un movimiento válido (aquí saltamos validación exhaustiva de MTs)
    if (!inheritedMoves.includes(m.id) && inheritedMoves.length < 4) {
      // Solo heredamos si es un movimiento común "decente" o estratégico (simplificación)
      // En una versión completa checkearíamos compatibility_mts[babyId]
      inheritedMoves.push(m.id)
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
export function inheritAbility(pA, pB) {
  const isADitto = getBreedingBaseId(pA.id) === 'ditto'
  const isBDitto = getBreedingBaseId(pB.id) === 'ditto'
  
  let source = null
  if (isADitto) source = pB
  else if (isBDitto) source = pA
  else source = pA.gender === 'F' ? pA : pB // La madre manda
  
  if (!source) return null
  
  if (Math.random() < BREEDING_CONSTANTS.HIDDEN_ABILITY_CHANCE) {
    return source.ability
  }
  
  return null // Habilidad aleatoria (slot 1 o 2 estándar)
}

/**
 * Calcula la probabilidad de Shiny considerando el Método Masuda.
 * standardRate suele ser 1/8192 o 1/4096.
 */
export function calculateShinyChance(pA, pB, standardRate = 1/4096) {
  const isForeign = pA.region !== pB.region || pA.ot_id !== pB.ot_id // Simplificación Método Masuda
  const multiplier = isForeign ? BREEDING_CONSTANTS.MASUDA_MULTIPLIER : 1
  return standardRate * multiplier
}

/**
 * Determina la naturaleza heredada (Piedra Eterna).
 */
export function inheritNature(pA, pB, itemA, itemB) {
  if (itemA === 'Piedra Eterna' && itemB === 'Piedra Eterna') {
    return Math.random() < 0.5 ? pA.nature : pB.nature
  }
  if (itemA === 'Piedra Eterna') return pA.nature
  if (itemB === 'Piedra Eterna') return pB.nature
  
  // Si no hay piedra, la naturaleza será aleatoria (se manejará al crear el objeto Pokémon)
  return null
}

/**
 * Retorna un resumen de probabilidades para la UI.
 * No revela el resultado final, solo las reglas actuales aplicadas.
 */
export function getGeneticsForecast(pA, pB, playerClass = '') {
  const itemA = pA.heldItem || ''
  const itemB = pB.heldItem || ''
  
  const hasEverstone = itemA === 'Piedra Eterna' || itemB === 'Piedra Eterna'
  const hasDestinyKnot = itemA === 'Lazo Destino' || itemB === 'Lazo Destino'
  const isForeign = pA.region !== pB.region || pA.ot_id !== pB.ot_id
  
  const ivCount = (hasDestinyKnot ? BREEDING_CONSTANTS.IV_INHERIT_DESTINY_KNOT : BREEDING_CONSTANTS.IV_INHERIT_DEFAULT) + (playerClass === 'criador' ? 1 : 0)
  
  // Calcular si hay posibles Egg Moves
  const babyId = getBreedingBaseId(getEggSpecies(pA.id))
  const possibleEggMoves = EGG_MOVES_DB[babyId] || []
  const parentsMoves = [...(pA.moves || []), ...(pB.moves || [])]
  const eggMovesDetected = possibleEggMoves.filter(moveId => parentsMoves.some(m => m.id === moveId))

  return {
    natureGuaranteed: hasEverstone,
    ivsInherited: ivCount,
    masudaActive: isForeign,
    eggMovesCount: eggMovesDetected.length,
    shinyMultiplier: isForeign ? BREEDING_CONSTANTS.MASUDA_MULTIPLIER : 1,
    hiddenAbilityChance: 60 // Porcentaje fijo
  }
}
