import type { SBCtx } from './showdownBridgeCtx.ts';
import { isPokemonStatus, type Pokemon } from '../../types/pokemon/pokemon.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import { getForcedExitConfig } from './helpers/forcedSwitchRegistry.ts';
import { applyEntryHazards } from './battleFlow.ts';
import type { BattleSide } from '@/types/battle/battle.ts';

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

async function performSideWithdrawal(
  ctx: SBCtx,
  side: BattleSide,
  currentMon: Pokemon
): Promise<void> {
  const { store, type, p, e } = ctx;
  const active = store.activeBattle?.value;
  const exitingRef = side === 'player' ? store.exitingPlayer : store.exitingEnemy;
  if (exitingRef) exitingRef.value = currentMon;

  if (type === 'drag') {
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
  } else {
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

  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.VACATE_SEAT);
  }
  if (exitingRef) exitingRef.value = null;
}

async function performSideSendOut(
  ctx: SBCtx,
  side: BattleSide,
  target: Pokemon,
  isSilent: boolean
): Promise<void> {
  const { store, type } = ctx;
  const active = store.activeBattle?.value;

  if (side === 'player') {
    if (active) active.player = target;
    if (store.playerStages?.value) {
      store.playerStages.value = {
        ...store.playerStages.value,
        atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0
      };
    }
  } else {
    if (active) active.enemy = target;
    if (store.enemyStages?.value) {
      store.enemyStages.value = {
        ...store.enemyStages.value,
        atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0
      };
    }
  }

  if (active?.participants && !active.participants.includes(target.uid)) {
    active.participants.push(target.uid);
  }

  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_CALL);
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.RENDER_BALL);
    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.OCCUPY_SEAT);
  }

  if (type === 'drag') {
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

  if (store.animations?.handleReleaseRequest) {
    await store.animations.handleReleaseRequest({ side, pokemon: target });
  }

  const stages = (side === 'player' ? store.playerStages?.value : store.enemyStages?.value) || {};
  applyEntryHazards(target, stages, store.addLog);
}

export async function handleSwitchAndDragEvents(ctx: SBCtx): Promise<boolean> {
  const { store, parts, line, getPoke, getSide } = ctx;
  const target = getPoke(parts[2] || '');
  const rawDetails = parts[3] || '';
  const hpString = parts[4] || '';
  if (!target) return true;

  parseTargetStatusAndHp(target, rawDetails, hpString);

  const side = getSide(parts[2] || '');
  const active = store.activeBattle?.value;
  const isSilent = line.includes('[silent]');

  if (!active || (side !== 'player' && side !== 'enemy')) {
    return true;
  }

  const currentMon = side === 'player' ? active.player : active.enemy;
  const isDifferentMon = !currentMon || currentMon.uid !== target.uid;

  if (isDifferentMon) {
    if (currentMon && currentMon.hp > 0 && !currentMon.fainted) {
      await performSideWithdrawal(ctx, side, currentMon);
    }
    await performSideSendOut(ctx, side, target, isSilent);
  } else {
    if (side === 'player') {
      active.player = target;
      if (!isSilent && !Reflect.get(active, '_playerSwitchLogged')) {
        store.addLog(`¡Adelante, ${target.name}!`, 'log-player', target);
      }
      if (Reflect.get(active, '_playerSwitchLogged')) {
        Reflect.deleteProperty(active, '_playerSwitchLogged');
      }
    } else {
      active.enemy = target;
    }
  }

  return true;
}
