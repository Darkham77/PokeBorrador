import type { Pokemon } from '@/types/pokemon/pokemon';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { BATTLE_SEAT_SPECIAL_STATES, type BattleSide } from '@/types/battle/battle';

const INIT_FSM_STATES = [
  'INITIALIZING',
  'CONTEXT_SETUP',
  'SEARCH_PHASE',
  'FIRST_INTRO'
] as const;
const INIT_FSM_STATES_SET: ReadonlySet<string> = new Set<string>(INIT_FSM_STATES); // runtime-set: Fast O(1) membership lookup set

const ENEMY_HUD_BLOCKED_STATES = [
  'CONTEXT_SETUP',
  'INITIALIZING',
  'REWARDS_PHASE',
  'LEVEL_UP_MODAL'
] as const;
const ENEMY_HUD_BLOCKED_STATES_SET: ReadonlySet<string> = new Set<string>(ENEMY_HUD_BLOCKED_STATES); // runtime-set: Fast O(1) membership lookup set

const SEARCH_WILD_PRE_STATES = [
  'CONTEXT_SETUP',
  'INITIALIZING',
  'SEARCH_PHASE'
] as const;
const SEARCH_WILD_PRE_STATES_SET: ReadonlySet<string> = new Set<string>(SEARCH_WILD_PRE_STATES); // runtime-set: Fast O(1) membership lookup set

const SEARCH_WILD_POST_STATES = [
  'REWARDS_PHASE',
  'EXIT_BATTLE'
] as const;
const SEARCH_WILD_POST_STATES_SET: ReadonlySet<string> = new Set<string>(SEARCH_WILD_POST_STATES); // runtime-set: Fast O(1) membership lookup set

