import { toID } from '@/logic/utils/strings.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move, Pokemon, PokemonStatus } from '../../types/pokemon/pokemon.ts';
import { requirePokemonMoveId, type MoveCategory } from '@/data/battle/moves';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { isMatchingUid } from './showdownUidMapper.ts';
import type { BattleContext } from '../../types/battle/battleContext.ts';

function syncMatchingPokemon(team: (Pokemon | null)[] | undefined, target: Pokemon) {
  if (!team) return;
  const match = team.find((p: Pokemon | null) => p && isMatchingUid(p.uid, target.uid));
  if (match && match !== target) {
    match.hp = target.hp;
    match.status = target.status;
    match.fainted = target.fainted;
  }
}

function syncCombatantToTeam(store: BattleContext, target: Pokemon | null) {
  if (!store || !target?.uid) return;
  const active = store.activeBattle.value;
  if (!active) return;
  syncMatchingPokemon(active.enemyTeam, target);
  syncMatchingPokemon(active.playerTeam, target);
  syncMatchingPokemon(store.gs?.state?.team, target);
}

function formatDamageFromLog(victimName: string, fromClause: string): string {
  const fromLower = fromClause.toLowerCase(); // text-ok: UI text display localization string
  if (fromLower.includes('recoil')) return `¡${victimName} recibió daño por el retroceso!`;
  if (fromLower.includes('item: life orb')) return `¡${victimName} recibió daño de Vidasfera!`;
  if (fromLower.includes('psn') || fromLower.includes('brn')) {
    const cause = fromLower.includes('brn') ? 'la quemadura' : 'el veneno';
    return `¡${victimName} sufrió daño por ${cause}!`;
  }
  if (fromLower.includes('sandstorm') || fromLower.includes('hail')) {
    const weatherName = fromLower.includes('sandstorm') ? 'la tormenta de arena' : 'el granizo';
    return `¡${victimName} sufrió daño por ${weatherName}!`;
  }
  if (fromLower.includes('leech seed')) return `¡${victimName} fue dañado por las Drenadoras!`;
  if (fromLower.includes('stealth rock') || fromLower.includes('spikes')) return `¡${victimName} sufrió daño por las trampa(s)!`;
  if (fromLower.includes('item:')) {
    const itemName = fromClause.split('item:')[1]?.trim() || 'Objeto';
    return `¡${victimName} sufrió daño por ${itemName}!`;
  }
  return `¡${victimName} recibió daño!`;
}

const STATUS_MESSAGES: Record<string, string> = {
  brn: 'fue quemado!',
  psn: 'fue envenenado!',
  tox: 'fue gravemente envenenado!',
  slp: 'se quedó dormido!',
  par: 'fue paralizado! ¡Quizás no pueda moverse!',
  frz: 'fue congelado!',
};

const CURE_STATUS_MESSAGES: Record<string, string> = {
  slp: 'se despertó!',
  frz: 'se descongeló!',
  brn: 'se curó de la quemadura!',
  psn: 'se curó del envenenamiento!',
  tox: 'se curó del envenenamiento!',
  par: 'se curó de la parálisis!',
};

async function handleDamageToken(ctx: SBCtx): Promise<boolean> {
  const { store, parts, line, p, getPoke } = ctx;
  const victim = getPoke(parts[2] || '');
  const hpString = parts[3] || '';
  if (victim && hpString) {
    const [hpRatio] = hpString.trim().split(' ');
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
    const fromClause = parts.find(part => part.startsWith('[from]'));
    const isSilent = line.includes('[silent]');
    if (!isSilent) {
      const logMsg = fromClause ? formatDamageFromLog(victim.name, fromClause) : `¡${victim.name} recibió daño!`;
      store.addLog(logMsg, 'log-info', victim);
    }
    const side = victim === p ? 'player' : 'enemy';
    if (store.animations?.handleShakeRequest) {
      await store.animations.handleShakeRequest({ side });
    }
    syncCombatantToTeam(store, victim);
  }
  return true;
}

