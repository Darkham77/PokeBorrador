import type { SBCtx } from './showdownBridgeCtx.ts';
import { isForcedSwitchMove } from './helpers/forcedSwitchRegistry.ts';
import { handleGimmickEvents } from './showdownBridgeGimmicks.ts';
import { handleItemAndAbilityEvents } from './showdownBridgeItemAbility.ts';
import { handleSwitchAndDragEvents } from './showdownBridgeSwitchDrag.ts';

const IGNORED_PROTOCOL_EVENTS = [
  'gen', 'gametype', 'teamsize', 'rated', 'tier', 'showteam',
  'debug', 'bigerror', 'event', '-candynamax', '-center',
  '-combine', '-waiting', 'custom', '-anim',
] as const;
const IGNORED_PROTOCOL_EVENTS_SET: ReadonlySet<string> = new Set<string>(IGNORED_PROTOCOL_EVENTS); // runtime-set

function handleFailEvent(ctx: SBCtx): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (!target) return true;

  const style = target === p ? 'log-player' : 'log-enemy';
  const lastMoveId = target.lastMove?.id || store.activeMove?.value?.id || '';
  const isPlayerAttacking = target === p;
  const opponentTeam = isPlayerAttacking
    ? (store.activeBattle.value?.enemyTeam || (store.activeBattle.value?.enemy ? [store.activeBattle.value.enemy] : []))
    : (store.activeBattle.value?.playerTeam || (store.activeBattle.value?.player ? [store.activeBattle.value.player] : []));
  const currentOpponentUid = isPlayerAttacking
    ? store.activeBattle.value?.enemy?.uid
    : store.activeBattle.value?.player?.uid;
  const aliveOpponentsOnBench = opponentTeam.filter(mon => mon && mon.hp > 0 && mon.uid !== currentOpponentUid);

  if (isForcedSwitchMove(lastMoveId) && aliveOpponentsOnBench.length === 0) {
    store.addLog(`¡El movimiento de ${target.name} falló porque no hay ningún Pokémon en la banca para cambiar!`, style, target);
  } else {
    store.addLog(`¡El movimiento de ${target.name} falló!`, style, target);
  }
  return true;
}

function handleTurnOrUpkeep(ctx: SBCtx): boolean {
  const { store, type, parts } = ctx;
  if (store.activeBattle.value) {
    if (type === 'turn') {
      const turnNum = parseInt(parts[2] || '1', 10);
      store.activeBattle.value.turnCount = turnNum;
    }
    const seatKeys = ['player', 'playerB', 'enemy', 'enemyB', 'p1', 'p2', 'p3', 'p4'] as const;
    seatKeys.forEach(k => {
      const mon = Reflect.get(store.activeBattle.value!, k) as { volatileCounters?: Record<string, number> } | null | undefined;
      if (mon && mon.volatileCounters) {
        delete mon.volatileCounters['protect'];
        delete mon.volatileCounters['flinch'];
        delete mon.volatileCounters['endure'];
      }
    });
  }
  return true;
}

function handleFeedbackEvent(ctx: SBCtx): boolean {
  const { store, type, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;

  switch (type) {
    case '-notarget': {
      const target = getPoke(parts[2] || '');
      store.addLog(target ? `¡No hay objetivo para el movimiento de ${target.name}!` : '¡No hay objetivo válido!', 'log-info', target || undefined);
      return true;
    }
    case '-hint':
    case '-message':
    case 'message': {
      const msg = parts[2] || parts[1] || '';
      if (msg && !msg.startsWith('http')) store.addLog(msg, 'log-info');
      return true;
    }
    case '-miss': {
      const attacker = getPoke(parts[2] || '');
      if (attacker) {
        const style = attacker === p ? 'log-player' : 'log-enemy';
        store.addLog(`¡El ataque de ${attacker.name} falló!`, style, attacker);
      }
      return true;
    }
    case '-immune': {
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡No afecta a ${target.name}!`, 'log-info', target);
      return true;
    }
    case '-crit': {
      const target = getPoke(parts[2] || '');
      store.addLog(target ? `¡Golpe crítico contra ${target.name}!` : '¡Golpe crítico!', 'log-info', target || '⚡');
      return true;
    }
    case '-supereffective':
      store.addLog('¡Es súper efectivo!', 'log-info', '🔥');
      return true;
    case '-resisted':
      store.addLog('No es muy efectivo...', 'log-info', '💧');
      return true;
    case '-block': {
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} bloqueó el ataque!`, 'log-info', target);
      return true;
    }
    case '-hitcount': {
      const num = parseInt(parts[3] || '0', 10);
      if (num > 0) store.addLog(`¡Golpeó ${num} ${num === 1 ? 'vez' : 'veces'}!`, 'log-info', '🎯');
      return true;
    }
    case '-ohko':
      store.addLog('¡Derrota instantánea!', 'log-info', '💀');
      return true;
    default:
      return false;
  }
}

/**
 * Handles miscellaneous events, battle logs, turns, and delegates to specialized sub-bridges.
 */
export function handleMiscEvents(ctx: SBCtx): boolean | Promise<boolean> {
  const { type } = ctx;

  if (IGNORED_PROTOCOL_EVENTS_SET.has(type)) {
    return true;
  }

  if (type === 'switch' || type === 'drag') {
    return handleSwitchAndDragEvents(ctx);
  }

  if (type === '-fail') {
    return handleFailEvent(ctx);
  }

  if (type === 'turn' || type === 'upkeep') {
    return handleTurnOrUpkeep(ctx);
  }

  if (handleFeedbackEvent(ctx)) {
    return true;
  }

  if (handleItemAndAbilityEvents(ctx)) return true;
  if (handleGimmickEvents(ctx)) return true;

  return false;
}
