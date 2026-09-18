import type { BattleContext } from '../../types/battle/battleContext.ts';
import type { BattleSide, BattleState } from '../../types/battle/battle.ts';
import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import { logger } from '../utils/logger.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { handleCoreEvents } from './showdownBridgeCore.ts';
import { handleStageEvents } from './showdownBridgeStages.ts';
import { handleFieldEvents } from './showdownBridgeField.ts';
import { handleMiscEvents } from './showdownBridgeMisc.ts';
import { findMatchingPokemon, isMatchingUid } from './showdownUidMapper.ts';
import { useGameStore } from '@/stores/game';

function isIgnoredShowdownProtocolLine(line: string): boolean {
  return line.startsWith('|debug|') || line.startsWith('|-hint|') || line === '|-nothing';
}

function resolveSplitLogBranch(
  splitLine: string,
  secretLine: string,
  publicLine: string,
  playerSide: string
): string {
  const parts = splitLine.split('|');
  const side = parts[2];
  return side === playerSide ? secretLine : publicLine;
}

/**
 * Filtra la lista de logs del simulador para evitar procesar líneas duplicadas generadas por |split|.
 */
export function filterShowdownLogs(logs: string[], playerSide: string = 'p1'): string[] {
  const filtered: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (let i = 0; i < logs.length; i++) {
    const line = logs[i] || '';
    if (line.startsWith('|split|')) {
      const chosenLine = resolveSplitLogBranch(line, logs[i + 1] || '', logs[i + 2] || '', playerSide);
      if (chosenLine) filtered.push(chosenLine);
      i += 2;
    } else if (!isIgnoredShowdownProtocolLine(line)) {
      filtered.push(line);
    }
  }
  return filtered;
}

let bridgeWeatherResolver: (() => string | undefined) | null = null;

