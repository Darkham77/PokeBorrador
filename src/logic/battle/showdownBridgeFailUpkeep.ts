import type { SBCtx } from './showdownBridgeCtx.ts';
import { isForcedSwitchMove } from './helpers/forcedSwitchRegistry.ts';
import { isPokemonMoveId } from '@/data/battle/moves';

export function handleFailEvent(ctx: SBCtx): boolean {
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

  if (isPokemonMoveId(lastMoveId) && isForcedSwitchMove(lastMoveId) && aliveOpponentsOnBench.length === 0) {
    store.addLog(`¡El movimiento de ${target.name} falló porque no hay ningún Pokémon en la banca para cambiar!`, style, target);
  } else {
    store.addLog(`¡El movimiento de ${target.name} falló!`, style, target);
  }
  return true;
}

export function handleTurnOrUpkeep(ctx: SBCtx): boolean {
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
