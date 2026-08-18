/**
 * src/stores/game/actions/saveActionHelpers.ts
 *
 * SRP Helpers for save state validation, playtime tracking, and rollback handling.
 */

import type { GameState } from '@/types/system/game';
import type { AuthUser } from '@/types/auth/auth';
import type { DBRouter } from '@/logic/db/dbRouter';
import { compress } from '@/logic/utils/compression';
import { writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';

export interface SaveRollbackPayload {
  serverData?: GameState;
  lastSaveId?: string;
  outOfSync?: boolean;
}

export function canSaveState(state: GameState, isModalOpen: (name: string) => boolean): { allowed: boolean; error?: string } {
  const pokemonCount = (state.team?.length || 0) + (state.box?.length || 0);
  const isGtsSimulation = typeof window !== 'undefined' && '__GTS_SIMULATION__' in window && Boolean((window as Window & { __GTS_SIMULATION__?: boolean }).__GTS_SIMULATION__);

  if (!isGtsSimulation && (pokemonCount === 0 || !state.starterChosen)) {
    logger.debug('SAVE', `Guardado abortado: El jugador tiene ${pokemonCount} Pokémon y starterChosen es ${state.starterChosen}. Prevenida sobreescritura destructiva.`);
    return { allowed: false, error: 'Cannot save with 0 Pokémon or unchosen starter' };
  }

  try {
    if (isModalOpen('Evolution') || isModalOpen('MoveLearning')) {
      logger.warn('SAVE', 'Guardado abortado: El jugador está en medio de una evolución o aprendizaje de movimientos.');
      return { allowed: false, error: 'Cannot save during evolution or move learning' };
    }
  } catch (e) {
    logger.warn('SAVE', 'No se pudo validar el estado de los modales para el guardado:', e);
  }

  return { allowed: true };
}

export function updateSessionPlaytime(state: GameState, sessionStartTime: number | null): number {
  const now = Temporal.Now.instant().epochMilliseconds;
  if (sessionStartTime !== null) {
    const elapsedSecs = Math.floor((now - sessionStartTime) / 1000);
    if (elapsedSecs > 0) {
      state.playtime = (state.playtime || 0) + elapsedSecs;
    }
  }
  return now;
}

export async function handleSaveRollback(
  result: SaveRollbackPayload,
  db: DBRouter | null,
  user: AuthUser,
  notifyFn: (msg: string, icon?: string) => void,
  updateState: (data: GameState) => void
): Promise<void> {
  if (result.outOfSync) {
    notifyFn('Desincronización detectada. Restaurando...', '🔄');
  } else {
    notifyFn('Actualización detectada. Cargando partida desde la base de datos...', '📥');
  }

  let rollbackData = result.serverData;
  let freshSaveId = result.lastSaveId;

  if (!rollbackData && db) {
    const freshRes = await db.from('game_saves').select('save_data, last_save_id').eq('user_id', user.id).single();
    const freshSave = freshRes.data as { save_data: GameState; last_save_id: string } | null;
    if (freshSave) {
      rollbackData = freshSave.save_data;
      freshSaveId = freshSave.last_save_id;
    }
  }

  if (rollbackData) {
    updateState(rollbackData);
    if (freshSaveId) {
      user.last_save_id = freshSaveId;
    }

    try {
      const json = JSON.stringify(rollbackData);
      localStorage.setItem('pokemon_local_save_' + user.id, json);

      const compressed = await compress(json);
      await writeOpfsFile(`save_${user.id}.gz`, compressed);
      logger.info('SAVE', 'Rollback local storage (LS/OPFS) updated successfully');
    } catch (e) {
      logger.warn('SAVE', 'Error al actualizar almacenamiento local (LS/OPFS) durante el rollback:', e);
    } finally {
      await Promise.resolve();
      if (typeof window !== 'undefined') window.location.reload();
    }
  }
}