const SILHOUETTE_FSM_SUBSTATES = [
  'ENTRY_ANIM',
  'ENCOUNTER_ANIM',
  'PARALLEL_PREP',
  'PARALLEL_ENTRY',
  'SILHOUETTE_MODE',
  'COMBAT_OR_FLEE'
] as const;
const SILHOUETTE_FSM_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(SILHOUETTE_FSM_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

const TECHNICAL_FSM_SUBSTATES = [
  'RECEIVE_CONFIG',
  'APPLY_ITEM_MODIFIERS',
  'WEIGHT_CALCULATION',
  'INJECT_FILTERS',
  'READY_FOR_GEN',
  'VACATE_ALL_SEATS',
  'CHECK_CONTEXT',
  'ASYNC_THREAD',
  'GEN_TEAMS',
  'MARK_EVENT',
  'PRELOAD_FINAL_COORDS',
  'SET_SEARCH_FLAG',
  'PRELOAD_COORDS'
] as const;
const TECHNICAL_FSM_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(TECHNICAL_FSM_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

const TRAINER_VISIBLE_FSM_SUBSTATES = [
  'ENCOUNTER_TYPE_CHECK',
  'TRAINER_ENTRY',
  'T_VISUAL',
  'SHOW_DIALOGS',
  'TRAINER_ENCOUNTER',
  'RETREAT_AND_FADEOUT',
  'T_RETREAT'
] as const;
const TRAINER_VISIBLE_FSM_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(TRAINER_VISIBLE_FSM_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

const SILHOUETTE_SUBSTATES = [
  'PARALLEL_PREP',
  'PARALLEL_ENTRY',
  'BUSH_VISIBLE',
  'SILHOUETTE_MODE',
  'COMBAT_OR_FLEE'
] as const;
const SILHOUETTE_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(SILHOUETTE_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

const BUSH_BEHIND_STATES = [
  'ACTIVE_BATTLE',
  'REORDER_TEAM',
  'LEVEL_UP_MODAL',
  'REWARDS_PHASE'
] as const;
const BUSH_BEHIND_STATES_SET: ReadonlySet<string> = new Set<string>(BUSH_BEHIND_STATES); // runtime-set: Fast O(1) membership lookup set

const BUSH_BEHIND_SUBSTATES = [
  'ENCOUNTER_ANIM',
  'PARALLEL_JUMP',
  'JUMP_SHADOW',
  'REVEAL_COLORS',
  'BUSH_FADE'
] as const;
const BUSH_BEHIND_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(BUSH_BEHIND_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

const JUMPING_SUBSTATES = [
  'ENCOUNTER_ANIM',
  'PARALLEL_JUMP',
  'JUMP_SHADOW'
] as const;
const JUMPING_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(JUMPING_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

const PLAYER_TECH_HIDDEN = [
  'TRAINER_ENTRY',
  'T_VISUAL'
] as const;
const PLAYER_TECH_HIDDEN_SET: ReadonlySet<string> = new Set<string>(PLAYER_TECH_HIDDEN); // runtime-set: Fast O(1) membership lookup set

const ENCOUNTER_EXCLUDE_STATES = [
  'ACTIVE_BATTLE',
  'REORDER_TEAM',
  'REWARDS_PHASE',
  'LEVEL_UP_MODAL',
  'EXIT_BATTLE'
] as const;
const ENCOUNTER_EXCLUDE_STATES_SET: ReadonlySet<string> = new Set<string>(ENCOUNTER_EXCLUDE_STATES); // runtime-set: Fast O(1) membership lookup set

const ENCOUNTER_ANIM_STATES_SET: ReadonlySet<string> = new Set<string>(BATTLE_SEAT_SPECIAL_STATES); // runtime-set: Fast O(1) membership lookup set

const ENCOUNTER_ACTIVE_SUBSTATES = [
  'PARALLEL_ENTRY',
  'PARALLEL_JUMP',
  'ENTRY_ANIM',
  'ENCOUNTER_ANIM',
  'COMBAT_OR_FLEE',
  'WILD_ENTRY',
  'BUSH_FADE',
  'REVEAL_COLORS',
  'PREPARATION',
  'AUTO_BATTLE_CHECK',
  'UPDATE_BUTTON',
  'PARALLEL_PREP',
  'BUSH_VISIBLE',
  'SILHOUETTE_MODE'
] as const;
const ENCOUNTER_ACTIVE_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(ENCOUNTER_ACTIVE_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

interface BattleSeatAnimRef {
  entry?: { isCaptureActive?: boolean; isAnimatingCapture?: boolean; animState?: string };
  exit?: { isCaptureActive?: boolean; isAnimatingCapture?: boolean; animState?: string };
}

function hasCaptureAnim(anim: { isCaptureActive?: boolean; isAnimatingCapture?: boolean; animState?: string } | undefined): boolean {
  if (!anim) return false;
  return anim.isCaptureActive === true || anim.isAnimatingCapture === true || anim.animState === 'catching';
}

function isSeatCapturing(seat: unknown): boolean {
  if (!seat || typeof seat !== 'object') return false;
  const s = seat as BattleSeatAnimRef;
  return hasCaptureAnim(s.entry) || hasCaptureAnim(s.exit);
}

function isTrainerHudBlocked(
  isTrainer: boolean,
  state: string | null | undefined,
  subState: string | null | undefined
): boolean {
  if (!isTrainer) return false;
  if (state === 'SEARCH_PHASE') return true;
  if (state === 'FIRST_INTRO' && subState !== 'POKEMON_CALL') return true;
  return false;
}

export function checkScrambleState(subState: string | null | undefined, state: string | null | undefined): boolean {
  if (state && INIT_FSM_STATES_SET.has(state)) return true;
  return Boolean(subState && SILHOUETTE_FSM_SUBSTATES_SET.has(subState));
}

export function checkEnemyTechnicalHidden(
  subState: string | null | undefined,
  state: string | null | undefined,
  isTrainer: boolean
): boolean {
  if (subState === 'GEN_TEAMS' || subState === 'MINIGAME_CHECK') return true;
  if ((state === 'CONTEXT_SETUP' || state === 'INITIALIZING') && subState && TECHNICAL_FSM_SUBSTATES_SET.has(subState)) {
    return true;
  }
  if (isTrainer) {
    if (state === 'CONTEXT_SETUP' || state === 'INITIALIZING' || state === 'SEARCH_PHASE') return true;
    if (state === 'FIRST_INTRO' && subState !== 'POKEMON_CALL') return true;
  }
  return isTrainer && Boolean(subState && TRAINER_VISIBLE_FSM_SUBSTATES_SET.has(subState));
}

export function checkFloatingState(p: { id?: string | number; ability?: string } | Pokemon | undefined | null): boolean {
  if (!p || p.id === undefined || p.id === null) return false;
  const data = pokemonDataProvider.getPokemonData(String(p.id));
  if (!data) return false;
  if (data.isFloating !== undefined) return data.isFloating;
  return data.type === 'flying' || data.type2 === 'flying' || p.ability === 'levitate';
}

export function isCombatantFaintedOrCapturing(
  seat: unknown,
  combatant: Pokemon | null | undefined,
  isFaintInProgress: boolean,
  faintedSide: string | undefined,
  expectedSide: BattleSide
): boolean {
  if (isSeatCapturing(seat)) return true;
  if (combatant && combatant.hp <= 0) return true;
  if (isFaintInProgress && faintedSide === expectedSide) return true;
  return false;
}

function evaluateWildSilhouette(
  isSearchWild: boolean,
  state: string | null | undefined,
  sub: string | null | undefined,
  isWildEntryAnimation: boolean
): boolean {
  if (state === 'SEARCH_PHASE') return true;
  if (isSearchWild && state) {
    if (SEARCH_WILD_PRE_STATES_SET.has(state)) return true;
    if (SEARCH_WILD_POST_STATES_SET.has(state) && !isWildEntryAnimation) return true;
  }
  return Boolean(sub && SILHOUETTE_SUBSTATES_SET.has(sub));
}

export function isBushBehindCheck(
  isEmerging: boolean,
  isWildEntryAnimation: boolean,
  state: string | null | undefined,
  sub: string | null | undefined
): boolean {
  if (isEmerging || isWildEntryAnimation) return true;
  if (state && BUSH_BEHIND_STATES_SET.has(state)) return true;
  return Boolean(sub && BUSH_BEHIND_SUBSTATES_SET.has(sub));
}

export function isEnemyJumpingCheck(isEmerging: boolean, sub: string | null | undefined): boolean {
  if (!sub) return false;
  return Boolean(isEmerging && JUMPING_SUBSTATES_SET.has(sub));
}

export function isPlayerTechHiddenCheck(isTrainer: boolean, sub: string | null | undefined): boolean {
  return Boolean(isTrainer && sub && PLAYER_TECH_HIDDEN_SET.has(sub));
}

export function shouldShowEncounterLayersCheck(
  hasEnemy: boolean,
  state: string | null | undefined,
  animState: string | null | undefined,
  isCaptureSequenceActive: boolean,
  isFaintInProgress: boolean,
  isEnemyFloating: boolean,
  fsmSub: string | null | undefined,
  isWildEncounter: boolean,
  isSearching: boolean,
  wildRevealActive: boolean
): boolean {
  if (!hasEnemy) return false;
  if (state && ENCOUNTER_EXCLUDE_STATES_SET.has(state)) return false;
  if (animState && ENCOUNTER_ANIM_STATES_SET.has(animState)) return false;
  if (isCaptureSequenceActive || isFaintInProgress || isEnemyFloating) return false;
  if (fsmSub && ENCOUNTER_ACTIVE_SUBSTATES_SET.has(fsmSub)) return isWildEncounter;
  return isWildEncounter && (isSearching || wildRevealActive);
}

export function isEnemyHudSuppressedCheck(
  minigame: string | null | undefined,
  fsmState: string | null | undefined,
  fsmSub: string | null | undefined,
  isTrainer: boolean,
  seat2: unknown,
  enemy: Pokemon | null | undefined,
  isFaintInProgress: boolean,
  faintedSide: string | undefined
): boolean {
  if (minigame === 'archaeology') return true;
  if (fsmState === 'CONTEXT_SETUP' || fsmState === 'INITIALIZING') return true;
  if (isTrainerHudBlocked(isTrainer, fsmState, fsmSub)) return true;
  if (isCombatantFaintedOrCapturing(seat2, enemy, isFaintInProgress, faintedSide, 'enemy')) return true;
  return !enemy;
}

export function buildActiveEnemyHudData(
  state: string | null | undefined,
  subState: string | null | undefined,
  isTrainer: boolean,
  enemySeat: unknown,
  caughtSnapshot: Pokemon | null | undefined,
  isFaintInProgress: boolean,
  faintedSnapshot: { side?: string } | null | undefined,
  enemyRef: Pokemon | null | undefined
): Pokemon | null {
  if (state && ENEMY_HUD_BLOCKED_STATES_SET.has(state)) return null;
  if (isTrainerHudBlocked(isTrainer, state, subState)) return null;
  if (isSeatCapturing(enemySeat) && caughtSnapshot) return caughtSnapshot;
  if (isFaintInProgress && faintedSnapshot?.side === 'enemy') return faintedSnapshot as Pokemon;
  return enemyRef || null;
}

export function buildActiveEnemyData(
  state: string | null | undefined,
  sub: string | null | undefined,
  isTrainer: boolean,
  activeEnemyHud: Pokemon | null
): Pokemon | null {
  if (state === 'CONTEXT_SETUP' || state === 'INITIALIZING') return null;
  if (state === 'REWARDS_PHASE' && sub === 'EMPTY_WAIT') return null;
  if (isTrainerHudBlocked(isTrainer, state, sub)) return null;
  return activeEnemyHud;
}

export function buildActiveEnemyIsSilhouette(
  isTrainer: boolean,
  isGym: boolean,
  isPvP: boolean,
  isWildSilhouette: boolean,
  isSilhouetteMode: boolean,
  wasSearching: boolean,
  isSearching: boolean,
  state: string | null | undefined,
  sub: string | null | undefined,
  isWildEntryAnimation: boolean
): boolean {
  if (isTrainer || isGym || isPvP) return false;
  if (isWildSilhouette || isSilhouetteMode) return true;
  const isSearchWild = Boolean(wasSearching || isSearching);
  return evaluateWildSilhouette(isSearchWild, state, sub, isWildEntryAnimation);
}

