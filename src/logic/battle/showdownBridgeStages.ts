import type { SBCtx } from './showdownBridgeCtx';
import { modifyStatStage } from '@/logic/pokemon/statsMath';

/** 
 * NATIVE SHOWDOWN STAT STAGE KEYS
 * Showdown natively emits: atk, def, spa, spd, spe, accuracy, evasion
 */
export const SHOWDOWN_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'] as const;
type ShowdownStatKey = typeof SHOWDOWN_STAT_KEYS[number];
const SHOWDOWN_STAT_KEYS_SET: ReadonlySet<string> = new Set<string>(SHOWDOWN_STAT_KEYS); // runtime-set

function isShowdownStatKey(key: string): key is ShowdownStatKey {
  return SHOWDOWN_STAT_KEYS_SET.has(key);
}

function applyBoostOrSet(ctx: SBCtx, isSet: boolean): boolean {
  const { store, parts, getPoke, getSide } = ctx;
  const target = getPoke(parts[2] || parts[1] || '');
  const stat = parts[3] || '';
  const amount = parseInt(parts[4] || '1', 10);
  if (target && isShowdownStatKey(stat)) {
    const targetSide = getSide(parts[2] || parts[1] || '');
    const stages = targetSide === 'player' ? store.playerStages.value : store.enemyStages.value;
    if (stages) {
      if (isSet) {
        stages[stat] = Math.max(-6, Math.min(6, amount));
      } else {
        modifyStatStage(stages, stat, amount);
      }
      const msg = amount === 6
        ? `¡El ${stat.toUpperCase()} de ${target.name} se maximizó!` // text-ok
        : `¡El ${stat.toUpperCase()} de ${target.name} aumentó!`; // text-ok
      store.addLog(msg, 'log-info', target);
    }
  }
  return true;
}

function applyUnboost(ctx: SBCtx): boolean {
  const { store, parts, getPoke, getSide } = ctx;
  const target = getPoke(parts[2] || '');
  const stat = parts[3] || '';
  const amount = parseInt(parts[4] || '1', 10);
  if (target && isShowdownStatKey(stat)) {
    const targetSide = getSide(parts[2] || '');
    const stages = targetSide === 'player' ? store.playerStages.value : store.enemyStages.value;
    if (stages) {
      stages[stat] = Math.max(-6, (stages[stat] || 0) - amount);
      store.addLog(`¡El ${stat.toUpperCase()} de ${target.name} disminuyó!`, 'log-info', target); // text-ok
    }
  }
  return true;
}

function applySwapBoost(ctx: SBCtx): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const src = getPoke(parts[2] || '');
  const tgt = getPoke(parts[3] || '');
  if (src && tgt) {
    const srcSide = src === p ? 'player' : 'enemy';
    const tgtSide = tgt === p ? 'player' : 'enemy';
    const srcStages = srcSide === 'player' ? store.playerStages.value : store.enemyStages.value;
    const tgtStages = tgtSide === 'player' ? store.playerStages.value : store.enemyStages.value;
    if (srcStages && tgtStages) {
      for (const key of SHOWDOWN_STAT_KEYS) {
        const srcVal = srcStages[key] || 0;
        srcStages[key] = tgtStages[key] || 0;
        tgtStages[key] = srcVal;
      }
    }
    store.addLog(`¡${src.name} e ${tgt.name} intercambiaron sus stats!`, 'log-info', src);
  }
  return true;
}

function applyInvertBoost(ctx: SBCtx): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (target) {
    const side = target === p ? 'player' : 'enemy';
    const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
    if (stages) {
      for (const key of SHOWDOWN_STAT_KEYS) {
        stages[key] = -(stages[key] || 0);
      }
    }
    store.addLog(`¡Los stats de ${target.name} se invirtieron!`, 'log-info', target);
  }
  return true;
}

function applyClearBoost(ctx: SBCtx): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (target) {
    const side = target === p ? 'player' : 'enemy';
    const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
    if (stages) {
      for (const key of SHOWDOWN_STAT_KEYS) {
        stages[key] = 0;
      }
    }
    store.addLog(`¡Los stats de ${target.name} volvieron a la normalidad!`, 'log-info', target);
  }
  return true;
}

function applyClearAllBoost(ctx: SBCtx): boolean {
  const { store, line } = ctx;
  if (line.includes('[silent]')) return true;
  if (store.playerStages.value) {
    for (const key of SHOWDOWN_STAT_KEYS) {
      store.playerStages.value[key] = 0;
    }
  }
  if (store.enemyStages.value) {
    for (const key of SHOWDOWN_STAT_KEYS) {
      store.enemyStages.value[key] = 0;
    }
  }
  store.addLog('¡Todos los cambios de stats se eliminaron!', 'log-info', '💨');
  return true;
}

function applyCopyBoost(ctx: SBCtx): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const recipient = getPoke(parts[2] || '');
  const source = getPoke(parts[3] || '');
  if (recipient && source) {
    const recSide = recipient === p ? 'player' : 'enemy';
    const srcSide = source === p ? 'player' : 'enemy';
    const recStages = recSide === 'player' ? store.playerStages.value : store.enemyStages.value;
    const srcStages = srcSide === 'player' ? store.playerStages.value : store.enemyStages.value;
    if (recStages && srcStages) {
      for (const key of SHOWDOWN_STAT_KEYS) {
        recStages[key] = srcStages[key] || 0;
      }
    }
    store.addLog(`¡${recipient.name} copió los cambios de stats de ${source.name}!`, 'log-info', recipient);
  }
  return true;
}

function applyClearDirectionalBoost(ctx: SBCtx, direction: 'positive' | 'negative'): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (target) {
    const side = target === p ? 'player' : 'enemy';
    const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
    let cleared = false;
    if (stages) {
      for (const key of SHOWDOWN_STAT_KEYS) {
        const val = stages[key] || 0;
        if ((direction === 'positive' && val > 0) || (direction === 'negative' && val < 0)) {
          stages[key] = 0;
          cleared = true;
        }
      }
    }
    if (cleared) {
      const msg = direction === 'positive'
        ? `¡Los aumentos de ${target.name} fueron robados!`
        : `¡Las bajadas de stats de ${target.name} fueron eliminadas!`;
      store.addLog(msg, 'log-info', target);
    }
  }
  return true;
}

const STAGE_HANDLERS: Record<string, (ctx: SBCtx) => boolean> = {
  '-boost': ctx => applyBoostOrSet(ctx, false),
  '-setboost': ctx => applyBoostOrSet(ctx, true),
  '-unboost': applyUnboost,
  '-swapboost': applySwapBoost,
  '-invertboost': applyInvertBoost,
  '-clearboost': applyClearBoost,
  '-clearallboost': applyClearAllBoost,
  '-copyboost': applyCopyBoost,
  '-clearpositiveboost': ctx => applyClearDirectionalBoost(ctx, 'positive'),
  '-clearnegativeboost': ctx => applyClearDirectionalBoost(ctx, 'negative'),
};

/**
 * Maneja eventos de cambio de stats (stages):
 * -boost, -setboost, -unboost, -swapboost, -invertboost,
 * -clearboost, -clearallboost, -copyboost,
 * -clearpositiveboost, -clearnegativeboost
 */
export function handleStageEvents(ctx: SBCtx): boolean {
  const handler = STAGE_HANDLERS[ctx.type];
  return handler ? handler(ctx) : false;
}
