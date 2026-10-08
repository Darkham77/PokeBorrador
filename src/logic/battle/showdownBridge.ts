import type { BattleContext } from '../../types/battle/battleContext.ts';
import type { BattleSide } from '../../types/battle/battle.ts';
import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import { logger } from '../utils/logger.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { handleCoreEvents } from './showdownBridgeCore.ts';
import { handleStageEvents } from './showdownBridgeStages.ts';
import { handleFieldEvents } from './showdownBridgeField.ts';
import { handleMiscEvents } from './showdownBridgeMisc.ts';
import { determineCombatantFromLog, parseBattleSide } from './showdownCombatantResolver.ts';
import { updateLogSkippingState } from './showdownLogSkipper.ts';

export { filterShowdownLogs } from './showdownLogFilter.ts';
import './showdownWeatherInjection.ts';

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
