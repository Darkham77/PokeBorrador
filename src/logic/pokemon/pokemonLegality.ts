import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { canLearnMove, getMaxAllowedMoves } from './pokemonLearnset.ts'
import { recalcPokemonStats } from './pokemonFactory.ts'
import { getMovesAtLevel } from '@/logic/pokemon/pokemonUtils'
import { toID } from '@/logic/utils/strings.ts'
import { MAX_POKEMON_LEVEL, isEnabledPokemonId } from '@/data/system/constants'
import { requireAbilityId } from '@/data/battle/abilities'
import { requirePokemonMoveId } from '@/data/battle/moves'
import { isLegendaryPokemonSpeciesId, isFossilPokemonSpeciesId, isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

export interface PokemonLegalityReport {
  isLegal: boolean
  issues: string[] // no-domain: Non-domain utility collection or data structure
}

export interface PokemonRepairReport {
  repaired: boolean
  changes: string[] // no-domain: Non-domain utility collection or data structure
}

export interface CheckPokemonLegalityOptions {
  allowUnreleased?: boolean
}

/**
 * Checks whether a Pokemon strictly adheres to legal constraints:
 * - Species exists in Dex and is enabled by global whitelist
 * - Level between 1 and 100
 * - Ability belongs to species' legal abilities
 * - Moves are non-duplicate, exist in move DB, and are in species' learnset
 */
function validateSpeciesLegality(
  speciesKey: string,
  options?: CheckPokemonLegalityOptions
): { error?: string; speciesId?: PokemonSpeciesId; speciesData?: ReturnType<typeof pokemonDataProvider.getPokemonData> } {
  if (!speciesKey || !isPokemonSpeciesId(speciesKey)) {
    return { error: `La especie "${speciesKey}" no es válida o no está especificada.` }
  }

  const allowUnreleased = options?.allowUnreleased || (typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug')))
  if (!allowUnreleased && !isEnabledPokemonId(speciesKey)) {
    return { error: `La especie "${speciesKey}" no está habilitada por la whitelist global.` }
  }

  const speciesData = pokemonDataProvider.getPokemonData(speciesKey, true)
  if (!speciesData) {
    return { error: `La especie "${speciesKey}" no existe en la base de datos de especies.` }
  }

  return { speciesId: speciesKey, speciesData }
}

function validateAbilityLegality(
  speciesId: PokemonSpeciesId,
  speciesName: string,
  ability: string | undefined,
  issues: string[]
): void {
  if (!ability) return
  const validAbilities = pokemonDataProvider.getSpeciesAbilities(speciesId)
  if (!validAbilities.includes(ability as (typeof validAbilities)[number])) {
    issues.push(`Habilidad "${ability}" es ilegal para ${speciesName}. Habilidades válidas: [${validAbilities.join(', ')}].`)
  }
}

function validateMoveLegality(
  speciesId: PokemonSpeciesId,
  speciesName: string,
  level: number,
  moves: (Move | null)[] | undefined,
  issues: string[]
): void {
  const activeMoves = (moves || []).filter((m): m is Move => Boolean(m && m.id))
  if (activeMoves.length === 0) {
    issues.push('El Pokémon debe poseer al menos 1 movimiento.')
  } else {
    const maxAllowedMoves = getMaxAllowedMoves(speciesId, level)
    if (activeMoves.length > maxAllowedMoves) {
      issues.push(`El Pokémon al nivel ${level} solo puede conocer hasta ${maxAllowedMoves} movimiento(s) según su etapa de aprendizaje (posee ${activeMoves.length}).`)
    }
  }

  const moveSet = new Set<string>() // runtime-set: Fast O(1) membership lookup set
  for (const m of activeMoves) {
    const cleanId = toID(m.id)
    if (moveSet.has(cleanId)) {
      issues.push(`Movimiento duplicado: "${m.id}".`)
    }
    moveSet.add(cleanId)

    try {
      const canonicalMoveId = requirePokemonMoveId(cleanId)
      const moveData = pokemonDataProvider.getMoveData(canonicalMoveId)
      if (!moveData) {
        issues.push(`Movimiento "${m.id}" no existe en la base de datos.`)
      } else if (!canLearnMove(speciesId, canonicalMoveId, level)) {
        issues.push(`Movimiento "${moveData.name}" (${cleanId}) es ilegal para la especie ${speciesName} al nivel ${level}.`)
      }
    } catch {
      issues.push(`Movimiento "${m.id}" (${cleanId}) no es válido en el motor Showdown.`)
    }
  }
}

/**
 * Checks whether a Pokemon strictly adheres to legal constraints:
 * - Species exists in Dex and is enabled by global whitelist
 * - Level between 1 and 100
 * - Ability belongs to species' legal abilities
 * - Moves are non-duplicate, exist in move DB, and are in species' learnset
 */
export function checkPokemonLegality(
  p: Pokemon | null | undefined,
  options?: CheckPokemonLegalityOptions
): PokemonLegalityReport {
  if (!p) {
    return { isLegal: true, issues: [] }
  }

  const { error, speciesId, speciesData } = validateSpeciesLegality(p.id, options)
  if (error || !speciesData || !speciesId) {
    return { isLegal: false, issues: error ? [error] : [] }
  }

  const issues: string[] = [] // no-domain: Non-domain utility collection or data structure

  if (p.level < 1 || p.level > MAX_POKEMON_LEVEL) {
    issues.push(`Nivel ${p.level} fuera de rango permitido (1-${MAX_POKEMON_LEVEL}).`)
  }

  validateAbilityLegality(speciesId, speciesData.name, p.ability, issues)
  validateMoveLegality(speciesId, speciesData.name, p.level, p.moves, issues)

  return {
    isLegal: issues.length === 0,
    issues
  }
}

function repairMetadata(p: Pokemon, speciesName: string, changes: string[]): void {
  if (p.status === null || p.status === undefined) {
    p.status = ''
    changes.push('Estado alterado normalizado a ""')
  }
  if (p.expNeeded === undefined || p.expNeeded === null || isNaN(p.expNeeded) || p.expNeeded <= 0) {
    p.expNeeded = 100
    changes.push('expNeeded normalizado a 100')
  }
  if (!p.nickname && p.name !== speciesName) {
    p.name = speciesName
    changes.push(`Nombre de especie sincronizado a "${speciesName}"`)
  }
}

function repairLevel(p: Pokemon, changes: string[]): void {
  const targetLevel = Math.min(Math.max(1, p.level), MAX_POKEMON_LEVEL)
  if (targetLevel !== p.level) {
    p.level = targetLevel
    changes.push(`Nivel corregido a ${targetLevel}`)
  }
}

function repairVigor(p: Pokemon, changes: string[]): void {
  const isSpecial = isLegendaryPokemonSpeciesId(p.id) || isFossilPokemonSpeciesId(p.id)
  if (isSpecial) {
    if (p.vigor !== 0 || p.maxVigor !== 0) {
      p.vigor = 0
      p.maxVigor = 0
      changes.push('Vigor de Legendario/Fósil ajustado a 0/0')
    }
    return
  }
  if (p.maxVigor === undefined || p.maxVigor === null || isNaN(p.maxVigor) || p.maxVigor <= 0) {
    p.maxVigor = 100
    changes.push('Vigor máximo inicializado a 100')
  }
  if (p.vigor === undefined || p.vigor === null || isNaN(p.vigor)) {
    p.vigor = p.maxVigor
    changes.push(`Vigor actual inicializado a ${p.maxVigor}`)
  }
}

function repairAbility(p: Pokemon, changes: string[]): void {
  const validAbilities = pokemonDataProvider.getSpeciesAbilities(p.id)
  if (p.ability && !validAbilities.includes(p.ability as (typeof validAbilities)[number])) {
    const fallbackAbility = validAbilities[0] ? requireAbilityId(validAbilities[0]) : requireAbilityId('overgrow')
    p.ability = fallbackAbility
    changes.push(`Habilidad reasignada a legal: "${fallbackAbility}"`)
  }
}

function parseSingleLegalMove(m: Move | null | undefined, speciesId: Pokemon['id'], level: number): { move?: Move; errorReason?: string } {
  if (!m?.id) return {}
  const cleanId = toID(m.id)
  if (!cleanId) return {}

  try {
    const canonicalMoveId = requirePokemonMoveId(cleanId)
    const moveData = pokemonDataProvider.getMoveData(canonicalMoveId)
    if (moveData && canLearnMove(speciesId, canonicalMoveId, level)) {
      return {
        move: {
          id: moveData.id,
          name: moveData.name,
          type: moveData.type,
          cat: moveData.cat,
          power: moveData.power,
          acc: moveData.acc,
          pp: moveData.pp,
          maxPP: moveData.pp
        }
      }
    }
    return { errorReason: `Movimiento ilegal eliminado: "${m.id}"` }
  } catch {
    return { errorReason: `Movimiento inválido descartado: "${m.id}"` }
  }
}

function collectLegalMoves(p: Pokemon, changes: string[], seenMoveIds: Set<string>): Move[] {
  const legalMoves: Move[] = []
  for (const m of p.moves || []) {
    const cleanId = m?.id ? toID(m.id) : ''
    if (!cleanId || seenMoveIds.has(cleanId)) continue

    const { move, errorReason } = parseSingleLegalMove(m, p.id, p.level)
    if (move) {
      legalMoves.push(move)
      seenMoveIds.add(cleanId)
    } else if (errorReason) {
      changes.push(errorReason)
    }
  }
  return legalMoves
}

function fillDefaultMoves(p: Pokemon, legalMoves: Move[], seenMoveIds: Set<string>, changes: string[]): void {
  const defaultMoves = getMovesAtLevel(p.id, p.level, true)
  const targetMoveCount = Math.max(1, Math.min(4, defaultMoves.length))

  if (legalMoves.length > targetMoveCount) {
    legalMoves.splice(targetMoveCount)
    changes.push(`Movimientos excedentes para el nivel ${p.level} recortados a ${targetMoveCount}`)
    return
  }

  for (const defMove of defaultMoves) {
    if (legalMoves.length >= targetMoveCount) break
    if (!defMove?.id || seenMoveIds.has(defMove.id)) continue

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

function repairMoves(p: Pokemon, changes: string[]): void {
  const seenMoveIds = new Set<string>() // runtime-set: Fast O(1) membership lookup set
  const legalMoves = collectLegalMoves(p, changes, seenMoveIds)
  fillDefaultMoves(p, legalMoves, seenMoveIds, changes)
  p.moves = legalMoves
}

function repairHpAndFinalize(p: Pokemon, changes: string[]): void {
  if (p.hp === undefined || p.hp === null || isNaN(p.hp) || p.hp <= 0) {
    p.hp = p.maxHp || 100
    changes.push('HP inicializado')
  }
  recalcPokemonStats(p, true)
  p.isIllegal = false
  p.illegalReasons = []
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
  const changes: string[] = [] // no-domain: Non-domain utility collection or data structure
  if (!p || !p.id) return { repaired: false, changes }

  const speciesData = pokemonDataProvider.getPokemonData(p.id, true)
  if (!speciesData) return { repaired: false, changes }

  repairMetadata(p, speciesData.name, changes)
  repairLevel(p, changes)
  repairVigor(p, changes)
  repairAbility(p, changes)
  repairMoves(p, changes)
  repairHpAndFinalize(p, changes)

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
