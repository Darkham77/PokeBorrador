import type { SBCtx } from './showdownBridgeCtx.ts';
import { isPokemonStatus, type Pokemon } from '../../types/pokemon/pokemon.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import { getForcedExitConfig } from './helpers/forcedSwitchRegistry.ts';
import { applyEntryHazards } from './battleFlow.ts';
import type { BattleSide, BattleState } from '@/types/battle/battle.ts';

function parseTargetStatusAndHp(target: Pokemon, rawDetails: string, hpString: string): void {
  if (target.volatileCounters) {
    target.volatileCounters = {};
  }
  if (rawDetails) {
    target.details = rawDetails;
  }
  const hpAndStatus = hpString.split(' ');
  const rawHp = hpAndStatus[0] || '0';
  const hpParts = rawHp.split('/');
  target.hp = parseInt(hpParts[0] || '0', 10);
  if (hpParts[1]) {
    const parsedMax = parseInt(hpParts[1], 10);
    if (!isNaN(parsedMax) && parsedMax > 0) target.maxHp = parsedMax;
  }
  const statusStr = hpAndStatus[1];
  if (statusStr === 'fnt') {
    target.hp = 0;
    target.fainted = true;
    target.status = '';
  } else if (statusStr && isPokemonStatus(statusStr)) {
    target.status = statusStr;
  }
}

async function handleDragExpulsion(
  ctx: SBCtx,
  side: BattleSide,
  currentMon: Pokemon
): Promise<void> {
  const { store, p, e } = ctx;
  const triggeringMoveId = store.activeMove?.value?.id || (side === 'player' ? e?.lastMove?.id || p?.lastMove?.id : p?.lastMove?.id || e?.lastMove?.id) || 'whirlwind';
  const forcedConfig = getForcedExitConfig(triggeringMoveId);
  const logStyle = side === 'player' ? 'log-player' : 'log-enemy';
  const logIcon = side === 'player' ? 'player' : 'enemy_trainer';
  store.addLog(forcedConfig.getExpulsionLog(currentMon.name), logStyle, logIcon);

  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM);
  }
  gameBus.emit('PLAY_ESCAPE_ANIM', { side, type: forcedConfig.escapeType, pokemon: currentMon });
  if (store.animations?.awaitTween) {
    await store.animations.awaitTween(side === 'player' ? 'escape-player' : 'escape-enemy');
  }
}

async function handleVoluntaryRecall(
  ctx: SBCtx,
  side: BattleSide,
  currentMon: Pokemon
): Promise<void> {
  const { store } = ctx;
  const active = store.activeBattle?.value;
  const withdrawMsg = side === 'player'
    ? `¡Bien hecho, ${currentMon.name}! ¡Regresa!`
    : `¡${active?.trainerName || 'El entrenador'} retira a ${currentMon.name}!`;
  const logStyle = side === 'player' ? 'log-info' : 'log-enemy';
  const logIcon = side === 'player' ? 'player' : 'enemy_trainer';
  store.addLog(withdrawMsg, logStyle, logIcon);

  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_RECALL);
  }
  if (store.animations?.handleWithdrawRequest) {
    await store.animations.handleWithdrawRequest({ side, pokemon: currentMon });
  }
}

async function performSideWithdrawal(
  ctx: SBCtx,
  side: BattleSide,
  currentMon: Pokemon
): Promise<void> {
  const { store, type } = ctx;
  const exitingRef = side === 'player' ? store.exitingPlayer : store.exitingEnemy;
  if (exitingRef) exitingRef.value = currentMon;

  if (type === 'drag') {
    await handleDragExpulsion(ctx, side, currentMon);
  } else {
    await handleVoluntaryRecall(ctx, side, currentMon);
  }

  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.VACATE_SEAT);
  }
  if (exitingRef) exitingRef.value = null;
}

const DEFAULT_STAGES = {
  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0
} as const;

