import type { SBCtx } from './showdownBridgeCtx';
import { modifyStatStage } from '@/logic/pokemon/statsMath';

/** 
 * NATIVE SHOWDOWN STAT STAGE KEYS
 * Showdown natively emits: atk, def, spa, spd, spe, accuracy, evasion
 */
export const SHOWDOWN_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'] as const;
type ShowdownStatKey = typeof SHOWDOWN_STAT_KEYS[number];
const SHOWDOWN_STAT_KEYS_SET: ReadonlySet<string> = new Set<string>(SHOWDOWN_STAT_KEYS); // runtime-set: Fast O(1) membership lookup set

function isShowdownStatKey(key: string): key is ShowdownStatKey {
  return SHOWDOWN_STAT_KEYS_SET.has(key);
}

function getTargetStages(ctx: SBCtx, target: NonNullable<ReturnType<SBCtx['getPoke']>>) {
  const isPlayer = target === ctx.p;
  return isPlayer ? ctx.store.playerStages.value : ctx.store.enemyStages.value;
}

function resetStages(stages: Record<ShowdownStatKey, number> | undefined) {
  if (!stages) return;
  for (const key of SHOWDOWN_STAT_KEYS) {
    stages[key] = 0;
  }
}

function copyStages(src: Record<ShowdownStatKey, number> | undefined, tgt: Record<ShowdownStatKey, number> | undefined) {
  if (!src || !tgt) return;
  for (const key of SHOWDOWN_STAT_KEYS) {
    tgt[key] = src[key] || 0;
  }
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
        ? `¡El ${stat.toUpperCase()} de ${target.name} se maximizó!` // text-ok: Combat stat maximized log message
        : `¡El ${stat.toUpperCase()} de ${target.name} aumentó!`; // text-ok: UI text display localization string
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
      store.addLog(`¡El ${stat.toUpperCase()} de ${target.name} disminuyó!`, 'log-info', target); // text-ok: UI text display localization string
    }
  }
  return true;
}

function applySwapBoost(ctx: SBCtx): boolean {
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const src = getPoke(parts[2] || '');
  const tgt = getPoke(parts[3] || '');
  if (src && tgt) {
    const srcStages = getTargetStages(ctx, src);
    const tgtStages = getTargetStages(ctx, tgt);
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
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (target) {
    const stages = getTargetStages(ctx, target);
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
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (target) {
    resetStages(getTargetStages(ctx, target));
    store.addLog(`¡Los stats de ${target.name} volvieron a la normalidad!`, 'log-info', target);
  }
  return true;
}

function applyClearAllBoost(ctx: SBCtx): boolean {
  const { store, line } = ctx;
  if (line.includes('[silent]')) return true;
  resetStages(store.playerStages.value);
  resetStages(store.enemyStages.value);
  store.addLog('¡Todos los cambios de stats se eliminaron!', 'log-info', '💨');
  return true;
}

function applyCopyBoost(ctx: SBCtx): boolean {
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const recipient = getPoke(parts[2] || '');
  const source = getPoke(parts[3] || '');
  if (recipient && source) {
    copyStages(getTargetStages(ctx, source), getTargetStages(ctx, recipient));
    store.addLog(`¡${recipient.name} copió los cambios de stats de ${source.name}!`, 'log-info', recipient);
  }
  return true;
}

function applyClearDirectionalBoost(ctx: SBCtx, direction: 'positive' | 'negative'): boolean {
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  if (target) {
    const stages = getTargetStages(ctx, target);
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
