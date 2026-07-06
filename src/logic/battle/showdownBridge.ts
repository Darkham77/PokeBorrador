// fallow-ignore-file security-sink
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { logger } from '@/logic/utils/logger';
import type { SBCtx } from './showdownBridgeCtx';
import { handleCoreEvents } from './showdownBridgeCore';
import { handleStageEvents } from './showdownBridgeStages';
import { handleFieldEvents } from './showdownBridgeField';
import { handleMiscEvents } from './showdownBridgeMisc';

/**
 * Filtra la lista de logs del simulador para evitar procesar líneas duplicadas generadas por |split|.
 */
export function filterShowdownLogs(logs: string[]): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < logs.length; i++) {
    const line = logs[i] || '';
    if (line.startsWith('|split|')) {
      const parts = line.split('|');
      const side = parts[2]; // 'p1' o 'p2'
      const secretLine = logs[i + 1] || '';
      const publicLine = logs[i + 2] || '';
      if (side === 'p1') {
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
      (message as Record<string, unknown>).type === 'EXECUTE_TURN'
    ) {
      const payload = (message as Record<string, unknown>).payload as Record<string, unknown> | undefined;
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
      (store.activeBattle.value as unknown as { p2Skip: boolean }).p2Skip = parts[2] === 'p2Skip=true';
      (store.activeBattle.value as unknown as { ignoreEnemyLogs: boolean }).ignoreEnemyLogs = false;
    }
    return;
  }

  // Si ignoreEnemyLogs está activo, evaluar si debemos desactivarlo antes de ignorar la línea actual
  if ((store.activeBattle.value as unknown as { ignoreEnemyLogs?: boolean }).ignoreEnemyLogs) {
    const isPlayerMove = type === 'move' && (parts[2]?.startsWith('p1a:') || parts[2]?.startsWith('p1:'));
    const isSwitchOrDrag = type === 'switch' || type === 'drag';
    const isTurnOrUpkeep = type === 'turn' || type === 'upkeep' || type === 'win' || type === 'tie';

    if (isPlayerMove || isSwitchOrDrag || isTurnOrUpkeep) {
      (store.activeBattle.value as unknown as { ignoreEnemyLogs: boolean }).ignoreEnemyLogs = false;
    }
  }

  // Activar ignoreEnemyLogs si p2Skip está activo y es el turno del enemigo
  if (
    (store.activeBattle.value as unknown as { p2Skip?: boolean }).p2Skip &&
    type === 'move' &&
    (parts[2]?.startsWith('p2a:') || parts[2]?.startsWith('p2:'))
  ) {
    (store.activeBattle.value as unknown as { ignoreEnemyLogs: boolean }).ignoreEnemyLogs = true;
  }

  // Ignorar por completo si ignoreEnemyLogs está activo
  if ((store.activeBattle.value as unknown as { ignoreEnemyLogs?: boolean }).ignoreEnemyLogs) {
    console.log(`[BRIDGE-SKIP] Ignorando línea por p2Skip: "${line}"`);
    return;
  }

  const p = store.activeBattle.value?.player;
  const e = store.activeBattle.value?.enemy;
  if (!p || !e) return;

  const getSide = (rawId: string): 'player' | 'enemy' | null => {
    if (rawId.startsWith('p1a:') || rawId.startsWith('p1:')) return 'player';
    if (rawId.startsWith('p2a:') || rawId.startsWith('p2:')) return 'enemy';
    return null;
  };

  const getPoke = (rawId: string) => {
    const side = getSide(rawId);
    if (!side) return null;

    const battle = store.activeBattle.value;
    if (!battle) {
      console.log(`[E2E-GETPOKE] No active battle. rawId: "${rawId}", side: "${side}". Returning default.`);
      return side === 'player' ? p : e;
    }

    console.log(`[E2E-GETPOKE] rawId: "${rawId}", side: "${side}", line: "${line}"`);

    interface RequestPokemon {
      active?: boolean;
      ident?: string;
      uid?: string;
    }
    interface RequestSide {
      pokemon?: RequestPokemon[];
    }
    interface ShowdownRequest {
      side?: RequestSide;
    }
    const request = (side === 'player' ? battle.playerRequest : battle.enemyRequest) as ShowdownRequest | null | undefined;
    const team = side === 'player' ? (battle.playerTeam || []) : (battle.enemyTeam || []);    const findPokemonInBattle = (targetUid: string) => {
      const found = team.find(mon => mon && mon.uid === targetUid);
      if (!found) return null;

      const keys = Object.keys(battle);
      for (const key of keys) {
        const matchesSide = side === 'player' 
          ? (key.startsWith('player') || key === 'ally') 
          : key.startsWith('enemy');
        if (matchesSide) {
          const val = (battle as unknown as Record<string, unknown>)[key];
          if (val && typeof val === 'object' && 'uid' in val && (val as { uid?: string }).uid === found.uid) {
            return { val: val as unknown as Pokemon, found };
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
          console.log(`[E2E-GETPOKE-RESOLVED-ACTIVE] Resolved rawId "${rawId}" to active UID "${res.found.uid}" matches`);
          return res.val;
        }
        console.log(`[E2E-GETPOKE-RESOLVED-TEAM] Resolved rawId "${rawId}" to team UID "${res.found.uid}" name "${res.found.name}"`);
        return res.found;
      }
      throw new Error(`[showdownBridge.ts] Resolved UID "${foundUid}" for "${rawId}" but it was not found in the reactively tracked team list.`);
    }

    // Si es del jugador y se refiere al slot activo en pista (p1a)
    if (side === 'player' && (rawId.startsWith('p1a:') || rawId === 'p1a')) {
      if ((battle as unknown as Record<string, unknown>).switchingToPlayer) {
        return (battle as unknown as Record<string, unknown>).switchingToPlayer as Pokemon;
      } else if (battle.player) {
        return battle.player;
      }
    }

    // Si es del enemigo y se refiere al slot activo en pista (p2a)
    if (side === 'enemy' && (rawId.startsWith('p2a:') || rawId === 'p2a')) {
      if ((battle as unknown as Record<string, unknown>).switchingToEnemy) {
        console.log(`[E2E-GETPOKE-ACTIVE-SWITCH] Enemy active switch rawId "${rawId}". Returning switchingToEnemy: "${((battle as unknown as Record<string, unknown>).switchingToEnemy as Pokemon)?.uid}"`);
        return (battle as unknown as Record<string, unknown>).switchingToEnemy as Pokemon;
      } else if (battle.enemy) {
        console.log(`[E2E-GETPOKE-ACTIVE] Enemy active slot rawId "${rawId}". Returning active battle.enemy: "${battle.enemy.name}" (UID: ${battle.enemy.uid})`);
        return battle.enemy;
      }
    }

    if (!foundUid && request && request.side && Array.isArray(request.side.pokemon)) {
      if (line && (line.startsWith('|switch|') || line.startsWith('|drag|')) && (rawId === 'p1a' || rawId.startsWith('p1a:') || rawId === 'p2a' || rawId.startsWith('p2a:'))) {
        const list = request.side.pokemon as Array<{ active?: boolean; uid?: string } | null | undefined>;
        const activeReqPoke = list.find((rp) => rp && rp.active);
        if (activeReqPoke && activeReqPoke.uid) {
          foundUid = activeReqPoke.uid;
        }
      }
      if (!foundUid) {
        // Resolver por ident (e.g. p1a: P-Poke2-2 -> p1: P-Poke2-2)
        const identToMatch = rawId.replace(/^(p1|p2)[a-d]:/, '$1:').trim();
        const reqPoke = request.side.pokemon.find((rp: unknown) => {
          const p = rp as { ident?: string; uid?: string } | null;
          return p && p.ident === identToMatch;
        });
        if (reqPoke && (reqPoke as { uid?: string }).uid) {
          foundUid = (reqPoke as { uid?: string }).uid;
        }
      }
    }

    if (foundUid) {
      const res = findPokemonInBattle(foundUid);
      if (res) {
        if (res.val) {
          console.log(`[E2E-GETPOKE-RESOLVED-ACTIVE] Resolved rawId "${rawId}" to active UID "${res.found.uid}" matches`);
          return res.val;
        }
        console.log(`[E2E-GETPOKE-RESOLVED-TEAM] Resolved rawId "${rawId}" to team UID "${res.found.uid}" name "${res.found.name}"`);
        return res.found;
      }
      throw new Error(`[showdownBridge.ts] Resolved UID "${foundUid}" for "${rawId}" but it was not found in the reactively tracked team list.`);
    }

    throw new Error(`[showdownBridge.ts] Failed to resolve Pokemon reference for "${rawId}" (no UID match found). Line: "${line}"`);
  };

  const ctx: SBCtx = { store, type: type ?? '', parts, line, p, e, turnLogs, getSide, getPoke };

  try {
    const handled =
      await handleCoreEvents(ctx) ||
      handleStageEvents(ctx) ||
      handleFieldEvents(ctx) ||
      handleMiscEvents(ctx);

    if (!handled) {
      logger.debug('ShowdownBridge', `Línea de log de Showdown sin parseador visual específico: ${line}`);
    }
  } catch (error) {
    logger.error('ShowdownBridge', `Error al parsear línea de log: ${line}`, (error as Error).message);
  }
}
