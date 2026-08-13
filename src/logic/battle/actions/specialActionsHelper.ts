import type { LogFn, BattleSide } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { gameBus } from '@/logic/events/gameBus'

export async function callPokemonToBattle(
  side: BattleSide,
  pokemon: Pokemon,
  logMsg: string,
  logTarget: Pokemon | string | null,
  addLogFn: LogFn,
  battleCtx: BattleContext
) {
  const fsm = battleCtx.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = battleCtx
  addLogFn(logMsg, 'log-info', logTarget)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)
  if (battleCtx.animations?.handleReleaseRequest) {
    await battleCtx.animations.handleReleaseRequest({ side, pokemon })
  } else {
    gameBus.emit('PLAY_SEND_OUT', { side, pokemon })
    const { gsapSleep } = await import('@/logic/utils/gsapHelpers')
    await gsapSleep(800)
  }
}