export function setBridgeWeatherResolver(resolver: () => string | undefined): void {
  bridgeWeatherResolver = resolver;
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
      (message as Record<string, unknown>).type === 'EXECUTE_TURN' // open-record: Generic key-value data dictionary container
    ) {
      const payload = (message as Record<string, unknown>).payload as Record<string, unknown> | undefined; // open-record: Generic key-value data dictionary container
      if (payload) {
        try {
          const weather = bridgeWeatherResolver?.() || (typeof window !== 'undefined' && window.__CURRENT_BATTLE_WEATHER__);
          if (weather) {
            payload.weather = weather;
          }
        } catch (err) {
          logger.debug('showdownBridge', 'Error al adjuntar clima al payload:', err);
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

function parseBattleSide(rawId: string): BattleSide | null {
  if (/^p1[a-d]?:/.test(rawId)) return 'player';
  if (/^p2[a-d]?:/.test(rawId)) return 'enemy';
  return null;
}

function updateLogSkippingState(battle: BattleState, type: string | undefined, parts: string[]): boolean {
  if (type === 'turnStart') {
    Reflect.set(battle, 'p2Skip', parts[2] === 'p2Skip=true');
    Reflect.set(battle, 'ignoreEnemyLogs', false);
    return true;
  }

  if (Reflect.get(battle, 'ignoreEnemyLogs')) {
    const isPlayerMove = type === 'move' && (parts[2]?.startsWith('p1a:') || parts[2]?.startsWith('p1:'));
    const isSwitchOrDrag = type === 'switch' || type === 'drag';
    const isTurnOrUpkeep = type === 'turn' || type === 'upkeep' || type === 'win' || type === 'tie';

    if (isPlayerMove || isSwitchOrDrag || isTurnOrUpkeep) {
      Reflect.set(battle, 'ignoreEnemyLogs', false);
    }
  }

  if (
    Reflect.get(battle, 'p2Skip') &&
    type === 'move' &&
    (parts[2]?.startsWith('p2a:') || parts[2]?.startsWith('p2:'))
  ) {
    Reflect.set(battle, 'ignoreEnemyLogs', true);
  }

  return Boolean(Reflect.get(battle, 'ignoreEnemyLogs'));
}

function resolveSideTeam(battle: BattleState, side: BattleSide): Pokemon[] {
  if (side === 'player') {
    return (battle.playerTeam && battle.playerTeam.length > 0)
      ? battle.playerTeam
      : (useGameStore().state?.team || (battle.player ? [battle.player] : []));
  }
  return (battle.enemyTeam && battle.enemyTeam.length > 0)
    ? battle.enemyTeam
    : (battle.enemy ? [battle.enemy] : []);
}

function extractUidFromLogLine(line: string, rawId: string): string | undefined {
  if (!line || !line.includes('|[uids]')) return undefined;
  const lineParts = line.split('|');
  const uidsPart = lineParts.find(p => p.startsWith('[uids]'));
  if (!uidsPart) return undefined;
  const mappings = uidsPart.substring(6).split(',');
  const targetIdent = rawId.replace(/\s+/g, '');
  const match = mappings.find(m => m.startsWith(`${targetIdent}=`));
  return match ? match.split('=')[1] : undefined;
}

function locateActiveBattlePokemonByUid(battle: BattleState, side: BattleSide, targetUid: string): Pokemon | null {
  const keys = Object.keys(battle);
  for (const key of keys) {
    const matchesSide = side === 'player'
      ? (key.startsWith('player') || key === 'ally')
      : key.startsWith('enemy');
    if (matchesSide) {
      const val = Reflect.get(battle, key) as Pokemon | null | undefined;
      if (val && typeof val === 'object' && val.uid === targetUid) {
        return val;
      }
    }
  }
  return null;
}

function matchPokemonBySuffixOrIdentity(team: Pokemon[], rawId: string): Pokemon | null {
  const namePart = rawId.includes(':') ? (rawId.split(':')[1]?.trim() ?? '') : '';
  if (namePart) {
    const suffixMon = (team.find(mon => mon && (isMatchingUid(mon.uid, namePart) || mon.name?.toLowerCase() === namePart.toLowerCase() || mon.id === namePart)) ?? null) as Pokemon | null; // text-ok: UI text display localization string
    if (suffixMon) {
      console.debug(`[E2E-GETPOKE-SUFFIX-MATCH] Matched rawId "${rawId}" to team UID "${suffixMon.uid}" via name/UID`);
      return suffixMon;
    }
  }

  const matchMon = findMatchingPokemon(rawId, team) ?? null;
  if (matchMon) {
    console.debug(`[E2E-GETPOKE-MATCHMON] Resolved rawId "${rawId}" to team UID "${matchMon.uid}" name "${matchMon.name}"`);
    return matchMon;
  }
  return null;
}

function determineCombatantFromLog(
  rawId: string,
  line: string,
  battle: BattleState | null,
  fallbackMon: Pokemon | null,
): Pokemon | null {
  const side = parseBattleSide(rawId);
  if (!side) return null;

  if (!battle) {
    console.debug(`[E2E-GETPOKE] No active battle. rawId: "${rawId}", side: "${side}". Returning default.`);
    return fallbackMon;
  }

  console.debug(`[E2E-GETPOKE] rawId: "${rawId}", side: "${side}", line: "${line}"`);

  const team = resolveSideTeam(battle, side);
  const foundUid = extractUidFromLogLine(line, rawId);

  if (foundUid) {
    const foundInTeam = team.find(mon => mon && mon.uid === foundUid);
    if (!foundInTeam) {
      throw new Error(`[showdownBridge.ts] Resolved UID "${foundUid}" for "${rawId}" but it was not found in the reactively tracked team list.`);
    }
    const activeMon = locateActiveBattlePokemonByUid(battle, side, foundUid);
    if (activeMon) {
      console.debug(`[E2E-GETPOKE-RESOLVED-ACTIVE] Resolved rawId "${rawId}" to active UID "${foundInTeam.uid}" matches`);
      return activeMon;
    }
    console.debug(`[E2E-GETPOKE-RESOLVED-TEAM] Resolved rawId "${rawId}" to team UID "${foundInTeam.uid}" name "${foundInTeam.name}"`);
    return foundInTeam;
  }

  const matched = matchPokemonBySuffixOrIdentity(team, rawId);
  if (matched) return matched;

  throw new Error(
    `[ShowdownBridge] UID resolution failed for "${rawId}". ` +
    `This indicates a synchronization bug — UID must be present in the tracked team. ` +
    `Aborting to expose the desync at its source.`
  );
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

  const battle = store.activeBattle.value;
  if (!battle) return;

  if (type === 'turnStart') {
    updateLogSkippingState(battle, type, parts);
    return;
  }

  if (updateLogSkippingState(battle, type, parts)) {
    console.debug(`[BRIDGE-SKIP] Ignorando línea por p2Skip: "${line}"`);
    return;
  }

  const p = battle.player ?? null;
  const e = battle.enemy ?? null;

  const getSide = (rawId: string): BattleSide | null => parseBattleSide(rawId);
  const getPoke = (rawId: string): Pokemon | null =>
    determineCombatantFromLog(rawId, line, store.activeBattle.value, parseBattleSide(rawId) === 'player' ? p : e);

  const ctx: SBCtx = { store, type: type ?? '', parts, line, p, e, turnLogs, getSide, getPoke };

  try {
    const handled =
      await handleCoreEvents(ctx) ||
      handleStageEvents(ctx) ||
      await handleFieldEvents(ctx) ||
      await handleMiscEvents(ctx);

    if (!handled) {
      logger.debug('ShowdownBridge', `Línea de log de Showdown sin parseador visual específico: ${line}`);
    }
  } catch (error) {
    logger.error('ShowdownBridge', `Error al parsear línea de log: ${line}`, (error as Error).message);
  }
}
