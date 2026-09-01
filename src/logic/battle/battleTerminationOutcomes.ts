import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState } from '@/types/battle/battle'
import { gameBus } from '@/logic/events/gameBus'
import { gsapSleep } from '@/logic/utils/gsapHelpers'

const ENEMY_FLEE_ANIMATION_DELAY_MS = 1000

export async function handleCombatantsExitAnimations(
  ctx: BattleContext,
  active: BattleState,
  win: boolean,
  fled: boolean
): Promise<void> {
  const isTrainerOrGym = active.isTrainer || active.isGym || active.isPvP
  const playerExited: Promise<void> = Promise.resolve()

  let enemyExited: Promise<void> = Promise.resolve()
  if (active.enemy && active.enemy.hp > 0 && !fled && !active.isCapture) {
    if (isTrainerOrGym) {
      enemyExited = ctx.animations?.handleCatchRequest
        ? ctx.animations.handleCatchRequest({ side: 'enemy', pokemon: active.enemy })
        : Promise.resolve()
    } else {
      if (win) {
        enemyExited = ctx.animations?.handleFaintAnim
          ? ctx.animations.handleFaintAnim({ side: 'enemy', pokemon: active.enemy })
          : Promise.resolve()
      } else {
        gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee' })
        enemyExited = ctx.animations?.awaitTween
          ? ctx.animations.awaitTween('escape-enemy')
          : gsapSleep(ENEMY_FLEE_ANIMATION_DELAY_MS)
      }
    }
  }

  await Promise.all([playerExited, enemyExited])
}

export async function handleBattleDefeatFlow(
  ctx: BattleContext,
  active: BattleState
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  await ctx.gs.save(false)
  if (ctx.activeBattle.value !== active) return

  ctx.audio.play('defeat')

  await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
  await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
  await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_WAIT)
}

export async function handleBattleFleeFlow(
  ctx: BattleContext,
  active: BattleState,
  isSingle: boolean
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  active._initialEnemy = null
  ctx.clearLogs?.()
  if (fsm.currentState.value !== BATTLE_STATES.EXIT_BATTLE) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.WAIT_LOG_QUEUE_ONLY)
    await ctx.waitForLogs()
  }
  if (ctx.activeBattle.value !== active) return

  const playerFled = active.playerFled || false
  const wasSearching = active.wasSearching || false
  if (isSingle || playerFled || !wasSearching) {
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EXECUTE_CLEANUP)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.CLEAR_UI)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.TRIGGER_CLOSE)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.RESET_FLAGS)
    await ctx.completeBattleFlow('map')
  } else {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    if (ctx.activeBattle.value !== active) return
    await ctx.completeBattleFlow('search')
  }
}
