import { nextTick } from 'vue'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
export async function processSearchPhaseSequence(
  ctx: BattleContext,
  finalEnemyPoke: Pokemon,
  isFishing: boolean,
  isArchaeology: boolean,
  isTrainer: boolean,
  isGym: boolean
): Promise<boolean> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (isFishing || isArchaeology) {
    ctx.isIntroAnimating.value = false
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.enemy = finalEnemyPoke
      ctx.activeBattle.value.isFishing = isFishing
      ctx.activeBattle.value.isArchaeology = isArchaeology
    }
    await fsm.transition(BATTLE_STATES.INITIALIZING)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
    return true
  }

  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION)
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.AUTO_BATTLE_CHECK)
  
  const { useUIStore } = await import('@/stores/ui')
  const uiStore = useUIStore()
  const autoBattle = uiStore.autoBattle && !isTrainer

  if (!autoBattle) {
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.UPDATE_BUTTON)
  }
  
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM)
  if (isTrainer || isGym) {
    if (ctx.animations?.triggerTrainerEntry) {
      await ctx.animations.triggerTrainerEntry()
    }
  }
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REORDER_TEAM)
  
  if (ctx.activeBattle.value?.trainerArchetype === 'policeman') {
    ctx.audio.play('siren')
  }

  if (!autoBattle) {
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
  } else {
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.enemy = finalEnemyPoke
      ctx.activeBattle.value.isFishing = isFishing
      ctx.activeBattle.value.isArchaeology = isArchaeology
    }
    const { startEncounter } = await import('./searchLoop.ts')
    await nextTick()
    await startEncounter(ctx)
    return true
  }

  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = finalEnemyPoke
    ctx.activeBattle.value.isFishing = isFishing
    ctx.activeBattle.value.isArchaeology = isArchaeology
    if (ctx.persistBattle) ctx.persistBattle()
  }
  return true
}
