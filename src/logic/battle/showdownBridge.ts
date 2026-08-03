// fallow-ignore-file security-sink
import type { BattleContext } from '../../types/battle/battleContext.ts';
import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import { logger } from '../utils/logger.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { handleCoreEvents } from './showdownBridgeCore.ts';
import { handleStageEvents } from './showdownBridgeStages.ts';
import { handleFieldEvents } from './showdownBridgeField.ts';
import { handleMiscEvents } from './showdownBridgeMisc.ts';
import { findMatchingPokemon, isMatchingUid } from './showdownUidMapper.ts';
import { useGameStore } from '@/stores/game';

/**
 * Filtra la lista de logs del simulador para evitar procesar líneas duplicadas generadas por |split|.
 */
export function filterShowdownLogs(logs: string[], playerSide: string = 'p1'): string[] {
  const filtered: string[] = []; // no-domain
  for (let i = 0; i < logs.length; i++) {
    const line = logs[i] || '';
    if (line.startsWith('|split|')) {
      const parts = line.split('|');
      const side = parts[2]; // 'p1' o 'p2'
      const secretLine = logs[i + 1] || '';
      const publicLine = logs[i + 2] || '';
      if (side === playerSide) {
        if (secretLine) filtered.push(secretLine);
      } else {
        if (publicLine) filtered.push(publicLine);
      }
      i += 2;
    } else {
      // Filtrar líneas de debug, hints y nothing de Showdown que no representan eventos visuales de combate
      if (!line.startsWith('|debug|') && !line.startsWith('|-hint|') && line !== '|-nothing') {
        filtered.push(line);
      }
    }
  }
  return filtered;
}

import { useBattleStore } from '@/stores/battle/battle';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';

if (!getActivePinia()) {
  setActivePinia(createPinia());
}

// Monkey-patch Worker.prototype.postMessage to inject weather into EXECUTE_TURN (browser only)
if (typeof Worker !== 'undefined') {
  const originalPostMessage = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (
    this: Worker,
    message: unknown,
    transferOrOptions?: unknown
  ) {
    if (
      message &&
      typeof message === 'object' &&
      (message as Record<string, unknown>).type === 'EXECUTE_TURN' // open-record
    ) {
      const payload = (message as Record<string, unknown>).payload as Record<string, unknown> | undefined; // open-record
      if (payload) {
        try {
          const battleStore = useBattleStore();
          if (battleStore?.state?.weather?.type) {
            payload.weather = battleStore.state.weather.type;
          }
        } catch {
          // Ignore if Pinia is not active/initialized yet
        }
      }
    }
    return (originalPostMessage as (this: Worker, message: unknown, transfer?: unknown) => void).call(
      this,
      message,
      transferOrOptions
    );
  };
}

/**
 * Traduce y procesa una sola línea del log estructurado de Showdown,
 * actualizando el estado reactivo del combate y disparando logs/UI.
 * Delega el handling a los sub-módulos por categoría de evento.
 */
