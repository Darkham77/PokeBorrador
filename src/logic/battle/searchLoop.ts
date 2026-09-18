import type { BattleContext } from '@/types/battle/battleContext';
import { generateSearchLoopEncounter } from './searchLoopEncounterHelper.ts';
import { logger } from '../utils/logger.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleMinigame } from '@/types/battle/battle.ts';
import type { MapRouteId } from '@/data/world/map-assets';
import { nextTick } from 'vue';
import { isBattleMinigame } from './battleMinigames.ts';
import {
  handleExitToMap,
  initSearchBattleState,
  resetBattleStateForSearch,
  applyTrainerEncounter,
  applyRivalEncounter,
  applyWildOrMinigameEncounter,
  populateEnemyState,
  executeSearchPhaseTransitions,
  resolveInitialCombatants,
  type RawEncounterData
} from './searchLoopHelpers.ts';

async function resolveEncounterEntity(
  ctx: BattleContext,
  encounter: RawEncounterData | null,
  locId: MapRouteId
): Promise<{ generatedPoke: Pokemon | null; minigame: BattleMinigame | null }> {
  if (!encounter) {
    return { generatedPoke: null, minigame: null };
  }
  if (encounter.type === 'trainer') {
    const poke = await applyTrainerEncounter(ctx, locId);
    return { generatedPoke: poke, minigame: null };
  }
  if (encounter.type === 'rival') {
    const poke = await applyRivalEncounter(ctx);
    return { generatedPoke: poke, minigame: null };
  }
  const { poke, minigame } = applyWildOrMinigameEncounter(ctx, encounter);
  return { generatedPoke: poke, minigame };
}

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx: BattleContext, option = 'map') {
  if (option === 'map') {
    if (!ctx.activeBattle.value) return;
    await handleExitToMap(ctx);
    return;
  }

  const locId = initSearchBattleState(ctx);
  if (!ctx.activeBattle.value) return;

  ctx.isProcessing.value = true;
  resetBattleStateForSearch(ctx);

  await ctx.fsm.transition(ctx.BATTLE_STATES.INITIALIZING, ctx.BATTLE_SUBSTATES.CHECK_CONTEXT);
  await nextTick();

  const encounter = await generateSearchLoopEncounter(ctx, locId);
  const { generatedPoke, minigame } = await resolveEncounterEntity(ctx, encounter as RawEncounterData | null, locId);

  populateEnemyState(ctx, generatedPoke);
  await executeSearchPhaseTransitions(ctx, minigame);
}

/**
 * Triggers an encounter from the search loop.
 */
export async function triggerNextEncounter(ctx: BattleContext) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
  const fsm = ctx.fsm;
  
  ctx.isProcessing.value = false;
  const locId = ctx.activeBattle.value?.locationId;
  const enemyPoke = ctx.activeBattle.value?.enemy || ctx.activeBattle.value?._initialEnemy || ctx.activeBattle.value?.enemyTeam?.[0];
  if (!enemyPoke || !locId) {
    logger.warn('Battle', 'triggerNextEncounter: sin enemy o locationId.');
    return;
  }
  
  await fsm.transition(BATTLE_STATES.INITIALIZING);
  if (isBattleMinigame(ctx.activeBattle.value)) {
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK);
  }
  
  await ctx._startBattle(enemyPoke, {
    locationId: locId,
    wasSearching: true,
    isDebug: !!ctx.debugLoopPokemon.value,
    minigame: ctx.activeBattle.value?.minigame ?? null
  });
}

function isStartEncounterStateAllowed(
  fsm: BattleContext['fsm'],
  states: BattleContext['BATTLE_STATES'],
  substates: BattleContext['BATTLE_SUBSTATES']
): boolean {
  const curState = fsm.currentState.value;
  const curSubState = fsm.currentSubState.value;
  const isSearchConfirmation = curState === states.SEARCH_PHASE && curSubState === substates.COMBAT_OR_FLEE;
  const isMinigameCompletion = curState === states.INITIALIZING && curSubState === substates.MINIGAME_CHECK;
  return isSearchConfirmation || isMinigameCompletion;
}

export async function startEncounter(ctx: BattleContext) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
  const fsm = ctx.fsm;

  if (ctx.isProcessing.value) {
    return;
  }

  if (!isStartEncounterStateAllowed(fsm, BATTLE_STATES, BATTLE_SUBSTATES)) {
    if (fsm.currentState.value === BATTLE_STATES.FIRST_INTRO || fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
      return;
    }
    throw new Error(`[Battle] startEncounter requires SEARCH_PHASE/COMBAT_OR_FLEE or INITIALIZING/MINIGAME_CHECK; received ${fsm.currentState.value}/${fsm.currentSubState.value ?? 'none'}.`);
  }

  ctx.isProcessing.value = true;
  try {
    const enemyPoke = ctx.activeBattle.value?.enemy || ctx.activeBattle.value?._initialEnemy || null;

    if (isBattleMinigame(ctx.activeBattle.value)) {
      if (ctx.activeBattle.value && enemyPoke) {
        ctx.activeBattle.value.enemy = enemyPoke;
        ctx.activeBattle.value._initialEnemy = enemyPoke;
      }
      await fsm.transition(BATTLE_STATES.INITIALIZING);
      await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK);
      return;
    }

    const { initialPlayer, initialEnemy } = resolveInitialCombatants(ctx, enemyPoke);

    ctx.isIntroAnimating.value = true;
    await ctx.initBattle({
      initialPlayer,
      initialEnemy,
      wasSearching: true
    });
    ctx.isIntroAnimating.value = false;
  } finally {
    ctx.isProcessing.value = false;
  }
}
