import type { Move } from '@/types/pokemon/pokemon'
import type { BattleState, BattleSide } from '@/types/battle/battle'
import type { MoveCategory } from '@/data/battle/moves'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

export function syncActiveMovesFromRequest(active: BattleState | null, side: BattleSide) {
  if (!active) return

  const request = side === 'player' ? active.playerRequest : active.enemyRequest
  const poke = side === 'player' ? active.player : active.enemy

  if (!poke || !request?.active?.[0]?.moves) return

  const reqMoves = request.active[0].moves
  const currentMoves = poke.moves || []

  const updatedMoves = reqMoves.map((reqMove) => {
    if (!reqMove) return null
    const moveId = reqMove.id || ''
    if (!moveId) return null
    const match = currentMoves.find(m => m && m.id === moveId)
    if (match) {
      match.pp = reqMove.pp ?? 0
      match.maxPP = reqMove.maxpp ?? 0
      match.disabled = reqMove.disabled === true
      return match
    }
    

    const md = pokemonDataProvider.getMoveData(moveId)
    if (!md) {
      throw new Error(`[syncActiveMovesFromRequest] Movimiento no encontrado por ID en la base de datos: ${moveId}`)
    }
    if (!md.name) {
      throw new Error(`[syncActiveMovesFromRequest] El movimiento "${moveId}" no tiene traducción al español (name requerido).`)
    }
    return {
      id: moveId,
      name: md.name,
      type: md.type || 'normal',
      cat: (md.cat || 'physical') as MoveCategory,
      power: md.power,
      acc: md.acc,
      pp: reqMove.pp ?? 0,
      maxPP: reqMove.maxpp ?? 0,
      priority: md.priority || 0,
      effect: md.effect || '',
      target: (md as { target?: string }).target || 'normal',
      disabled: reqMove.disabled === true
    }
  })
  
  poke.moves = updatedMoves.filter((m): m is Move => m !== null)
  console.debug(`[useBattleStore] Sync'd ${side} moves from request:`, JSON.stringify(poke.moves.map(m => m ? m.id : '')))
}
