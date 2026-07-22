import { sleep } from '@/logic/utils/timeUtils'
import { clearVolatileStatus } from '../battleStatus.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'

export async function processSwitchSwapAnimations(
  ctx: BattleContext,
  oldPoke: Pokemon,
  newPoke: Pokemon,
  teamIndex: number
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, exitingPlayer, animations } = ctx

  if (!activeBattle.value) return

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
  addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
  addLog(`¡Envía a ${newPoke.name}!`, 'log-info', newPoke)

  exitingPlayer.value = oldPoke
  activeBattle.value.player = newPoke
  activeBattle.value.playerTeamIndex = teamIndex
  clearVolatileStatus(oldPoke)

  if (!activeBattle.value.participants.includes(newPoke.uid)) {
    activeBattle.value.participants.push(newPoke.uid)
  }

  const withdrawPromise = animations?.handleCatchRequest
    ? animations.handleCatchRequest({ side: 'player', pokemon: oldPoke })
    : Promise.resolve()

  const sendOutPromise = animations?.handleReleaseRequest
    ? animations.handleReleaseRequest({ side: 'player', pokemon: newPoke })
    : Promise.resolve()

  await Promise.all([withdrawPromise, sendOutPromise])
  exitingPlayer.value = null
}

export async function processSwitchCallAnimations(
  ctx: BattleContext,
  newPoke: Pokemon,
  teamIndex: number
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, animations } = ctx

  if (!activeBattle.value) return

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
  activeBattle.value.player = newPoke
  activeBattle.value.playerTeamIndex = teamIndex

  if (animations?.handleReleaseRequest) {
    await animations.handleReleaseRequest({ side: 'player', pokemon: newPoke })
  } else {
    await sleep(800)
  }
}
