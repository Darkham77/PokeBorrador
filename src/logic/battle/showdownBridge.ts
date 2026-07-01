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

/**
 * Traduce y procesa una sola línea del log estructurado de Showdown,
 * actualizando el estado reactivo del combate y disparando logs/UI.
 * Delega el handling a los sub-módulos por categoría de evento.
 */
export async function parseShowdownLogLine(store: BattleContext, line: string, turnLogs?: string[]) {
  if (!line || !line.startsWith('|')) return;

  const parts = line.split('|').map(p => p.trim());
  const type = parts[1];

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

    // Si el identificador apunta al activo en pista (sufijo 'a' de individuales/dobles), retornar directamente el activo del bando
    // (Excepto en eventos switch/drag, donde se está logueando al nuevo Pokémon que entra y el activo actual apunta al que sale)
    if (battle && type !== 'switch' && type !== 'drag') {
      if (side === 'player' && (rawId.startsWith('p1a:') || rawId.startsWith('p1:'))) {
        if (battle.player) return battle.player;
      }
      if (side === 'enemy' && (rawId.startsWith('p2a:') || rawId.startsWith('p2:'))) {
        if (battle.enemy) return battle.enemy;
      }
    }

    // Extraer nombre. Ej: "p1a: Mew" -> "Mew" o "p1: Blissey" -> "Blissey"
    const colonIdx = rawId.indexOf(':');
    const nameInLog = colonIdx !== -1 ? rawId.substring(colonIdx + 1).trim() : '';

    const team = side === 'player'
      ? (battle?.playerTeam || [])
      : (battle?.enemyTeam || []);
    if (nameInLog && team.length > 0) {
      const found = team.find(mon => mon && ((mon as any).nickname === nameInLog || mon.name === nameInLog));
      if (found) {
        // En combates 2vs2, pueden existir múltiples asientos activos por lado (ej. player, player2, enemy, enemy2).
        // Sincronizamos devolviendo la instancia reactiva del asiento activo que coincida en UID.
        if (battle) {
          const keys = Object.keys(battle);
          for (const key of keys) {
            const matchesSide = side === 'player' 
              ? (key.startsWith('player') || key === 'ally') 
              : key.startsWith('enemy');
            if (matchesSide) {
              const val = (battle as Record<string, unknown>)[key];
              if (val && typeof val === 'object' && 'uid' in val && (val as { uid?: string }).uid === found.uid) {
                return val as unknown as Pokemon;
              }
            }
          }
        }
        return found;
      }
    }

    return side === 'player' ? p : e;
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
