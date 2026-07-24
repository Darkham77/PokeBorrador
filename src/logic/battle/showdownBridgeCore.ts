import { toID } from '@pkmn/sim';
import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move, PokemonStatus } from '../../types/pokemon/pokemon.ts';

import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';

/**
 * Maneja los eventos básicos de combate:
 * move, -prepare, -damage, -heal, faint, -status, -curestatus, -sethp
 */
export async function handleCoreEvents(ctx: SBCtx): Promise<boolean> {
  const { store, type, parts, line, p, getPoke, getSide, turnLogs } = ctx;

  if (store.activeBattle.value && (store.activeBattle.value as unknown as { ignoreEnemyLogs?: boolean }).ignoreEnemyLogs) {
    if (type === 'move' || type === '-damage' || type === '-heal' || type === '-status' || type === '-curestatus' || type === '-sethp' || type === 'faint') {
      return true;
    }
  }

  switch (type) {
    case 'move': {
      const side = getSide(parts[2] || '');
      const attacker = getPoke(parts[2] || '');
      const moveId = parts[3] || 'Movimiento';
      const moveData = pokemonDataProvider.getMoveData(moveId);
      const translatedName = moveData?.name || moveId;

      if (attacker && side) {
        const style = attacker === p ? 'log-player' : 'log-enemy';
        store.addLog(`¡${attacker.name} usó ${translatedName}!`, style, attacker);

        const cleanMoveId = toID(moveId);
        if (cleanMoveId === 'batonpass' && store.activeBattle.value) {
          store.activeBattle.value.isBatonPass = true;
        }

        attacker.lastMove = {
          id: cleanMoveId,
          name: translatedName,
          pp: 0,
          maxPP: 0
        } as unknown as Move;

        const hasPrepareThisTurn = turnLogs?.some(l => {
          const lp = l.split('|').map(x => x.trim());
          return lp[1] === '-prepare' && getSide(lp[2] || '') === side;
        });

        if (attacker.volatileCounters && !hasPrepareThisTurn) {
          delete attacker.volatileCounters['twoturnmove'];
        }

        const isLockedMove = moveData?.effect === 'locked_move';
        if (isLockedMove && attacker.volatileCounters) {
          attacker.volatileCounters['lockedmove'] = 1;
        }

        store.attackerSide.value = side;
        store.activeMove.value = {
          id: toID(moveId),
          name: translatedName,
          cat: moveData?.cat || 'physical'
        } as unknown as Move;

        if (store.animations?.awaitTween) {
          await store.animations.awaitTween(`attack-${side}`);
        }

        store.attackerSide.value = null;
        store.activeMove.value = null;
      }
      return true;
    }

    case '-prepare': {
       const attacker = getPoke(parts[2] || '');
       const moveId = parts[3] || 'Movimiento';
       const moveData = pokemonDataProvider.getMoveData(moveId);
       const translatedName = moveData?.name || moveId;
      if (attacker) {
        if (!attacker.volatileCounters) attacker.volatileCounters = {};
        attacker.volatileCounters['twoturnmove'] = 1;
        attacker.lastMove = {
          id: toID(moveId),
          name: translatedName,
          pp: 0,
          maxPP: 0
        } as unknown as Move;
        if (!line.includes('[silent]')) {
          store.addLog(`¡${attacker.name} está cargando ${translatedName}!`, 'log-info', attacker);
        }
      }
      return true;
    }

    case '-damage': {
      const victim = getPoke(parts[2] || '');
      const hpString = parts[3] || '';
      if (victim && hpString) {
        const hpParts = hpString.split('/');
        victim.hp = parseInt(hpParts[0] || '0');
        if (hpParts[1]) {
          const parsedMax = parseInt(hpParts[1]);
          if (!isNaN(parsedMax)) victim.maxHp = parsedMax;
        }
        const fromClause = parts.find(p => p.startsWith('[from]'));
        if (fromClause) {
          const fromLower = fromClause.toLowerCase();
          if (fromLower.includes('recoil')) {
            store.addLog(`¡${victim.name} recibió daño por el retroceso!`, 'log-info', victim);
          } else if (fromLower.includes('item: life orb')) {
            store.addLog(`¡${victim.name} recibió daño de Vidasfera!`, 'log-info', victim);
          } else if (fromLower.includes('psn') || fromLower.includes('brn')) {
            const cause = fromLower.includes('brn') ? 'la quemadura' : 'el veneno';
            store.addLog(`¡${victim.name} sufrió daño por ${cause}!`, 'log-info', victim);
          } else if (fromLower.includes('sandstorm') || fromLower.includes('hail')) {
            const weatherName = fromLower.includes('sandstorm') ? 'la tormenta de arena' : 'el granizo';
            store.addLog(`¡${victim.name} sufrió daño por ${weatherName}!`, 'log-info', victim);
          } else if (fromLower.includes('leech seed')) {
            store.addLog(`¡${victim.name} fue dañado por las Drenadoras!`, 'log-info', victim);
          } else if (fromLower.includes('stealth rock') || fromLower.includes('spikes')) {
            store.addLog(`¡${victim.name} sufrió daño por las trampa(s)!`, 'log-info', victim);
          } else if (fromLower.includes('item:')) {
            const itemName = fromClause.split('item:')[1]?.trim() || 'Objeto';
            store.addLog(`¡${victim.name} sufrió daño por ${itemName}!`, 'log-info', victim);
          } else {
            store.addLog(`¡${victim.name} recibió daño!`, 'log-info', victim);
          }
        } else {
          store.addLog(`¡${victim.name} recibió daño!`, 'log-info', victim);
        }
        const side = victim === p ? 'player' : 'enemy';
        if (store.animations?.handleShakeRequest) {
          await store.animations.handleShakeRequest({ side });
        }
      }
      return true;
    }

    case '-heal': {
      const target = getPoke(parts[2] || '');
      const hpString = parts[3] || '';
      if (target && hpString) {
        const hpParts = hpString.split('/');
        target.hp = parseInt(hpParts[0] || '0');
        if (hpParts[1]) {
          const parsedMax = parseInt(hpParts[1]);
          if (!isNaN(parsedMax)) target.maxHp = parsedMax;
        }
        store.addLog(`¡${target.name} recuperó salud!`, 'log-info', target);
      }
      return true;
    }

    case 'faint': {
      const target = getPoke(parts[2] || '');
      if (target) {
        const remainedAlive = target.hp > 0;
        target.hp = 0;
        if (remainedAlive) {
          store.addLog(`¡${target.name} se debilitó!`, 'log-info', target);
        }
      }
      return true;
    }

    case '-status': {
      const target = getPoke(parts[2] || '');
      const statusType = parts[3] || '';
      if (target && statusType) {
        target.status = statusType as PokemonStatus;
        const statusMessages: Record<string, string> = {
          brn: `¡${target.name} fue quemado!`,
          psn: `¡${target.name} fue envenenado!`,
          tox: `¡${target.name} fue gravemente envenenado!`,
          slp: `¡${target.name} se quedó dormido!`,
          par: `¡${target.name} fue paralizado! ¡Quizás no pueda moverse!`,
          frz: `¡${target.name} fue congelado!`,
        };
        const msg = statusMessages[statusType] || `¡${target.name} sufrió un problema de estado: ${statusType.toUpperCase()}!`;
        store.addLog(msg, 'log-info', target);
      }
      return true;
    }

    case '-curestatus': {
      const target = getPoke(parts[2] || '');
      const curedStatus = parts[3] || '';
      if (target) {
        target.status = null;
        const cureMessages: Record<string, string> = {
          slp: `¡${target.name} se despertó!`,
          frz: `¡${target.name} se descongeló!`,
          brn: `¡${target.name} se curó de la quemadura!`,
          psn: `¡${target.name} se curó del envenenamiento!`,
          tox: `¡${target.name} se curó del envenenamiento!`,
          par: `¡${target.name} se curó de la parálisis!`,
        };
        const msg = cureMessages[curedStatus] || `¡${target.name} se curó de su estado alterado!`;
        store.addLog(msg, 'log-info', target);
      }
      return true;
    }

    case '-sethp': {
      const target = getPoke(parts[2] || '');
      const hpString = parts[3] || '';
      if (target && hpString) {
        const parsed = hpString.split('/').map(n => parseInt(n || '0'));
        const cur = parsed[0] ?? 0;
        const max = parsed[1] ?? 0;
        if (!isNaN(cur) && cur > 0) target.hp = cur;
        if (!isNaN(max) && max > 0) target.maxHp = max;
      }
      return true;
    }

    case 'player': {
      const sideId = parts[2];
      const name = parts[3];
      if (sideId && name && store.activeBattle.value) {
        if (!store.activeBattle.value.playerNames) {
          store.activeBattle.value.playerNames = {};
        }
        store.activeBattle.value.playerNames[name] = sideId === 'p1' ? 'player' : 'enemy';
      }
      return true;
    }

    case 'win':
    case 'tie': {
      const winnerName = parts[2] || 'Entrenador';
      let source: 'player' | 'enemy_trainer' = 'enemy_trainer';
      if (store.activeBattle.value?.playerNames && store.activeBattle.value.playerNames[winnerName] === 'player') {
        source = 'player';
      } else if (winnerName === 'Player') {
        source = 'player';
      }
      const msg = type === 'tie' ? '¡El combate ha terminado en empate!' : `¡El combate ha terminado! Ganador: ${winnerName}`;
      store.addLog(msg, 'log-info', source);
      return true;
    }

    default:
      return false;
  }
}