function resetSideCombatantStages(
  store: SBCtx['store'],
  side: BattleSide,
  target: Pokemon
): void {
  const active = store.activeBattle?.value;
  if (side === 'player') {
    if (active) active.player = target;
    if (store.playerStages?.value) {
      store.playerStages.value = { ...store.playerStages.value, ...DEFAULT_STAGES };
    }
  } else {
    if (active) active.enemy = target;
    if (store.enemyStages?.value) {
      store.enemyStages.value = { ...store.enemyStages.value, ...DEFAULT_STAGES };
    }
  }

  if (active?.participants && !active.participants.includes(target.uid)) {
    active.participants.push(target.uid);
  }
}

function logSendOutMessage(
  store: SBCtx['store'],
  side: BattleSide,
  target: Pokemon,
  isDrag: boolean,
  isSilent: boolean
): void {
  const active = store.activeBattle?.value;
  if (isDrag) {
    const logStyle = side === 'player' ? 'log-player' : 'log-enemy';
    const logIcon = side === 'player' ? target : 'enemy_trainer';
    store.addLog(`¡${target.name} fue arrastrado al campo!`, logStyle, logIcon);
  } else if (!isSilent) {
    const sendOutMsg = side === 'player'
      ? `¡Adelante, ${target.name}!`
      : `¡${active?.trainerName || 'El entrenador'} envía a ${target.name}!`;
    const logStyle = side === 'player' ? 'log-player' : 'log-enemy';
    const logIcon = side === 'player' ? target : 'enemy_trainer';
    store.addLog(sendOutMsg, logStyle, logIcon);
  }
}

async function performSideSendOut(
  ctx: SBCtx,
  side: BattleSide,
  target: Pokemon,
  isSilent: boolean
): Promise<void> {
  const { store, type } = ctx;

  resetSideCombatantStages(store, side, target);

  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_CALL);
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.RENDER_BALL);
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.OCCUPY_SEAT);
  }

  logSendOutMessage(store, side, target, type === 'drag', isSilent);

  if (store.animations?.handleReleaseRequest) {
    await store.animations.handleReleaseRequest({ side, pokemon: target });
  }

  const stages = (side === 'player' ? store.playerStages?.value : store.enemyStages?.value) || {};
  applyEntryHazards(target, stages, store.addLog);
}

function handleSameMonSwitch(
  active: BattleState,
  side: BattleSide,
  target: Pokemon,
  isSilent: boolean,
  addLog?: (msg: string, type: string, mon: Pokemon) => void
): void {
  if (side !== 'player') {
    active.enemy = target;
    return;
  }

  active.player = target;
  const wasSwitchLogged = Boolean(Reflect.get(active, '_playerSwitchLogged'));
  if (!isSilent && !wasSwitchLogged && addLog) {
    addLog(`¡Adelante, ${target.name}!`, 'log-player', target);
  }
  if (wasSwitchLogged) {
    Reflect.deleteProperty(active, '_playerSwitchLogged');
  }
}

async function handleDifferentMonSwitch(
  ctx: SBCtx,
  side: BattleSide,
  currentMon: Pokemon | null | undefined,
  target: Pokemon,
  isSilent: boolean
): Promise<void> {
  if (currentMon && currentMon.hp > 0 && !currentMon.fainted) {
    await performSideWithdrawal(ctx, side, currentMon);
  }
  await performSideSendOut(ctx, side, target, isSilent);
}

export async function handleSwitchAndDragEvents(ctx: SBCtx): Promise<boolean> {
  const { store, parts, line, getPoke, getSide } = ctx;
  const target = getPoke(parts[2] || '');
  if (!target) return true;

  parseTargetStatusAndHp(target, parts[3] || '', parts[4] || '');

  const side = getSide(parts[2] || '');
  const active = store.activeBattle?.value;
  if (!active || !side) {
    return true;
  }

  const isSilent = line.includes('[silent]');
  const currentMon = side === 'player' ? active.player : active.enemy;
  const isDifferentMon = !currentMon || currentMon.uid !== target.uid;

  if (isDifferentMon) {
    await handleDifferentMonSwitch(ctx, side, currentMon, target, isSilent);
  } else {
    handleSameMonSwitch(active, side, target, isSilent, store.addLog);
  }

  return true;
}
