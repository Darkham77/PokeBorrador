import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { canLearnMove, getMaxAllowedMoves } from './pokemonLearnset.ts'
import { recalcPokemonStats } from './pokemonFactory.ts'
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils'
import { toID } from '@pkmn/sim'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'
import { requireAbilityId } from '@/data/battle/abilities'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

export interface PokemonLegalityReport {
  isLegal: boolean
  issues: string[] // no-domain
}

export interface PokemonRepairReport {
  repaired: boolean
  changes: string[] // no-domain
}

/**
 * Checks whether a Pokemon strictly adheres to legal constraints:
 * - Species exists in Dex
 * - Level between 1 and 100
 * - Ability belongs to species' legal abilities
 * - Moves are non-duplicate, exist in move DB, and are in species' learnset
 */
export function checkPokemonLegality(p: Pokemon | null | undefined): PokemonLegalityReport {
  const issues: string[] = [] // no-domain

  if (!p) {
    return { isLegal: true, issues: [] }
  }

  if (!p.id) {
    issues.push('Especie no especificada.')
    return { isLegal: false, issues }
  }

  const speciesData = pokemonDataProvider.getPokemonData(p.id, true)
  if (!speciesData) {
    issues.push(`La especie "${p.id}" no existe en la base de datos de especies.`)
    return { isLegal: false, issues }
  }

  if (p.level < 1 || p.level > MAX_POKEMON_LEVEL) {
    issues.push(`Nivel ${p.level} fuera de rango permitido (1-${MAX_POKEMON_LEVEL}).`)
  }

  if (p.ability) {
    const validAbilities = pokemonDataProvider.getSpeciesAbilities(p.id)
    if (!validAbilities.includes(p.ability as (typeof validAbilities)[number])) {
      issues.push(`Habilidad "${p.ability}" es ilegal para ${speciesData.name}. Habilidades válidas: [${validAbilities.join(', ')}].`)
    }
  }

  const activeMoves = (p.moves || []).filter((m): m is Move => !!m && !!m.id)
  if (activeMoves.length === 0) {
    issues.push('El Pokémon debe poseer al menos 1 movimiento.')
  } else {
    const maxAllowedMoves = getMaxAllowedMoves(p.id, p.level)
    if (activeMoves.length > maxAllowedMoves) {
      issues.push(`El Pokémon al nivel ${p.level} solo puede conocer hasta ${maxAllowedMoves} movimiento(s) según su etapa de aprendizaje (posee ${activeMoves.length}).`)
    }
  }

  const moveSet = new Set<string>() // runtime-set
  for (const m of activeMoves) {
    const cleanId = toID(m.id)
    if (moveSet.has(cleanId)) {
      issues.push(`Movimiento duplicado: "${m.id}".`)
    }
    moveSet.add(cleanId)

    try {
      const moveData = pokemonDataProvider.getMoveData(cleanId)
      if (!moveData) {
        issues.push(`Movimiento "${m.id}" no existe en la base de datos.`)
      } else if (!canLearnMove(p.id, cleanId, p.level)) {
        issues.push(`Movimiento "${moveData.name}" (${cleanId}) es ilegal para la especie ${speciesData.name} al nivel ${p.level}.`)
      }
    } catch {
      issues.push(`Movimiento "${m.id}" (${cleanId}) no es válido en el motor Showdown.`)
    }
  }

  return {
    isLegal: issues.length === 0,
    issues
  }
}

/**
 * Repairs a Pokemon by fixing illegal attributes:
 * - Clamps level (1-100)
 * - Resets illegal ability to first legal ability for species
 * - Removes illegal moves and autofills legal level-up moves if needed
 * - Recalculates stats
 * - Clears isIllegal flag
 */
export function repairPokemonLegality(p: Pokemon): PokemonRepairReport {
  const changes: string[] = [] // no-domain
  if (!p || !p.id) return { repaired: false, changes }

  const speciesData = pokemonDataProvider.getPokemonData(p.id, true)
  if (!speciesData) return { repaired: false, changes }

  // 1. Repair Level
  if (p.level < 1) {
    p.level = 1
    changes.push('Nivel corregido a 1')
  } else if (p.level > MAX_POKEMON_LEVEL) {
    p.level = MAX_POKEMON_LEVEL
    changes.push(`Nivel corregido a ${MAX_POKEMON_LEVEL}`)
  }

  // 2. Repair Ability
  const validAbilities = pokemonDataProvider.getSpeciesAbilities(p.id)
  if (p.ability && !validAbilities.includes(p.ability as (typeof validAbilities)[number])) {
    const fallbackAbility = validAbilities[0] ? requireAbilityId(validAbilities[0]) : requireAbilityId('overgrow')
    p.ability = fallbackAbility
    changes.push(`Habilidad reasignada a legal: "${fallbackAbility}"`)
  }

  // 3. Repair Moves
  const legalMoves: Move[] = []
  const seenMoveIds = new Set<string>() // runtime-set

  for (const m of p.moves || []) {
    if (!m || !m.id) continue
    const cleanId = toID(m.id)
    if (!cleanId || seenMoveIds.has(cleanId)) continue

    try {
      const moveData = pokemonDataProvider.getMoveData(cleanId)
      if (moveData && canLearnMove(p.id, cleanId, p.level)) {
        legalMoves.push({
          id: moveData.id,
          name: moveData.name,
          type: moveData.type,
          cat: moveData.cat,
          power: moveData.power,
          acc: moveData.acc,
          pp: moveData.pp,
          maxPP: moveData.pp
        })
        seenMoveIds.add(cleanId)
      } else {
        changes.push(`Movimiento ilegal eliminado: "${m.id}"`)
      }
    } catch {
      changes.push(`Movimiento inválido descartado: "${m.id}"`)
    }
  }

  // If after removing illegal moves or due to incomplete movepool the Pokemon has fewer than targetMoveCount moves,
  // fill remaining slots with the latest official level-up moves for its level!
  const defaultMoves = getMovesAtLevel(p.id, p.level, true)
  const targetMoveCount = Math.max(1, Math.min(4, defaultMoves.length))

  if (legalMoves.length > targetMoveCount) {
    legalMoves.splice(targetMoveCount)
    changes.push(`Movimientos excedentes para el nivel ${p.level} recortados a ${targetMoveCount}`)
  } else if (legalMoves.length < targetMoveCount) {
    for (const defMove of defaultMoves) {
      if (legalMoves.length >= targetMoveCount) break
      if (!defMove || !defMove.id) continue
      if (!seenMoveIds.has(defMove.id)) {
        legalMoves.push({
          id: defMove.id,
          name: defMove.name,
          type: defMove.type,
          cat: defMove.cat,
          power: defMove.power,
          acc: defMove.acc,
          pp: defMove.pp,
          maxPP: defMove.maxPP
        })
        seenMoveIds.add(defMove.id)
        changes.push(`Movimiento completado por nivel (${p.level}): "${defMove.name}"`)
      }
    }
  }

  p.moves = legalMoves

  // 4. Recalculate stats and clean flags
  recalcPokemonStats(p, true)
  p.isIllegal = false
  p.illegalReasons = []

  return {
    repaired: changes.length > 0,
    changes
  }
}

/**
 * Checks whether any Pokemon in an array has isIllegal flag or fails legality check
 */
export function hasIllegalPokemon(list: (Pokemon | null | undefined)[]): boolean {
  if (!Array.isArray(list)) return false
  return list.some(p => {
    if (!p) return false
    if (p.isIllegal) return true
    return !checkPokemonLegality(p).isLegal
  })
}
