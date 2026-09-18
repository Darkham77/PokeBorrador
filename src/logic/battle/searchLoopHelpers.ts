/**
 * src/logic/battle/searchLoopHelpers.ts
 *
 * Decomposed helpers for search loop battle completion, encounters, and state management.
 */

import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleMinigame } from '@/types/battle/battle.ts';
import type { MapRouteId } from '@/data/world/map-assets';
import { requireMapRouteId } from '@/data/world/map-assets';
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { emitBattleFlowCompleted } from '@/logic/events/battleUiEvents';
import { setBattleMinigame, resetBattleMinigameFlags } from './battleMinigames.ts';
import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import { useUIStore } from '@/stores/ui';

export async function handleExitToMap(ctx: BattleContext): Promise<void> {
  const { BATTLE_STATES } = ctx;
  const isGym = ctx.activeBattle.value?.isGym ?? false;
  const returnTab = ctx.activeBattle.value?.returnTab;
  const uiStore = useUIStore();

  ctx.isProcessing.value = true;
  await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE);
  ctx.activeBattle.value = null;
  ctx.gs.state.activeBattle = null;
  ctx.isProcessing.value = false;
  ctx.clearLogs();
  uiStore.activeTab = returnTab || (isGym ? 'gyms' : 'map');
  emitBattleFlowCompleted('map');
  await ctx.gs.save?.(false);
}

export function initSearchBattleState(ctx: BattleContext): MapRouteId {
  const rawLoc = ctx.activeBattle.value?.locationId || ctx.gs.state.map?.currentMap;
  if (!rawLoc) {
    throw new Error('[Battle] locationId or gameStore.state.map.currentMap is required for search loop');
  }
  const defaultLoc = requireMapRouteId(rawLoc);

  if (!ctx.activeBattle.value) {
    ctx.activeBattle.value = {
      player: null,
      enemy: null,
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      participants: [],
      locationId: defaultLoc,
      weather: { type: 'clear', turns: -1 },
      turnCount: 0,
      escapeAttempts: 0,
      over: false,
      fled: false,
      isTrainer: false,
      isGym: false,
      minigame: null,
      rewardsProcessed: false,
      _rewardCombatants: [],
      wasSearching: true
    };
  }
  return defaultLoc;
}

export function resetBattleStateForSearch(ctx: BattleContext): void {
  const b = ctx.activeBattle.value;
  if (!b) return;

  b.enemy = null;
  b._initialEnemy = null;
  b._initialEnemies = {};
  if (ctx.exitingEnemy) ctx.exitingEnemy.value = null;
  if (ctx.exitingPlayer) ctx.exitingPlayer.value = null;
  ctx.animations?.resetAll?.();

  resetBattleMinigameFlags(b);
  b.rewardsProcessed = false;
  b.over = false;
  b.fled = false;
  b.playerFled = false;
  b._rewardCombatants = [];
  b.wasSearching = true;

  b.isGym = false;
  b.gymId = undefined;
  b.difficulty = undefined;
  b.rewardTM = undefined;
  b.isTrainer = false;
  b.enemyTeam = undefined;
  b.trainerName = undefined;
  b.trainerSprite = undefined;
  b.trainerArchetype = undefined;
  b.isRival = false;
  b.cannotEscape = false;
}

export async function applyTrainerEncounter(ctx: BattleContext, locId: MapRouteId): Promise<Pokemon | null> {
  const b = ctx.activeBattle.value!;
  const { name, sprite, quote, archetype, enemyTeam } = await buildTrainerEncounter(ctx.gs.state, locId);
  if (enemyTeam.length > 0 && enemyTeam[0]) {
    b.isTrainer = true;
    b.enemyTeam = enemyTeam;
    b.trainerName = name;
    b.trainerSprite = requireNpcSpriteId(sprite);
    b.trainerArchetype = archetype;
    b.quote = quote;
    b.isRival = false;
    b.cannotEscape = true;
    return enemyTeam[0];
  }
  return null;
}

export async function applyRivalEncounter(ctx: BattleContext): Promise<Pokemon | null> {
  const b = ctx.activeBattle.value!;
  const { name, sprite, enemyTeam, quote } = await buildRivalEncounter(ctx.gs.state.team);
  if (enemyTeam.length > 0 && enemyTeam[0]) {
    b.isTrainer = true;
    b.enemyTeam = enemyTeam;
    b.trainerName = name;
    b.trainerSprite = requireNpcSpriteId(sprite);
    b.trainerArchetype = 'rival';
    b.quote = quote;
    b.isRival = true;
    b.cannotEscape = true;
    return enemyTeam[0];
  }
  return null;
}

