import type { SBCtx } from './showdownBridgeCtx';

/**
 * Maneja eventos de cambio de stats (stages):
 * -boost, -setboost, -unboost, -swapboost, -invertboost,
 * -clearboost, -clearallboost, -copyboost,
 * -clearpositiveboost, -clearnegativeboost
 */
export function handleStageEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, p, getPoke } = ctx;

  switch (type) {
    case '-boost':
    case '-setboost': {
      const target = getPoke(parts[2] || '');
      const stat = parts[3] || '';
      const amount = parseInt(parts[4] || '1');
      if (target) {
        const side = target === p ? 'player' : 'enemy';
        const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (stages && stat in stages) {
          const key = stat as keyof typeof stages;
          if (type === '-setboost') {
            stages[key] = amount;
          } else {
            stages[key] = Math.min(6, (stages[key] || 0) + amount);
          }
          const msg = amount === 6
            ? `¡El ${stat.toUpperCase()} de ${target.name} se maximizó!`
            : `¡El ${stat.toUpperCase()} de ${target.name} aumentó!`;
          store.addLog(msg, 'log-info', target);
        }
      }
      return true;
    }

    case '-unboost': {
      const target = getPoke(parts[2] || '');
      const stat = parts[3] || '';
      const amount = parseInt(parts[4] || '1');
      if (target) {
        const side = target === p ? 'player' : 'enemy';
        const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (stages && stat in stages) {
          const key = stat as keyof typeof stages;
          stages[key] = Math.max(-6, (stages[key] || 0) - amount);
          store.addLog(`¡El ${stat.toUpperCase()} de ${target.name} disminuyó!`, 'log-info', target);
        }
      }
      return true;
    }

    case '-swapboost': {
      if (line.includes('[silent]')) return true;
      const src = getPoke(parts[2] || '');
      const tgt = getPoke(parts[3] || '');
      if (src && tgt) {
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
          (Object.keys(stages) as Array<keyof typeof stages>).forEach(k => {
            stages[k] = -(stages[k] || 0);
          });
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
          (Object.keys(stages) as Array<keyof typeof stages>).forEach(k => { stages[k] = 0; });
        }
        store.addLog(`¡Los stats de ${target.name} volvieron a la normalidad!`, 'log-info', target);
      }
      return true;
    }

    case '-clearallboost': {
      if (line.includes('[silent]')) return true;
      if (store.playerStages.value) {
        (Object.keys(store.playerStages.value) as Array<keyof typeof store.playerStages.value>)
          .forEach(k => { store.playerStages.value[k] = 0; });
      }
      if (store.enemyStages.value) {
        (Object.keys(store.enemyStages.value) as Array<keyof typeof store.enemyStages.value>)
          .forEach(k => { store.enemyStages.value[k] = 0; });
      }
      store.addLog('¡Todos los cambios de stats se eliminaron!', 'log-info', '💨');
      return true;
    }

    case '-copyboost': {
      if (line.includes('[silent]')) return true;
      const src = getPoke(parts[2] || '');
      const tgt = getPoke(parts[3] || '');
      if (src && tgt) {
        const srcSide = src === p ? 'player' : 'enemy';
        const tgtSide = tgt === p ? 'player' : 'enemy';
        const srcStages = srcSide === 'player' ? store.playerStages.value : store.enemyStages.value;
        const tgtStages = tgtSide === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (srcStages && tgtStages) {
          (Object.keys(srcStages) as Array<keyof typeof srcStages>).forEach(k => {
            tgtStages[k] = srcStages[k];
          });
        }
        store.addLog(`¡${tgt.name} copió los cambios de stats de ${src.name}!`, 'log-info', tgt);
      }
      return true;
    }

    case '-clearpositiveboost': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const side = target === p ? 'player' : 'enemy';
        const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (stages) {
          (Object.keys(stages) as Array<keyof typeof stages>).forEach(k => {
            if ((stages[k] || 0) > 0) stages[k] = 0;
          });
        }
        store.addLog(`¡Los aumentos de ${target.name} fueron robados!`, 'log-info', target);
      }
      return true;
    }

    case '-clearnegativeboost': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const side = target === p ? 'player' : 'enemy';
        const stages = side === 'player' ? store.playerStages.value : store.enemyStages.value;
        if (stages) {
          (Object.keys(stages) as Array<keyof typeof stages>).forEach(k => {
            if ((stages[k] || 0) < 0) stages[k] = 0;
          });
        }
        store.addLog(`¡Las bajadas de stats de ${target.name} fueron eliminadas!`, 'log-info', target);
      }
      return true;
    }

    default:
      return false;
  }
}
