import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'

export async function executePokemonCallSequence(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  needsCall: boolean
) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (needsCall && ctx.activeBattle.value) {
    const oldPoke = ctx.activeBattle.value.player
    if (oldPoke && oldPoke.uid !== initialPlayer.uid) {
      ctx.exitingPlayer.value = oldPoke
    }
    
    ctx.activeBattle.value.player = initialPlayer
    
    const withdrawPromise = oldPoke && oldPoke.uid !== initialPlayer.uid && ctx.animations?.handleCatchRequest
      ? ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPoke })
      : Promise.resolve()
      
    const sendOutPromise = ctx.animations?.handleReleaseRequest
      ? ctx.animations.handleReleaseRequest({ side: 'player', pokemon: initialPlayer })
      : Promise.resolve()
      
    await Promise.all([withdrawPromise, sendOutPromise])
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    ctx.exitingPlayer.value = null
  }
}