function handleHealToken(ctx: SBCtx): boolean {
  const { store, parts, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const hpString = parts[3] || '';
  if (target && hpString) {
    const [hpRatio] = hpString.trim().split(' ');
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
    if (target.hp > 0) {
      target.fainted = false;
    }
    const fromClause = parts.find(part => part.startsWith('[from]'));
    if (fromClause && fromClause.toLowerCase().includes('drain')) { // text-ok: UI text display localization string
      store.addLog(`¡${target.name} absorbió salud!`, 'log-info', target);
    } else {
      store.addLog(`¡${target.name} recuperó salud!`, 'log-info', target);
    }
    syncCombatantToTeam(store, target);
  }
  return true;
}

function handleFaintToken(ctx: SBCtx): boolean {
  const { store, parts, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  if (target) {
    const remainedAlive = target.hp > 0;
    target.hp = 0;
    target.fainted = true;
    target.status = '';
    if (target.volatileCounters) {
      target.volatileCounters = {};
    }
    if (remainedAlive) {
      store.addLog(`¡${target.name} se debilitó!`, 'log-info', target);
    }
    syncCombatantToTeam(store, target);
  }
  return true;
}

function handleStatusToken(ctx: SBCtx): boolean {
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  const statusType = parts[3] || '';
  if (target && statusType) {
    target.status = statusType as PokemonStatus;
    const desc = STATUS_MESSAGES[statusType];
    const msg = desc ? `¡${target.name} ${desc}` : `¡${target.name} sufrió un problema de estado: ${statusType.toUpperCase()}!`; // text-ok: UI text display localization string
    store.addLog(msg, 'log-info', target);
    syncCombatantToTeam(store, target);
  }
  return true;
}

function handleCureStatusToken(ctx: SBCtx): boolean {
  const { store, parts, line, getPoke } = ctx;
  if (line.includes('[silent]')) return true;
  const target = getPoke(parts[2] || '');
  const curedStatus = parts[3] || '';
  if (target) {
    target.status = '';
    const desc = CURE_STATUS_MESSAGES[curedStatus];
    const msg = desc ? `¡${target.name} ${desc}` : `¡${target.name} se curó de su estado alterado!`;
    store.addLog(msg, 'log-info', target);
    syncCombatantToTeam(store, target);
  }
  return true;
}

async function handleMoveToken(ctx: SBCtx): Promise<boolean> {
  const { store, parts, line, p, getPoke, getSide, turnLogs } = ctx;
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
    const cleanMoveId = requirePokemonMoveId(toID(moveId));

    const lastMove: Move = {
      id: cleanMoveId,
      name: translatedName,
      pp: 0,
      maxPP: 0
    };
    attacker.lastMove = lastMove;

    const hasPrepareThisTurn = turnLogs?.some(l => {
      const lp = l.split('|').map(x => x.trim());
      return lp[1] === '-prepare' && getSide(lp[2] || '') === side;
    });

    if (!hasPrepareThisTurn && attacker.volatileCounters) {
      delete attacker.volatileCounters['twoturnmove'];
    }

    const isLockedMove = moveData?.self?.volatileStatus === 'lockedmove';
    if (isLockedMove && attacker) {
      if (!attacker.volatileCounters) attacker.volatileCounters = {};
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

    if (!isMissed) {
      if (store.attackerSide) store.attackerSide.value = side;
      if (store.activeMove) {
        store.activeMove.value = {
          id: cleanMoveId,
          name: translatedName,
          type: moveData?.type || 'normal',
          cat: (moveData?.cat || 'physical') as MoveCategory,
          power: moveData?.power,
          acc: moveData?.acc,
          pp: 0,
          maxPP: 0,
          priority: moveData?.priority || 0,
          effect: moveData?.effect,
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

function handlePrepareToken(ctx: SBCtx): boolean {
  const { store, parts, line, p, getPoke } = ctx;
  const attacker = getPoke(parts[2] ?? '');
  const moveId = parts[3] || 'Movimiento';
  const moveData = pokemonDataProvider.getMoveData(moveId);
  const translatedName = moveData?.name || moveId;
  if (attacker) {
    if (!attacker.volatileCounters) attacker.volatileCounters = {};
    attacker.volatileCounters['twoturnmove'] = 1;
    const prepareMoveObj: Move = {
      id: requirePokemonMoveId(toID(moveId)),
      name: translatedName,
      pp: 0,
      maxPP: 0,
      type: 'normal',
      cat: 'physical',
      priority: 0,
      power: undefined,
      acc: undefined,
      effect: undefined,
      target: undefined
    };
    attacker.lastMove = prepareMoveObj;
    if (!line.includes('[silent]')) {
      const style = attacker === p ? 'log-player' : 'log-enemy';
      store.addLog(`¡${attacker.name} está cargando ${translatedName}!`, style, attacker);
    }
  }
  return true;
}



function handleCureStatusAllToken(ctx: SBCtx): boolean {
  const { store } = ctx;
  if (store.activeBattle.value) {
    const battle = store.activeBattle.value;
    if (battle.playerTeam) battle.playerTeam.forEach((mon: Pokemon | null) => { if (mon) mon.status = ''; });
    if (battle.enemyTeam) battle.enemyTeam.forEach((mon: Pokemon | null) => { if (mon) mon.status = ''; });
  }
  store.addLog('¡Todos los Pokémon del equipo fueron curados de sus problemas de estado!', 'log-info');
  return true;
}

function handleSetHpToken(ctx: SBCtx): boolean {
  const { store, parts, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const hpString = parts[3] || '';
  if (target && hpString) {
    const parsed = hpString.split('/').map(n => parseInt(n || '0', 10));
    const cur = parsed[0] ?? 0;
    const max = parsed[1] ?? 0;
    if (!isNaN(max) && max > 0) {
      const realMax = target.maxHp || max;
      target.hp = Math.round((cur / max) * realMax);
    } else if (!isNaN(cur)) {
      target.hp = cur;
    }
    syncCombatantToTeam(store, target);
  }
  return true;
}

function handlePlayerToken(ctx: SBCtx): boolean {
  const { store, parts } = ctx;
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

function handleWinTieToken(ctx: SBCtx): boolean {
  const { store, type, parts } = ctx;
  const winnerName = parts[2] || 'Entrenador';
  let source: 'player' | 'enemy_trainer' = 'enemy_trainer';
  let winnerResult: 'player' | 'enemy' | 'tie' = 'enemy';
  if (type === 'tie') {
    winnerResult = 'tie';
  } else {
    const playerNames = store.activeBattle.value?.playerNames || {};
    const isPlayerWin = winnerName.split(/\s*&\s*/).some(name => playerNames[name.trim()] === 'player') || winnerName === 'Player';
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

const CORE_EVENT_DISPATCHER: Record<string, (ctx: SBCtx) => Promise<boolean> | boolean> = {
  move: handleMoveToken,
  '-prepare': handlePrepareToken,
  '-damage': handleDamageToken,
  '-heal': handleHealToken,
  faint: handleFaintToken,
  '-status': handleStatusToken,
  '-curestatus': handleCureStatusToken,
  '-curestatusall': handleCureStatusAllToken,
  '-sethp': handleSetHpToken,
  player: handlePlayerToken,
  win: handleWinTieToken,
  tie: handleWinTieToken,
  gen: () => true,
  queue: () => true,
  teampreview: () => true,
  start: () => true,
  poke: () => true,
  clearpoke: () => true,
};

/**
 * Dispatches core combat events (move, damage, heal, faint, status, etc.) via Strategy Action Map.
 */
export async function handleCoreEvents(ctx: SBCtx): Promise<boolean> {
  const { store, type } = ctx;

  if (store.activeBattle.value && Reflect.get(store.activeBattle.value, 'ignoreEnemyLogs')) {
    if (type === 'move' || type === '-damage' || type === '-heal' || type === '-status' || type === '-curestatus' || type === '-sethp' || type === 'faint') {
      return true;
    }
  }

  const handler = CORE_EVENT_DISPATCHER[type];
  if (handler) {
    return await handler(ctx);
  }
  return false;
}
