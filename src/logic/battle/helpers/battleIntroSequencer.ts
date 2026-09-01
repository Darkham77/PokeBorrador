import { gameBus } from '@/logic/events/gameBus'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState } from '@/types/battle/battle'
import { executePokemonCallSequence } from '../orchestratorCallSequence.ts'

export async function runTrainerIntroSequence(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  wasSearching: boolean,
  trainerName: string | undefined,
  battleState: BattleState | null | undefined,
  needsCall: boolean
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (wasSearching) {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER)
    ctx.addLog(`¡${trainerName || 'El entrenador'} te desafía!`, 'log-info', 'enemy_trainer')
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.RETREAT_AND_FADEOUT)
    
    if (ctx.animations?.triggerTrainerRetreat) {
      await ctx.animations.triggerTrainerRetreat()
    }
  } else {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENTRY)
    if (ctx.animations?.triggerTrainerEntry) {
      await ctx.animations.triggerTrainerEntry()
    }

    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SHOW_DIALOGS)
    if (battleState?.trainerArchetype === 'policeman') {
      ctx.audio.play('siren')
    }

    if (ctx.animations?.triggerTrainerDialogs) {
      await ctx.animations.triggerTrainerDialogs()
    }

    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER)
    ctx.addLog(`¡${trainerName || 'El entrenador'} te desafía!`, 'log-info', 'enemy_trainer')
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.RETREAT_AND_FADEOUT)
    
    if (ctx.animations?.triggerTrainerRetreat) {
      await ctx.animations.triggerTrainerRetreat()
    }
  }

  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.POKEMON_CALL)
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = initialEnemy
  }

  ctx.addLog(`¡${trainerName || 'El entrenador'} envía a ${initialEnemy.name}!`, 'log-enemy', 'enemy_trainer')

  const enemySendOutPromise = ctx.animations?.handleReleaseRequest
    ? ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: initialEnemy })
    : Promise.resolve()
  await enemySendOutPromise

  await executePokemonCallSequence(ctx, initialPlayer, needsCall)
}

export async function runWildSearchIntroSequence(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  needsCall: boolean
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENCOUNTER)
  ctx.addLog(`¡Un ${initialEnemy.name} salvaje apareció!`, 'log-info', initialEnemy)
  gameBus.emit('PLAY_CRY', { name: initialEnemy.id })
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.CHECK_BINOCULARS)
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_JUMP)
  
  const oldPlayerBeforeSearch = needsCall ? ctx.activeBattle.value?.player ?? null : null
  const hasRealSwap = oldPlayerBeforeSearch && oldPlayerBeforeSearch.uid !== initialPlayer.uid

  if (needsCall && ctx.activeBattle.value) {
    if (hasRealSwap) ctx.exitingPlayer.value = oldPlayerBeforeSearch
    ctx.activeBattle.value.player = initialPlayer
  }

  const promises: Promise<void>[] = []
  if (ctx.animations?.triggerSearchEncounter) {
    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.JUMP_SHADOW)
    promises.push(ctx.animations.triggerSearchEncounter())
  }

  if (needsCall && ctx.animations?.handleReleaseRequest) {
    if (hasRealSwap && ctx.animations.handleCatchRequest) {
      promises.push(ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPlayerBeforeSearch }))
    }
    promises.push(ctx.animations.handleReleaseRequest({ side: 'player', pokemon: initialPlayer }))
  }

  if (promises.length > 0) {
    await Promise.all(promises)
  }
  if (hasRealSwap) ctx.exitingPlayer.value = null
}

export async function runWildGrassIntroSequence(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  needsCall: boolean
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
  ctx.addLog(`¡Un ${initialEnemy.name} salvaje apareció!`, 'log-info', initialEnemy)
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_PREP, 0)
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_VISIBLE)
  await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_MODE)

  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = initialEnemy
  }

  await executePokemonCallSequence(ctx, initialPlayer, needsCall)
}