export async function parseShowdownLogLine(store: BattleContext, line: string, turnLogs?: string[]) {
  if (!line || !line.startsWith('|')) return;

  const parts = line.split('|').map(p => p.trim());
  const type = parts[1];

  if (type === 'turnStart') {
    if (store.activeBattle.value) {
      Reflect.set(store.activeBattle.value, 'p2Skip', parts[2] === 'p2Skip=true')
      Reflect.set(store.activeBattle.value, 'ignoreEnemyLogs', false)
    }
    return;
  }

  // Si ignoreEnemyLogs está activo, evaluar si debemos desactivarlo antes de ignorar la línea actual
  if (store.activeBattle.value && Reflect.get(store.activeBattle.value, 'ignoreEnemyLogs')) {
    const isPlayerMove = type === 'move' && (parts[2]?.startsWith('p1a:') || parts[2]?.startsWith('p1:'));
    const isSwitchOrDrag = type === 'switch' || type === 'drag';
    const isTurnOrUpkeep = type === 'turn' || type === 'upkeep' || type === 'win' || type === 'tie';

    if (isPlayerMove || isSwitchOrDrag || isTurnOrUpkeep) {
      Reflect.set(store.activeBattle.value, 'ignoreEnemyLogs', false)
    }
  }

  // Activar ignoreEnemyLogs si p2Skip está activo y es el turno del enemigo
  if (
    store.activeBattle.value &&
    Reflect.get(store.activeBattle.value, 'p2Skip') &&
    type === 'move' &&
    (parts[2]?.startsWith('p2a:') || parts[2]?.startsWith('p2:'))
  ) {
    Reflect.set(store.activeBattle.value, 'ignoreEnemyLogs', true)
  }

  // Ignorar por completo si ignoreEnemyLogs está activo
  if (store.activeBattle.value && Reflect.get(store.activeBattle.value, 'ignoreEnemyLogs')) {
    console.debug(`[BRIDGE-SKIP] Ignorando línea por p2Skip: "${line}"`);
    return;
  }

  const p = store.activeBattle.value?.player;
  const e = store.activeBattle.value?.enemy;
  if (!p || !e) return;

  const getSide = (rawId: string): 'player' | 'enemy' | null => {
    if (/^p1[a-d]?:/.test(rawId)) return 'player';
    if (/^p2[a-d]?:/.test(rawId)) return 'enemy';
    return null;
  };

  const getPoke = (rawId: string): Pokemon | null => {
    const side = getSide(rawId);
    if (!side) return null;

    const battle = store.activeBattle.value;
    if (!battle) {
      console.debug(`[E2E-GETPOKE] No active battle. rawId: "${rawId}", side: "${side}". Returning default.`);
      return side === 'player' ? p : e;
    }

    console.debug(`[E2E-GETPOKE] rawId: "${rawId}", side: "${side}", line: "${line}"`);

    const team: Pokemon[] = side === 'player'
      ? ((battle.playerTeam && battle.playerTeam.length > 0) ? battle.playerTeam : (useGameStore().state?.team || (battle.player ? [battle.player] : [])))
      : ((battle.enemyTeam && battle.enemyTeam.length > 0) ? battle.enemyTeam : (battle.enemy ? [battle.enemy] : []));
    const findPokemonInBattle = (targetUid: string) => {
      console.debug('[DEBUG-UID-LOOKUP] Looking for targetUid:', targetUid, 'on side:', side, 'in team UIDs:', team.map((mon: Pokemon | null | undefined) => mon ? `${mon.name} (${mon.uid})` : 'null'));
      const found = team.find((mon: Pokemon | null | undefined) => mon && mon.uid === targetUid);
      if (!found) return null;

      const keys = Object.keys(battle);
      for (const key of keys) {
        const matchesSide = side === 'player' 
          ? (key.startsWith('player') || key === 'ally') 
          : key.startsWith('enemy');
        if (matchesSide) {
          const val = Reflect.get(battle, key) as Record<string, unknown> | null | undefined; // open-record
          if (val && typeof val === 'object' && 'uid' in val && (val as { uid?: string }).uid === found.uid) {
            return { val: val as unknown as Pokemon, found }; // domain-ok
          }
        }
      }
      return { val: null, found };
    };

    let foundUid: string | undefined = undefined;

    if (line && line.includes('|[uids]')) {
      const lineParts = line.split('|');
      const uidsPart = lineParts.find(p => p.startsWith('[uids]'));
      if (uidsPart) {
        const mappings = uidsPart.substring(6).split(',');
        const targetIdent = rawId.replace(/\s+/g, '');
        const match = mappings.find(m => m.startsWith(`${targetIdent}=`));
        if (match) {
          foundUid = match.split('=')[1];
        }
      }
    }

    if (foundUid) {
      const res = findPokemonInBattle(foundUid);
      if (res) {
        if (res.val) {
          console.debug(`[E2E-GETPOKE-RESOLVED-ACTIVE] Resolved rawId "${rawId}" to active UID "${res.found.uid}" matches`);
          return res.val;
        }
        console.debug(`[E2E-GETPOKE-RESOLVED-TEAM] Resolved rawId "${rawId}" to team UID "${res.found.uid}" name "${res.found.name}"`);
        return res.found;
      }
      throw new Error(`[showdownBridge.ts] Resolved UID "${foundUid}" for "${rawId}" but it was not found in the reactively tracked team list.`);
    }

    const namePart = rawId.includes(':') ? (rawId.split(':')[1]?.trim() ?? '') : '';
    let matchMon: Pokemon | null = null;
    if (namePart) {
      matchMon = (team.find(mon => mon && (mon.name === namePart || isMatchingUid(mon.uid, namePart))) ?? null) as Pokemon | null;
      if (matchMon) {
        console.debug(`[E2E-GETPOKE-SUFFIX-MATCH] Matched rawId "${rawId}" to team UID "${matchMon.uid}" via name/suffix`);
        return matchMon;
      }
    }

    // Mapeo unificado basado en UID
    matchMon = findMatchingPokemon(rawId, team) ?? null;

    if (matchMon) {
      console.debug(`[E2E-GETPOKE-MATCHMON] Resolved rawId "${rawId}" to team UID "${matchMon.uid}" name "${matchMon.name}"`);
      return matchMon;
    }

    throw new Error(
      `[ShowdownBridge] UID resolution failed for "${rawId}". ` +
      `This indicates a synchronization bug — UID must be present in the tracked team. ` +
      `Aborting to expose the desync at its source.`
    );
  };

  const ctx: SBCtx = { store, type: type ?? '', parts, line, p, e, turnLogs, getSide, getPoke };

  try {
    const handled =
      await handleCoreEvents(ctx) ||
      handleStageEvents(ctx) ||
      await handleFieldEvents(ctx) ||
      handleMiscEvents(ctx);

    if (!handled) {
      logger.debug('ShowdownBridge', `Línea de log de Showdown sin parseador visual específico: ${line}`);
    }
  } catch (error) {
    logger.error('ShowdownBridge', `Error al parsear línea de log: ${line}`, (error as Error).message);
  }
}
