// fallow-ignore-file security-sink
import type { BattleContext } from '@/types/battle/battleContext';
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
      filtered.push(line);
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
    return side === 'player' ? p : side === 'enemy' ? e : null;
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
