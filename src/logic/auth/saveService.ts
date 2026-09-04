import type { GameState } from '@/types/system/game';
import type { AuthUser } from '@/types/auth/auth';
import { compress } from '@/logic/utils/compression';
import { writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';
import type { DBRouter } from '@/logic/db/dbRouter';
import { serializeState, serializeSaveGenderCodes } from '@/logic/auth/saveSerializer';
import { validateAndSanitize, isValidState } from '@/logic/auth/saveSanitizer';
import { syncUserProfileData } from '@/logic/auth/profileSyncHelper';

import type { SaveDataDto } from '@/logic/validation/schemas';

export { serializeState, isValidState, validateAndSanitize };

export interface SaveResult {
  success?: boolean;
  remote?: boolean;
  rollback?: boolean;
  serverData?: unknown;
  error?: string;
  outOfSync?: boolean;
  sanitized?: boolean;
  migrated?: boolean;
  lastSaveId?: string;
}

export const saveOperationState = {
  isSaving: false,
  isRollingBack: false,
};

let latestCommittedSaveId: string | null = null; // uuid-ok: Database save UUID identifier

export function setLatestCommittedSaveId(id: string | null): void { // uuid-ok: Database save UUID identifier
  latestCommittedSaveId = id;
}

export function getLatestCommittedSaveId(): string | null {
  return latestCommittedSaveId;
}

export function resetSaveOperationState(): void {
  saveOperationState.isSaving = false;
  saveOperationState.isRollingBack = false;
  latestCommittedSaveId = null;
}

export interface SaveOptions {
  showNotif?: boolean;
  notifyFn?: (msg: string, icon?: string) => void;
  db?: DBRouter;
  userVersion?: number;
  lastSaveId?: string;
  skipRemote?: boolean;
}

async function persistSaveLocally(persistedSaveData: unknown, userId: string): Promise<void> {
  try {
    const json = JSON.stringify(persistedSaveData);
    localStorage.setItem('pokemon_local_save_' + userId, json);

    const compressed = await compress(json);
    await writeOpfsFile(`save_${userId}.gz`, compressed);
  } catch (e) {
    logger.warn('SAVE', `Error en persistencia local (LS/OPFS): ${(e as Error).message}`);
  }
}

async function handleDuplicatesRollback(db: DBRouter, userId: string, issues?: unknown): Promise<SaveResult> {
  logger.error('SAVE', 'Duplicados críticos detectados en v2+. Iniciando ROLLBACK.', issues);
  try {
    const { data } = await db.from('game_saves').select('save_data').eq('user_id', userId).single();
    const serverSave = data as { save_data: GameState } | null;
    if (serverSave?.save_data) {
      saveOperationState.isRollingBack = true;
      return { rollback: true, serverData: serverSave.save_data };
    }
  } catch (e) {
    logger.error('SAVE', `Error durante rollback: ${(e as Error).message}`);
  }
  saveOperationState.isRollingBack = true;
  return { rollback: true, error: 'Inconsistencia detectada. Recarga la página.' };
}

async function performRemoteSave(
  db: DBRouter,
  user: AuthUser,
  persistedSaveData: unknown,
  saveData: SaveDataDto,
  options: SaveOptions,
  hadDuplicates?: boolean
): Promise<SaveResult> {
  const currentVersion = options.userVersion || 1;
  const isLegacy = currentVersion < 3;
  const { showNotif = true, notifyFn } = options;

  try {
    const expectedId = latestCommittedSaveId || user.last_save_id || options.lastSaveId || null;
    const { data: res, error } = await db.rpc('save_game_trusted', {
      p_save_data: persistedSaveData,
      p_expected_id: expectedId
    });

    if (error) throw error;

    const resData = res as { success: boolean; error: string; last_save_id: string } | null;
    if (resData && resData.success === false && resData.error === 'OUT_OF_SYNC') {
      logger.warn('SAVE', 'Concurrencia detectada. El servidor tiene una versión más nueva.');
      saveOperationState.isRollingBack = true;
      return { rollback: true, outOfSync: true };
    }

    if (resData?.last_save_id) {
      latestCommittedSaveId = resData.last_save_id;
      user.last_save_id = resData.last_save_id;
    }

    await syncUserProfileData(db, user, saveData);

    let migrated = false;
    if (isLegacy) {
      try {
        await db.from('profiles').update({ db_version: 3 }).eq('id', user.id);
        user.db_version = 3;
        migrated = true;
        logger.success('SAVE', 'Account migrated to db_version v3');
      } catch (e) {
        logger.warn('SAVE', `Migration update failed: ${(e as Error).message}`);
      }
    }

    if (showNotif && notifyFn) {
      if (migrated) notifyFn('¡Cuenta migrada a Seguridad v3!', '✨');
      else if (hadDuplicates) notifyFn('Cache saneada (duplicados eliminados)', '🛡️');
      else notifyFn('Juego Guardado', '💾');
    }

    return {
      success: true,
      sanitized: hadDuplicates,
      migrated,
      lastSaveId: resData?.last_save_id
    };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    logger.warn('SAVE', `Error en DB Persistente: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

let activeSavePromise: Promise<SaveResult | null> | null = null;
let pendingResolvers: ((result: SaveResult | null) => void)[] = [];

async function executeSaveDirect(state: GameState, user: AuthUser, options: SaveOptions = {}): Promise<SaveResult | null> {
  const { showNotif = true, notifyFn, db } = options;
  saveOperationState.isSaving = true;
  try {
    const raw_data = serializeState(state);
    const validation = validateAndSanitize(raw_data);

    if (!validation.valid) {
      logger.error('SAVE', 'Abortando proceso de guardado por estado de datos erróneo:', validation.error || validation.issues);
      if (showNotif && notifyFn) {
        notifyFn(`Error al guardar: ${validation.error || 'Datos corruptos o inválidos'}`, '🔴');
      }
      return { success: false, error: validation.error || 'Datos corruptos o inválidos' };
    }

    const save_data = validation.data;
    const hadDuplicates = validation.hadDuplicates;
    const issues = validation.issues;

    const currentVersion = options.userVersion || 1;
    const isLegacy = currentVersion < 3;

    if (hadDuplicates && db && db.mode === 'online' && !isLegacy) {
      return await handleDuplicatesRollback(db, user.id, issues);
    }

    const isOnlineLocalUser = db && db.mode === 'online' && (user.id === 'local_user' || user.id.startsWith('local_'));

    (save_data as { _last_updated?: number })._last_updated = Temporal.Now.instant().epochMilliseconds;
    const persistedSaveData = serializeSaveGenderCodes(save_data);

    // 1. Local Persistence (Legacy LocalStorage + Modern OPFS GZIP)
    await persistSaveLocally(persistedSaveData, user.id);

    // 2. Database
    if (!db || options.skipRemote || isOnlineLocalUser) {
      if (options.skipRemote || isOnlineLocalUser) {
        logger.info('SAVE', `Database save skipped (${isOnlineLocalUser ? 'Local User in Online Mode' : 'Session Locked'}). Local storage only.`);
      } else {
        logger.warn('SAVE', 'No DBRouter instance provided. Skipping DB save.');
      }

      if (showNotif && notifyFn && (options.skipRemote || isOnlineLocalUser) && user.id !== 'local_user' && !user.id.startsWith('local_')) {
        notifyFn('Progreso guardado localmente (Sesión Bloqueada)', '🟠');
      }
      return { success: true, remote: false };
    }

    return await performRemoteSave(db, user, persistedSaveData, save_data, options, hadDuplicates);
  } finally {
    saveOperationState.isSaving = false;
  }
}

export async function saveGame(state: GameState, user: AuthUser, options: SaveOptions = {}): Promise<SaveResult | null> {
  if (!user || saveOperationState.isRollingBack) {
    if (saveOperationState.isRollingBack) {
      logger.warn('SAVE', 'saveGame blocked early because rollback is in progress.');
    }
    return null;
  }

  if (activeSavePromise) {
    return new Promise<SaveResult | null>((resolve) => {
      pendingResolvers.push(resolve);
    });
  }

  const runWithQueue = async (): Promise<SaveResult | null> => {
    try {
      return await executeSaveDirect(state, user, options);
    } finally {
      activeSavePromise = null;
      if (pendingResolvers.length > 0) {
        const waiting = pendingResolvers;
        pendingResolvers = [];
        const followUp = await saveGame(state, user, { ...options, lastSaveId: latestCommittedSaveId || undefined });
        waiting.forEach(r => r(followUp));
      }
    }
  };

  activeSavePromise = runWithQueue();
  return activeSavePromise;
}
