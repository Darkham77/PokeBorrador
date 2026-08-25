import type { Move } from '@/types/pokemon/pokemon'
import type { BattleState, BattleSide } from '@/types/battle/battle'
import type { MoveCategory } from '@/data/battle/moves'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

export function syncActiveMovesFromRequest(active: BattleState | null, side: BattleSide) {
  if (!active) return

  const request = side === 'player' ? active.playerRequest : active.enemyRequest
  const poke = side === 'player' ? active.player : active.enemy
  if (!poke || !request?.active?.[0]?.moves) return

  // Strict UID verification: if the request belongs to another team member, do not apply its moves
  const activeReqMon = request.side?.pokemon?.find(p => p && p.active) || request.side?.pokemon?.[0]
  if (activeReqMon && (activeReqMon as { uid?: string }).uid && (activeReqMon as { uid?: string }).uid !== poke.uid) {
    console.debug(`[syncActiveMovesFromRequest] Bypassed stale request for ${poke.name} (${poke.uid}): request belongs to ${(activeReqMon as { uid?: string }).uid}`)
    return
  }

  const reqMoves = request.active[0].moves
  const currentMoves = poke.moves || []

  // Case A: Pokemon is transformed (e.g. Ditto) - moves are replaced in memory by target's moves
  if (poke.isTransformed) {
    const transformedMoves: Move[] = []
    for (const reqMove of reqMoves) {
      if (!reqMove || !reqMove.id) continue
      const md = pokemonDataProvider.getMoveData(reqMove.id)
      if (md && md.name) {
        transformedMoves.push({
          id: reqMove.id,
          name: md.name,
          type: md.type || 'normal',
          cat: (md.cat || 'physical') as MoveCategory,
          power: md.power,
          acc: md.acc,
          pp: reqMove.pp ?? 5,
          maxPP: reqMove.maxpp ?? 5,
          priority: md.priority || 0,
          effect: md.effect as Move['effect'],
          target: undefined,
          disabled: reqMove.disabled === true
        })
      }
    }
    poke.moves = transformedMoves
    return
  }

  // Case B: Standard Pokemon - PRESERVE permanent moveset without truncating during lockedmove/twoturn/recharge/choice
  const seenIds = new Set<string>() // runtime-set

  // 1. Update in-place all existing moves in poke.moves
  for (const move of currentMoves) {
    if (!move || !move.id) continue
    seenIds.add(move.id)

    const matchingReq = reqMoves.find(rm => rm && rm.id === move.id)
    if (matchingReq) {
      move.pp = matchingReq.pp ?? move.pp
      move.maxPP = matchingReq.maxpp ?? move.maxPP
      move.disabled = matchingReq.disabled === true
    } else {
      // If Showdown omitted this move from request (e.g. Outrage/Thrash lockedmove, recharge, encore),
      // mark it disabled for this turn without deleting it from the Pokemon's moveset!
      move.disabled = true
    }
  }

  // 2. If Showdown provided new moves not present in poke.moves (e.g. Struggle or incomplete initial array)
  // only append up to 4 moves total without dropping existing ones
  for (const reqMove of reqMoves) {
    if (!reqMove || !reqMove.id || seenIds.has(reqMove.id) || currentMoves.length >= 4) continue
    const md = pokemonDataProvider.getMoveData(reqMove.id)
    if (md && md.name) {
      currentMoves.push({
        id: reqMove.id,
        name: md.name,
        type: md.type || 'normal',
        cat: (md.cat || 'physical') as MoveCategory,
        power: md.power,
        acc: md.acc,
        pp: reqMove.pp ?? 0,
        maxPP: reqMove.maxpp ?? 0,
        priority: md.priority || 0,
        effect: md.effect as Move['effect'],
        target: undefined,
        disabled: reqMove.disabled === true
      })
      seenIds.add(reqMove.id)
    }
  }

  poke.moves = currentMoves
  console.debug(`[useBattleStore] Sync'd ${side} moves from request:`, JSON.stringify(poke.moves.map(m => m ? `${m.id} (pp: ${m.pp}/${m.maxPP}, dis: ${m.disabled})` : '')))
}
