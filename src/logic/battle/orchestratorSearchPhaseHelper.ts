import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleMinigame, BattleState } from '@/types/battle/battle'

async function handleMinigameSequence(
  ctx: BattleContext,
  enemyPoke: Pokemon,
  minigame: BattleMinigame
): Promise<boolean> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  ctx.isIntroAnimating.value = false
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = enemyPoke
    ctx.activeBattle.value.minigame = minigame
  }
  await ctx.fsm.transition(BATTLE_STATES.INITIALIZING)
  await ctx.fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
  return true
}

function syncActiveBattleEnemy(
  battle: BattleState | null | undefined,
  enemyPoke: Pokemon,
  isWild: boolean
): void {
  if (!battle) return
  battle.enemy = isWild ? enemyPoke : null
  if (isWild) {
    battle.enemyTeam = [enemyPoke]
  }
}

async function runTrainerEntrySequence(ctx: BattleContext): Promise<void> {
  if (ctx.animations?.triggerTrainerEntry) {
    await ctx.animations.triggerTrainerEntry()
  }
}

async function runAutoBattleCheck(ctx: BattleContext, isTrainer: boolean): Promise<void> {
  const { useUIStore } = await import('@/stores/ui')
  const uiStore = useUIStore()
  const autoBattle = uiStore.autoBattle && !isTrainer

  if (!autoBattle) {
    await ctx.fsm.transition(ctx.BATTLE_STATES.SEARCH_PHASE, ctx.BATTLE_SUBSTATES.UPDATE_BUTTON)
  }
}

export async function processSearchPhaseSequence(
  ctx: BattleContext,
  finalEnemyPoke: Pokemon,
  minigame: BattleMinigame | null,
  isTrainer: boolean,
  isGym: boolean
): Promise<boolean> {
  if (minigame) {
    return handleMinigameSequence(ctx, finalEnemyPoke, minigame)
  }

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const isWild = !isTrainer && !isGym
  syncActiveBattleEnemy(ctx.activeBattle.value, finalEnemyPoke, isWild)

  await ctx.fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION)
  await ctx.fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.AUTO_BATTLE_CHECK)

  await runAutoBattleCheck(ctx, isTrainer)

  await ctx.fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM)
  if (!isWild) {
    await runTrainerEntrySequence(ctx)
  }
  await ctx.fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REORDER_TEAM)

  if (ctx.activeBattle.value?.trainerArchetype === 'policeman') {
    ctx.audio.play('siren')
  }

  await ctx.fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
  ctx.isIntroAnimating.value = false
  ctx.isProcessing.value = false

  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = isWild ? finalEnemyPoke : null
    ctx.activeBattle.value.minigame = null
    if (ctx.persistBattle) ctx.persistBattle()
  }
  return true
}
