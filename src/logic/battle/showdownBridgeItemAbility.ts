import type { SBCtx } from './showdownBridgeCtx.ts';
import { requireVolatileStatusKey } from '../../types/pokemon/pokemon.ts';
import { toID } from '@/logic/utils/strings.ts';
import { requireAbilityId } from '../../data/battle/abilities.ts';
import { requireItemId } from '../../data/inventory/items.ts';

export function handleItemAndAbilityEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, p, getPoke } = ctx;

  switch (type) {
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
        if (target.volatileCounters) {
          delete target.volatileCounters['twoturnmove'];
        }
        const style = target === p ? 'log-player' : 'log-enemy';
        const cantMessages: Record<string, string> = {
          'par': 'está paralizado y no puede moverse',
          'slp': 'está dormido',
          'frz': 'está congelado',
          'attract': 'está enamorado y no puede atacar',
          'recharge': 'debe recargar',
          'disable': 'tiene el movimiento desactivado',
          'flinch': 'retrocedió',
          'ability: truant': 'está haraganeando (Truant)',
          'truant': 'está haraganeando (Truant)'
        };
        const cleanReason = reason.toLowerCase(); // text-ok
        const hint = cantMessages[cleanReason] ?? (cleanReason.includes('truant') ? 'está haraganeando (Truant)' : 'no puede moverse');
        store.addLog(`¡${target.name} ${hint}!`, style, target);
      }
      return true;
    }

    case '-activate': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const rawEffect = parts[3] || parts[2] || '';
      const isMoveEffect = rawEffect.startsWith('move: ');
      const isAbilityEffect = rawEffect.startsWith('ability: ');
      const effect = rawEffect.replace('move: ', '').replace('ability: ', '');
      if (target) {
        if (!target.volatileCounters) target.volatileCounters = {};
        const cleanEff = toID(effect);
        if (cleanEff !== 'mist') {
          target.volatileCounters[requireVolatileStatusKey(cleanEff)] = 1;
        }

        if (cleanEff.includes('confusion')) {
          store.addLog(`¡${target.name} está confundido y se lastimó!`, 'log-info', target);
        } else if (cleanEff.includes('mist')) {
          store.addLog(`¡El Velo Sagrado protegió a ${target.name}!`, 'log-info', target);
        } else if (cleanEff.includes('substitute')) {
          store.addLog(`¡El Sustituto de ${target.name} recibió el golpe!`, 'log-info', target);
        } else if (effect) {
          const logMsg = isAbilityEffect 
            ? `¡Habilidad ${effect} se activó en ${target.name}!`
            : isMoveEffect
              ? `¡Movimiento ${effect} se activó en ${target.name}!`
              : `¡${effect} se activó en ${target.name}!`;
          store.addLog(logMsg, 'log-info', target);
        }
      }
      return true;
    }

    case '-ability': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const rawAbility = parts[3];
      if (!rawAbility) {
        throw new Error(`[ShowdownBridge] Log line |-ability| is missing ability parameter: "${line}"`);
      }
      const fromClause = parts.find(pKey => pKey.startsWith('[from]'));
      if (target) {
        const canonicalAbility = requireAbilityId(toID(rawAbility));
        target.ability = canonicalAbility;
        const fromText = fromClause ? ` (${fromClause.replace('[from]', '').trim()})` : '';
        store.addLog(`¡Habilidad: ${rawAbility} de ${target.name}!${fromText}`, 'log-info', target);
      }
      return true;
    }

    case '-endability': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        target.ability = undefined;
        store.addLog(`¡La habilidad de ${target.name} fue suprimida!`, 'log-info', target);
      }
      return true;
    }

    case '-item': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (!target) {
        throw new Error(`[ShowdownBridge] Target pokemon not found for -item line: "${line}"`);
      }
      const rawItem = parts[3];
      if (!rawItem) {
        throw new Error(`[ShowdownBridge] Log line |-item| is missing item parameter: "${line}"`);
      }
      const canonicalItem = requireItemId(toID(rawItem));
      target.heldItem = canonicalItem;
      target.item = canonicalItem;
      target.lastItem = null;
      store.addLog(`¡${target.name} tiene ${rawItem}!`, 'log-info', target);
      return true;
    }

    case '-enditem': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (!target) {
        throw new Error(`[ShowdownBridge] Target pokemon not found for -enditem line: "${line}"`);
      }
      const rawItem = parts[3];
      if (!rawItem) {
        throw new Error(`[ShowdownBridge] Log line |-enditem| is missing item parameter: "${line}"`);
      }
      const canonicalItem = requireItemId(toID(rawItem));
      target.lastItem = canonicalItem;
      target.heldItem = null;
      target.item = null;
      const verb = line.includes('[eat]') ? 'comió su' : 'perdió su';
      store.addLog(`¡${target.name} ${verb} ${rawItem}!`, 'log-info', target);
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

    case '-singlemove':
    case '-singleturn': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const moveOrEffect = parts[3] || '';
      const cleanEffect = requireVolatileStatusKey(toID(moveOrEffect.startsWith('move:') ? moveOrEffect.replace('move:', '') : moveOrEffect));
      if (target) {
        if (!target.volatileCounters) target.volatileCounters = {};
        target.volatileCounters[cleanEffect] = 1;
        if (cleanEffect === 'protect' || cleanEffect === 'detect' || cleanEffect === 'endure') {
          store.addLog(`¡${target.name} se protegió!`, 'log-info', target);
        }
      }
      return true;
    }

    case 'swap': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const newPos = parseInt(parts[3] || '0', 10);
      if (target) {
        if (!isNaN(newPos)) {
          Reflect.set(target, 'position', newPos);
          target.slotIndex = newPos;
        }
        store.addLog(`¡${target.name} cambió de posición!`, 'log-info', target);
      }
      return true;
    }

    default:
      return false;
  }
}
