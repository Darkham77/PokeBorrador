import type { DBRouter } from '@/logic/db/dbRouter';
import { readOpfsFile, writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';
import { processSaveInWorker, compressSaveInWorker } from '@/logic/workers/saveWorkerClient';
import type { GameState } from '@/types/system/game';
import type { AuthUser } from '@/types/auth/auth';

const REQUIRED_DB_VERSION = 3;

export interface LoadResult {
  data: GameState | null;
  issues: string[];
  lastSaveId: string | null;
  isNewerThanCloud: boolean;
}

interface CloudSaveRow {
  save_data: GameState;
  updated_at: string;
  last_save_id: string;
}

async function syncProfileDbVersion(user: AuthUser, db: DBRouter): Promise<void> {
  const isLocalUser = user.id === 'local_user' || user.id.startsWith('local_');
  if (isLocalUser) return;

  try {
    const { data: profile } = await db.from('profiles').select('db_version').eq('id', user.id).single() as { data: { db_version: number } | null };
    if (profile?.db_version) {
      user.db_version = profile.db_version;
    }
  } catch (e) {
    logger.warn('LOAD', `[loadService] Fallo al consultar db_version en profiles (red no disponible): ${(e as Error).message}`);
  }
}

async function migrateUserDbVersion(user: AuthUser, db: DBRouter, isLocalUser: boolean): Promise<void> {
  logger.info('LOAD', `Auto-migrando usuario offline/local a v${REQUIRED_DB_VERSION} (actual: ${user.db_version || 1})`);
  user.db_version = REQUIRED_DB_VERSION;
  if (isLocalUser && typeof localStorage !== 'undefined') {
    localStorage.setItem('pokevicio_local_user', JSON.stringify(user));
    return;
  }
  if (!isLocalUser) {
    try {
      await db.from('profiles').update({ db_version: REQUIRED_DB_VERSION }).eq('id', user.id);
    } catch (e) {
      logger.warn('LOAD', `[loadService] Fallo al actualizar db_version en profiles (red no disponible): ${(e as Error).message}`);
    }
  }
}

async function ensureUserDbVersion(user: AuthUser, db: DBRouter): Promise<void> {
  await syncProfileDbVersion(user, db);
  const isLocalUser = user.id === 'local_user' || user.id.startsWith('local_');
  const currentVersion = user.db_version || 1;

  if (currentVersion >= REQUIRED_DB_VERSION) return;

  if (db.mode === 'offline' || isLocalUser) {
    await migrateUserDbVersion(user, db, isLocalUser);
  } else {
    logger.error('LOAD', `La cuenta del usuario (versión ${currentVersion}) no está migrada a v3. Abortando carga.`);
    throw new Error('La partida requiere actualización de seguridad (v3). Contacta al administrador.');
  }
}

function parseSaveData(rawSaveData: unknown): GameState {
  if (typeof rawSaveData !== 'string') {
    return rawSaveData as GameState;
  }
  try {
    return JSON.parse(rawSaveData) as GameState;
  } catch (e) {
    throw new Error(`[loadService] Error al parsear JSON save_data: ${(e as Error).message}`, { cause: e });
  }
}

async function fetchDatabaseSave(user: AuthUser, db: DBRouter): Promise<CloudSaveRow | null> {
  const isOnlineLocalUser = db.mode === 'online' && (user.id === 'local_user' || user.id.startsWith('local_'));
  if (isOnlineLocalUser) return null;

  try {
    const { data: saves, error } = await db.from('game_saves')
      .select('save_data, updated_at, last_save_id')
      .eq('user_id', user.id)
      .single();

    if (error || !saves) return null;

    const parsedSave = parseSaveData((saves as { save_data: unknown }).save_data);
    return {
      save_data: parsedSave,
      updated_at: (saves as { updated_at: string }).updated_at,
      last_save_id: (saves as { last_save_id: string }).last_save_id
    };
  } catch (e) {
    logger.warn('LOAD', `[loadService] Fallo al consultar game_saves (red no disponible): ${(e as Error).message}`);
    return null;
  }
}

async function loadOpfsSave(opfsKey: string, accumulatedIssues: string[]): Promise<GameState | null> {
  try {
    const binary = await readOpfsFile(opfsKey);
    if (!binary) return null;

    const workerRes = await processSaveInWorker({ binary });
    if (workerRes.valid && workerRes.data) {
      if (workerRes.issues?.length) accumulatedIssues.push(...workerRes.issues);
      return workerRes.data as GameState; // domain-ok: Open dynamic text or non-domain string payload
    }
    return null;
  } catch (e) {
    throw new Error(`[loadService] Error reading OPFS save file: ${(e as Error).message}`, { cause: e });
  }
}

async function backupAndMigrateLocalStorage(userId: string, opfsKey: string, lsRaw: string, db: DBRouter): Promise<void> {
  logger.info('LOAD', 'Migrating localStorage to OPFS...');
  const timestamp = Temporal.Now.instant().epochMilliseconds;
  const serverTime = Temporal.Now.instant().toString();
  db.setMockTime(serverTime);
  try {
    const compressed = await compressSaveInWorker(lsRaw);
    await writeOpfsFile(`backup_migration_${userId}_${timestamp}.gz`, compressed);
    await writeOpfsFile(opfsKey, compressed);
  } catch (opfsErr) {
    logger.warn('LOAD', `OPFS migration backup skipped: ${(opfsErr as Error).message}`);
  }
}

function getLocalStorageRawSave(userId: string): string | null {
  const lsKey = 'pokemon_local_save_' + userId;
  const lsRaw = localStorage.getItem(lsKey);
  if (lsRaw) return lsRaw;

  // Legacy Fallback (v1 -> v2 migration)
  const legacyRaw = localStorage.getItem('pokevicio_save_v3_ash');
  if (legacyRaw) {
    logger.info('LOAD', 'Legacy save found for migration.');
  }
  return legacyRaw;
}

async function loadLocalStorageSave(
  user: AuthUser,
  opfsKey: string,
  db: DBRouter,
  accumulatedIssues: string[]
): Promise<GameState | null> {
  const lsRaw = getLocalStorageRawSave(user.id);
  if (!lsRaw) return null;

  try {
    let localData: GameState;
    const workerRes = await processSaveInWorker({ rawString: lsRaw });
    if (workerRes.valid && workerRes.data) {
      localData = workerRes.data as GameState; // domain-ok: Open dynamic text or non-domain string payload
      if (workerRes.issues?.length) accumulatedIssues.push(...workerRes.issues);
    } else {
      localData = JSON.parse(lsRaw) as GameState;
    }

    await backupAndMigrateLocalStorage(user.id, opfsKey, lsRaw, db);
    return localData;
  } catch (e) {
    throw new Error(`[loadService] Error parsing localStorage save content: ${(e as Error).message}`, { cause: e });
  }
}

async function fetchLocalSave(
  user: AuthUser,
  opfsKey: string,
  db: DBRouter,
  accumulatedIssues: string[]
): Promise<GameState | null> {
  const opfsData = await loadOpfsSave(opfsKey, accumulatedIssues);
  if (opfsData) return opfsData;

  return loadLocalStorageSave(user, opfsKey, db, accumulatedIssues);
}

async function syncAuthoritativeCloudSave(
  cloudSave: CloudSaveRow,
  opfsKey: string
): Promise<GameState> {
  const finalSaveData = cloudSave.save_data;
  if (finalSaveData.team && finalSaveData.team.length > 0) {
    finalSaveData.starterChosen = true;
  }
  // Update local OPFS cache to stay synchronized with authoritative database state
  try {
    const compressed = await compressSaveInWorker(JSON.stringify(finalSaveData));
    await writeOpfsFile(opfsKey, compressed);
  } catch (err) {
    logger.warn('[loadService] Error actualizando cache OPFS con cloud save:', err);
  }
  return finalSaveData;
}

function selectAuthoritativeData(
  cloudSave: CloudSaveRow | null,
  localData: GameState | null,
  opfsKey: string
): Promise<GameState | null> {
  if (cloudSave) {
    return syncAuthoritativeCloudSave(cloudSave, opfsKey);
  }
  if (localData) {
    if (localData.team && localData.team.length > 0) {
      localData.starterChosen = true;
    }
    return Promise.resolve(localData);
  }
  return Promise.resolve(null);
}

async function validateLoadedSave(
  saveData: GameState,
  accumulatedIssues: string[]
): Promise<GameState> {
  const validationResult = await processSaveInWorker({ rawObject: saveData });
  const { data: sanitized, valid, issues, error: validationError } = validationResult;
  if (!valid || !sanitized) {
    logger.error('LOAD', 'Error crítico de validación al cargar partida:', validationError || issues);
    throw new Error(`Carga abortada por datos corruptos o inválidos: ${validationError || issues.join(', ')}`);
  }
  if (issues?.length) {
    accumulatedIssues.push(...issues);
  }
  return sanitized as GameState; // domain-ok: Open dynamic text or non-domain string payload
}

export async function loadBestSave(user: AuthUser | null, db: DBRouter): Promise<LoadResult> {
  if (!user) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  await ensureUserDbVersion(user, db);

  const cloudSaveRow = await fetchDatabaseSave(user, db);
  const opfsKey = `save_${user.id}.gz`;
  const accumulatedIssues: string[] = []; // no-domain: Non-domain utility collection or data structure

  const localData = await fetchLocalSave(user, opfsKey, db, accumulatedIssues);
  const candidateSave = await selectAuthoritativeData(cloudSaveRow, localData, opfsKey);

  if (!candidateSave) {
    return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };
  }

  const sanitized = await validateLoadedSave(candidateSave, accumulatedIssues);

  return {
    data: sanitized,
    issues: accumulatedIssues,
    lastSaveId: cloudSaveRow?.last_save_id || null,
    isNewerThanCloud: false
  };
}