export interface RawEncounterData {
  type: string;
  pokemon?: Pokemon;
  rarity?: number;
}

export function applyWildOrMinigameEncounter(
  ctx: BattleContext,
  encounter: RawEncounterData
): { poke: Pokemon | null; minigame: BattleMinigame | null } {
  const b = ctx.activeBattle.value!;
  b.isTrainer = false;
  b.enemyTeam = undefined;
  b.trainerName = undefined;
  b.trainerSprite = undefined;
  b.isRival = false;
  b.isGym = false;
  b.gymId = undefined;
  b.difficulty = undefined;
  b.rewardTM = undefined;
  b.cannotEscape = false;

  let poke: Pokemon | null = null;
  let minigame: BattleMinigame | null = null;

  if (encounter.pokemon) {
    poke = encounter.pokemon;
    if (encounter.type === 'guardian') {
      poke.isGuardian = true;
    }
    if (encounter.type === 'fishing' || encounter.type === 'archaeology') {
      minigame = encounter.type as BattleMinigame;
      if (typeof encounter.rarity === 'number') {
        b.rarity = encounter.rarity;
      }
    }
  }
  return { poke, minigame };
}

export function populateEnemyState(ctx: BattleContext, generatedPoke: Pokemon | null): void {
  const b = ctx.activeBattle.value;
  if (!b || !generatedPoke) return;

  b._initialEnemy = cloneReactive(generatedPoke);
  b._initialEnemies = generatedPoke.uid ? { [generatedPoke.uid]: cloneReactive(generatedPoke) } : {};

  if (!b.isTrainer && !b.isGym && !b.isPvP) {
    b.enemy = generatedPoke;
    b.enemyTeam = [generatedPoke];
  } else {
    b.enemy = null;
    if (!b.enemyTeam || b.enemyTeam.length === 0) {
      b.enemyTeam = [generatedPoke];
    }
  }
}

export async function executeSearchPhaseTransitions(
  ctx: BattleContext,
  minigame: BattleMinigame | null
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
  const fsm = ctx.fsm;

  if (minigame) {
    setBattleMinigame(ctx.activeBattle.value!, minigame);
    ctx.isProcessing.value = false;
    await fsm.transition(BATTLE_STATES.INITIALIZING);
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK);
    emitBattleFlowCompleted('search');
    return;
  }

  await fsm.transition(BATTLE_STATES.INITIALIZING);
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS);

  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION);
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.AUTO_BATTLE_CHECK);

  const isTrainer = ctx.activeBattle.value?.isTrainer || ctx.activeBattle.value?.isGym || false;
  const uiStore = useUIStore();
  const autoBattle = uiStore.autoBattle && !isTrainer;

  if (!autoBattle) {
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.UPDATE_BUTTON);
  }

  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM);
  if (isTrainer && ctx.animations?.triggerTrainerEntry) {
    await ctx.animations.triggerTrainerEntry();
  }
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REORDER_TEAM);

  if (ctx.activeBattle.value?.trainerArchetype === 'policeman') {
    ctx.audio.play('siren');
  }

  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE);
  if (ctx.isIntroAnimating) ctx.isIntroAnimating.value = false;
  if (ctx.isProcessing) ctx.isProcessing.value = false;
  ctx.persistBattle?.();
  emitBattleFlowCompleted('search');
}

export function resolveInitialCombatants(ctx: BattleContext, enemyPoke: Pokemon | null): {
  initialPlayer: Pokemon | null;
  initialEnemy: Pokemon | null;
} {
  const b = ctx.activeBattle.value;
  const activePlayer = b?.player;
  const team = ctx.gs.state.team;
  const alivePlayer = team.find((p: Pokemon) => p && p.hp > 0);
  const initialPlayer = activePlayer ?? alivePlayer ?? team[0] ?? null;

  const enemyTeamLead = b?.enemyTeam?.[0];
  const initialEnemy = enemyPoke ?? enemyTeamLead ?? null;

  return { initialPlayer, initialEnemy };
}
