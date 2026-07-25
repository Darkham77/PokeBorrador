import { toID } from '@pkmn/sim';
import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move, Pokemon, PokemonStatus } from '../../types/pokemon/pokemon.ts';

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
      const isFromEffect = line.includes('[from]');
      const isMissed = line.includes('[miss]') || line.includes('[notarget]');

      if (attacker && side) {
        const style = attacker === p ? 'log-player' : 'log-enemy';
        store.addLog(`¡${attacker.name} usó ${translatedName}!${isFromEffect ? ' (efecto)' : ''}`, style, attacker);
        const cleanMoveId = toID(moveId);

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

        if (attacker.disabledTurns) {
          attacker.disabledTurns = Math.max(0, attacker.disabledTurns - 1);
          if (attacker.disabledTurns === 0) {
            attacker.disabledMove = null;
            if (attacker.moves) {
              attacker.moves.forEach(m => { if (m) m.disabled = false; });
            }
          }
        }

        if (!isFromEffect && !isMissed) {
          if (store.attackerSide) store.attackerSide.value = side;
          if (store.activeMove) {
            store.activeMove.value = {
              id: toID(moveId),
              name: translatedName,
              type: moveData?.type || 'normal',
              cat: (moveData?.cat || 'physical') as 'physical' | 'special' | 'status',
              power: moveData?.power,
              acc: moveData?.acc,
              pp: 0,
              maxPP: 0,
              priority: moveData?.priority || 0,
              effect: moveData?.effect || '',
              target: ((moveData as { target?: string })?.target || 'normal') as 'enemy' | 'self' | 'all'
            };
          }

          if (store.animations?.awaitTween) {
            await store.animations.awaitTween(`attack-${side}`);
          }

          if (store.attackerSide) store.attackerSide.value = null;
          if (store.activeMove) store.activeMove.value = null;
        }
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
          const style = attacker === p ? 'log-player' : 'log-enemy';
          store.addLog(`¡${attacker.name} está cargando ${translatedName}!`, style, attacker);
        }
      }
      return true;
    }

    case '-damage': {
      const victim = getPoke(parts[2] || '');
      const hpString = parts[3] || '';
      if (victim && hpString) {
        // Showdown condition format: "100/200 brn" or "0 fnt" or "100/200"
        const [hpRatio, statusAppended] = hpString.trim().split(' ');
        if (hpRatio) {
          const hpParts = hpRatio.split('/');
          const parsedHp = parseInt(hpParts[0] || '0', 10);
          if (hpParts[1]) {
            const parsedMax = parseInt(hpParts[1], 10);
            if (!isNaN(parsedMax) && parsedMax > 0) {
              const realMax = victim.maxHp || parsedMax;
              victim.hp = Math.round((parsedHp / parsedMax) * realMax);
            } else {
              victim.hp = parsedHp;
            }
          } else {
            victim.hp = parsedHp;
          }
        }
        if (statusAppended && statusAppended !== 'fnt' && !victim.status) {
          // Informational status in hp string - do not auto-inject status
        }
        const fromClause = parts.find(p => p.startsWith('[from]'));
        const isSilent = line.includes('[silent]');
        if (fromClause && !isSilent) {
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
        } else if (!isSilent) {
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
        // Showdown condition format: "100/200 brn" or "100/200"
        const [hpRatio, statusAppended] = hpString.trim().split(' ');
        if (hpRatio) {
          const hpParts = hpRatio.split('/');
          const parsedHp = parseInt(hpParts[0] || '0', 10);
          if (hpParts[1]) {
            const parsedMax = parseInt(hpParts[1], 10);
            if (!isNaN(parsedMax) && parsedMax > 0) {
              const realMax = target.maxHp || parsedMax;
              target.hp = Math.round((parsedHp / parsedMax) * realMax);
            } else {
              target.hp = parsedHp;
            }
          } else {
            target.hp = parsedHp;
          }
        }
        if (statusAppended && statusAppended !== 'fnt' && !target.status) {
          // Informational status in hp string - do not auto-inject status
        }
        const fromClause = parts.find(p => p.startsWith('[from]'));
        if (fromClause && fromClause.toLowerCase().includes('drain')) {
          store.addLog(`¡${target.name} absorbió salud!`, 'log-info', target);
        } else {
          store.addLog(`¡${target.name} recuperó salud!`, 'log-info', target);
        }
      }
      return true;
    }

    case 'faint': {
      const target = getPoke(parts[2] || '');
      if (target) {
        const remainedAlive = target.hp > 0;
        target.hp = 0;
        target.fainted = true;
        target.status = null;
        if (target.volatileCounters) {
          target.volatileCounters = {};
        }
        if (remainedAlive) {
          store.addLog(`¡${target.name} se debilitó!`, 'log-info', target);
        }
      }
      return true;
    }

    case '-status': {
      if (line.includes('[silent]')) return true;
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
      if (line.includes('[silent]')) return true;
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

    case '-curestatusall': {
      if (store.activeBattle.value) {
        const battle = store.activeBattle.value;
        if (battle.playerTeam) battle.playerTeam.forEach((mon: Pokemon | null) => { if (mon) mon.status = null; });
        if (battle.enemyTeam) battle.enemyTeam.forEach((mon: Pokemon | null) => { if (mon) mon.status = null; });
      }
      store.addLog('¡Todos los Pokémon del equipo fueron curados de sus problemas de estado!', 'log-info');
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
      let winnerResult: 'player' | 'enemy' | 'tie' = 'enemy';
      if (type === 'tie') {
        winnerResult = 'tie';
      } else {
        const playerNames = store.activeBattle.value?.playerNames || {};
        const isPlayerWin = winnerName.split(' & ').some(name => playerNames[name.trim()] === 'player') || winnerName === 'Player';
        if (isPlayerWin) {
          source = 'player';
          winnerResult = 'player';
        }
      }
      if (store.activeBattle.value) {
        store.activeBattle.value.over = true;
        store.activeBattle.value.winnerResult = winnerResult;
      }
      const msg = type === 'tie' ? '¡El combate ha terminado en empate!' : `¡El combate ha terminado! Ganador: ${winnerName}`;
      store.addLog(msg, 'log-info', source);
      return true;
    }

    case 'gen':
    case 'queue':
    case 'teampreview':
    case 'start':
    case 'poke':
    case 'clearpoke':
      return true;

    case 'switch':
    case 'drag': {
      const side = getSide(parts[2] || '');
      if (!side || !store.activeBattle.value) return true;
      const switchedIn = getPoke(parts[2] || '');
      if (!switchedIn) return true;
      if (side === 'enemy') {
        store.activeBattle.value.enemy = switchedIn;
      } else {
        store.activeBattle.value.player = switchedIn;
      }
      return true;
    }

    default:
      return false;
  }
}
