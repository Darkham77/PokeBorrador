import type { SBCtx } from './showdownBridgeCtx';

/**
 * Maneja eventos misceláneos, efectos de combate y mecánicas Gen 6-9:
 * -miss, -immune, -fail, cant, -crit, -supereffective, -resisted, -block,
 * -hitcount, -ohko, -activate, -ability, -enditem, -item,
 * -cureteam, -mustrecharge, -formechange, -transform,
 * -singlemove, -singleturn, -endability, detailschange, replace,
 * switch, drag, -terastallize, -mega, -primal, -zpower, -zbroken,
 * -burst, -candynamax
 */
export function handleMiscEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, p, getPoke, getSide } = ctx;

  switch (type) {
    case '-miss': {
      if (line.includes('[silent]')) return true;
      const attacker = getPoke(parts[2] || '');
      if (attacker) {
        const style = attacker === p ? 'log-player' : 'log-enemy';
        store.addLog(`¡El ataque de ${attacker.name} falló!`, style, attacker);
      }
      return true;
    }

    case '-immune': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡No afecta a ${target.name}!`, 'log-info', target);
      return true;
    }

    case '-fail': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const style = target === p ? 'log-player' : 'log-enemy';
        store.addLog(`¡El movimiento de ${target.name} falló!`, style, target);
      }
      return true;
    }

    case 'cant': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const reason = parts[3] || '';
      
      if (reason === 'flinch') {
        const isPlayer = target === p;
        const activeBattle = store.activeBattle.value;
        if (isPlayer && activeBattle?.playerUsedItem) {
          return true;
        }
        if (!isPlayer && activeBattle?.enemyUsedItem) {
          return true;
        }
      }
      
      if (target) {
        const style = target === p ? 'log-player' : 'log-enemy';
        const cantMessages: Record<string, string> = {
          'par': 'está paralizado y no puede moverse',
          'slp': 'está dormido',
          'frz': 'está congelado',
          'attract': 'está enamorado y no puede atacar',
          'recharge': 'debe recargar',
          'Disable': 'tiene el movimiento desactivado',
          'flinch': 'retrocedió',
        };
        const hint = cantMessages[reason] ?? 'no puede moverse';
        store.addLog(`¡${target.name} ${hint}!`, style, target);
      }
      return true;
    }

    case '-crit':
      if (!line.includes('[silent]')) store.addLog('¡Golpe crítico!', 'log-info', '⚡');
      return true;

    case '-supereffective':
      if (!line.includes('[silent]')) store.addLog('¡Es súper efectivo!', 'log-info', '🔥');
      return true;

    case '-resisted':
      if (!line.includes('[silent]')) store.addLog('No es muy efectivo...', 'log-info', '💧');
      return true;

    case '-block': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} bloqueó el ataque!`, 'log-info', target);
      return true;
    }

    case '-hitcount': {
      if (line.includes('[silent]')) return true;
      const num = parseInt(parts[3] || '0');
      if (num > 0) store.addLog(`¡Golpeó ${num} ${num === 1 ? 'vez' : 'veces'}!`, 'log-info', '🎯');
      return true;
    }

    case '-ohko':
      if (!line.includes('[silent]')) store.addLog('¡Derrota instantánea!', 'log-info', '💀');
      return true;

    case '-activate': {
      if (line.includes('[silent]')) return true;
      const effect = (parts[3] || parts[2] || '').toLowerCase();
      if (effect.includes('confusion')) {
        const target = getPoke(parts[2] || '');
        if (target) store.addLog(`¡${target.name} está confundido y se lastimó!`, 'log-info', target);
      }
      return true;
    }

    case '-ability': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const ability = parts[3] || '';
      if (target && ability) store.addLog(`¡Habilidad: ${ability} de ${target.name}!`, 'log-info', target);
      return true;
    }

    case '-enditem': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const item = parts[3] || '';
      if (target && item) {
        const verb = line.includes('[eat]') ? 'comió su' : 'perdió su';
        store.addLog(`¡${target.name} ${verb} ${item}!`, 'log-info', target);
      }
      return true;
    }

    case '-item': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const item = parts[3] || '';
      if (target && item) store.addLog(`¡${target.name} tiene ${item}!`, 'log-info', target);
      return true;
    }

    case '-cureteam': {
      if (line.includes('[silent]')) return true;
      const user = getPoke(parts[2] || '');
      if (user) store.addLog(`¡El equipo de ${user.name} se curó de todos sus estados!`, 'log-info', user);
      return true;
    }

    case '-mustrecharge': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} debe recargar!`, 'log-info', target);
      return true;
    }

    case '-formechange': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const species = parts[3] || '';
      if (target && species) store.addLog(`¡${target.name} cambió de forma!`, 'log-info', target);
      return true;
    }

    case '-transform': {
      if (line.includes('[silent]')) return true;
      const user = getPoke(parts[2] || '');
      const species = parts[3] || '';
      if (user && species) store.addLog(`¡${user.name} se transformó en ${species}!`, 'log-info', user);
      return true;
    }

    case '-singlemove':
    case '-singleturn':
    case '-candynamax':
      return true; // Silencio intencional

    case '-endability': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡La habilidad de ${target.name} fue suprimida!`, 'log-info', target);
      return true;
    }

    case 'detailschange':
    case 'replace': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const msg = type === 'replace'
          ? `¡Era ${target.name} disfrazado!`
          : `¡${target.name} cambió de forma permanentemente!`;
        store.addLog(msg, 'log-info', target);
      }
      return true;
    }

    case 'switch':
    case 'drag': {
      const target = getPoke(parts[2] || '');
      const hpString = parts[4] || '';
      if (target && hpString) {
        const hpAndStatus = hpString.split(' ');
        const rawHp = hpAndStatus[0] || '0';
        const hpParts = rawHp.split('/');
        target.hp = parseInt(hpParts[0] || '0');
        target.maxHp = parseInt(hpParts[1] || '100');
        const statusStr = hpAndStatus[1];
        if (statusStr) {
          target.status = statusStr as import('@/types/pokemon/pokemon').PokemonStatus;
        } else {
          target.status = null;
        }

        const side = getSide(parts[2] || '');
        if (store.activeBattle.value) {
          if (side === 'player') {
            store.activeBattle.value.player = target;
            const team = store.activeBattle.value.playerTeam || [];
            const idx = team.findIndex(p => p && p.uid === target.uid);
            if (idx !== -1) {
              store.activeBattle.value.playerTeamIndex = idx;
            }
          } else if (side === 'enemy') {
            store.activeBattle.value.enemy = target;
            const team = store.activeBattle.value.enemyTeam || [];
            const idx = team.findIndex(p => p && p.uid === target.uid);
            if (idx !== -1) {
              store.activeBattle.value.enemyTeamIndex = idx;
            }
          }
        }
      }
      if (type === 'drag' && !line.includes('[silent]')) {
        if (target) store.addLog(`¡${target.name} fue arrastrado al campo!`, 'log-info', target);
      }
      return true;
    }

    case '-terastallize': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const teraType = parts[3] || '';
      if (target) store.addLog(`¡${target.name} ha Terastalizado${teraType ? ` a tipo ${teraType}` : ''}!`, 'log-info', '💎');
      return true;
    }

    case '-mega': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const stone = parts[3] || '';
      if (target) store.addLog(`¡${target.name} megaevolucionó${stone ? ` con ${stone}` : ''}!`, 'log-info', '✨');
      return true;
    }

    case '-primal': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} regresó a su forma Primigenia!`, 'log-info', '🌋');
      return true;
    }

    case '-zpower': {
      if (line.includes('[silent]')) return true;
      const user = getPoke(parts[2] || '');
      if (user) store.addLog(`¡${user.name} desató el poder del Z-Move!`, 'log-info', '⭐');
      return true;
    }

    case '-zbroken': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡El Z-Move rompió la protección de ${target.name}!`, 'log-info', '⭐');
      return true;
    }

    case '-burst': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} ha Ultra Estallado!`, 'log-info', '🌟');
      return true;
    }

    case '-anim': {
      // Registrar que la animación de movimiento fue recibida (y opcionalmente dispararla en UI)
      return true;
    }

    case 'turn': {
      const turnNum = parseInt(parts[2] || '1', 10);
      if (store.activeBattle.value) {
        store.activeBattle.value.turnCount = turnNum;
      }
      return true;
    }

    default:
      return false;
  }
}
