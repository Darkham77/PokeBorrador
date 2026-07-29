import type { SBCtx } from './showdownBridgeCtx';

/** 
 * NATIVE SHOWDOWN STAT STAGE KEYS
 * Showdown natively emits: atk, def, spa, spd, spe, accuracy, evasion
 */
export const SHOWDOWN_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'] as const;
type ShowdownStatKey = typeof SHOWDOWN_STAT_KEYS[number];

/**
 * Maneja eventos de cambio de stats (stages):
 * -boost, -setboost, -unboost, -swapboost, -invertboost,
 * -clearboost, -clearallboost, -copyboost,
 * -clearpositiveboost, -clearnegativeboost
 */
export function handleStageEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, p, getPoke, getSide } = ctx;

  switch (type) {
    case '-boost':
    case '-setboost': {
      const target = getPoke(parts[2] || parts[1] || '');
      const stat = parts[3] || '';
      const amount = parseInt(parts[4] || '1');
      if (target && SHOWDOWN_STAT_KEYS.includes(stat as ShowdownStatKey)) {
        const targetSide = getSide(parts[2] || parts[1] || '');
        const stages = targetSide === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (stages) {
          const key = stat as ShowdownStatKey;
          if (type === '-setboost') {
            stages[key] = Math.max(-6, Math.min(6, amount));
          } else {
            stages[key] = Math.max(-6, Math.min(6, (stages[key] || 0) + amount));
          }
          const msg = amount === 6
            ? `¡El ${key.toUpperCase()} de ${target.name} se maximizó!` // text-ok
            : `¡El ${key.toUpperCase()} de ${target.name} aumentó!`; // text-ok
          store.addLog(msg, 'log-info', target);
        }
      }
      return true;
    }

    case '-unboost': {
      const target = getPoke(parts[2] || '');
      const stat = parts[3] || '';
      const amount = parseInt(parts[4] || '1');
      if (target && SHOWDOWN_STAT_KEYS.includes(stat as ShowdownStatKey)) {
        const targetSide = getSide(parts[2] || '');
        const stages = targetSide === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (stages) {
          const key = stat as ShowdownStatKey;
          stages[key] = Math.max(-6, (stages[key] || 0) - amount);
          store.addLog(`¡El ${key.toUpperCase()} de ${target.name} disminuyó!`, 'log-info', target); // text-ok
        }
      }
      return true;
    }

    case '-swapboost': {
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

    case '-invertboost': {
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

    case '-clearboost': {
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

    case '-clearallboost': {
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

    case '-copyboost': {
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

    case '-clearpositiveboost': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const side = target === p ? 'player' : 'enemy';
        const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
        let cleared = false;
        if (stages) {
          for (const key of SHOWDOWN_STAT_KEYS) {
            if ((stages[key] || 0) > 0) {
              stages[key] = 0;
              cleared = true;
            }
          }
        }
        if (cleared) {
          store.addLog(`¡Los aumentos de ${target.name} fueron robados!`, 'log-info', target);
        }
      }
      return true;
    }

    case '-clearnegativeboost': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const side = target === p ? 'player' : 'enemy';
        const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
        let cleared = false;
        if (stages) {
          for (const key of SHOWDOWN_STAT_KEYS) {
            if ((stages[key] || 0) < 0) {
              stages[key] = 0;
              cleared = true;
            }
          }
        }
        if (cleared) {
          store.addLog(`¡Las bajadas de stats de ${target.name} fueron eliminadas!`, 'log-info', target);
        }
      }
      return true;
    }

    default:
      return false;
  }
}
