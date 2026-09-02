
import type { DBRouter } from '@/logic/db/dbRouter';
import { readOpfsFile, writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';
import { processSaveInWorker, compressSaveInWorker } from '@/logic/workers/saveWorkerClient';

/**
 * Modernized Load Service.
 * Ported from legacy 01_auth.js 'onLogin' logic.
 */

import type { GameState } from '@/types/system/game';
import type { AuthUser } from '@/types/auth/auth';

const REQUIRED_DB_VERSION = 3;

export interface LoadResult {
  data: GameState | null;
  issues: string[];
  lastSaveId: string | null;
  isNewerThanCloud: boolean;
}

export async function loadBestSave(user: AuthUser | null, db: DBRouter): Promise<LoadResult> {
  if (!user) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  // En este punto el DBRouter está inicializado y migrado, consultamos la versión real de la cuenta en profiles
  const isLocalUser = user.id === 'local_user' || user.id.startsWith('local_');
  if (!isLocalUser) {
    try {
      const { data: profile } = await db.from('profiles').select('db_version').eq('id', user.id).single() as { data: { db_version: number } | null };
      if (profile && profile.db_version) {
        user.db_version = profile.db_version;
      }
    } catch (e) {
      throw new Error(`[loadService] Error de consulta db_version en profiles: ${(e as Error).message}`);
    }
  }

  if ((user.db_version || 1) < REQUIRED_DB_VERSION) {
    if (db.mode === 'offline' || isLocalUser) {
      logger.info('LOAD', `Auto-migrando usuario offline/local a v${REQUIRED_DB_VERSION} (actual: ${user.db_version || 1})`);
      user.db_version = REQUIRED_DB_VERSION;
      if (isLocalUser && typeof localStorage !== 'undefined') {
        localStorage.setItem('pokevicio_local_user', JSON.stringify(user));
      } else if (!isLocalUser) {
        try {
          await db.from('profiles').update({ db_version: REQUIRED_DB_VERSION }).eq('id', user.id);
        } catch (e) {
          throw new Error(`[loadService] Error al actualizar db_version en profiles: ${(e as Error).message}`);
        }
      }
    } else {
      logger.error('LOAD', `La cuenta del usuario (versión ${user.db_version || 1}) no está migrada a v3. Abortando carga.`);
      throw new Error('La partida requiere actualización de seguridad (v3). Contacta al administrador.');
    }
  }

  let cloudSaveRow: { save_data: GameState; updated_at: string; last_save_id: string } | null = null;
  let finalSaveData: GameState | null = null;

  const isOnlineLocalUser = db.mode === 'online' && (user.id === 'local_user' || user.id.startsWith('local_'));

  // 1. Fetch Save from Database (Supabase in online mode, SQLite in offline mode)
  if (!isOnlineLocalUser) {
    try {
      const { data: saves, error } = await db.from('game_saves')
        .select('save_data, updated_at, last_save_id')
        .eq('user_id', user.id)
        .single();
    
    if (!error && saves) {
      // Parse save_data if it is stored as a string (SQLite context)
      let parsedSave = (saves as { save_data: unknown }).save_data;
      if (typeof parsedSave === 'string') {
        try {
          parsedSave = JSON.parse(parsedSave);
        } catch (e) {
          throw new Error(`[loadService] Error al parsear JSON save_data: ${(e as Error).message}`);
        }
      }
      
      cloudSaveRow = {
        save_data: parsedSave as GameState,
        updated_at: (saves as { updated_at: string }).updated_at,
        last_save_id: (saves as { last_save_id: string }).last_save_id
      };
      finalSaveData = parsedSave as GameState;
    }
  } catch (e) {
    throw new Error(`[loadService] Error de consulta en la base de datos para game_saves: ${(e as Error).message}`);
  }
  }

  // 2. Fetch Local Save (Prioritize OPFS Binary over LocalStorage)
  const opfsKey = `save_${user.id}.gz`;
  let localData: GameState | null = null;
  const accumulatedIssues: string[] = []; // no-domain

  try {
    const binary = await readOpfsFile(opfsKey);
    if (binary) {
      const workerRes = await processSaveInWorker({ binary });
      if (workerRes.valid && workerRes.data) {
        localData = workerRes.data as GameState; // domain-ok
        if (workerRes.issues?.length) accumulatedIssues.push(...workerRes.issues);
      }
    }
  } catch (e) {
    throw new Error(`[loadService] Error reading OPFS save file: ${(e as Error).message}`);
  }

  // Fallback to LocalStorage + Migration
  if (!localData) {
    const lsKey = 'pokemon_local_save_' + user.id;
    let lsRaw = localStorage.getItem(lsKey);
    
    // Legacy Fallback (v1 -> v2 migration)
    if (!lsRaw) {
      lsRaw = localStorage.getItem('pokevicio_save_v3_ash');
      if (lsRaw) logger.info('LOAD', 'Legacy save found for migration.');
    }

    if (lsRaw) {
      try {
        const workerRes = await processSaveInWorker({ rawString: lsRaw });
        if (workerRes.valid && workerRes.data) {
          localData = workerRes.data as GameState; // domain-ok
          if (workerRes.issues?.length) accumulatedIssues.push(...workerRes.issues);
        } else {
          localData = JSON.parse(lsRaw) as GameState;
        }
        
        // AUTOMATED BACKUP & MIGRATION
        logger.info('LOAD', 'Migrating localStorage to OPFS...');
        const timestamp = Temporal.Now.instant().epochMilliseconds;
        const serverTime = Temporal.Now.instant().toString();
        db.setMockTime(serverTime);
        try {
          const compressed = await compressSaveInWorker(lsRaw);
          await writeOpfsFile(`backup_migration_${user.id}_${timestamp}.gz`, compressed);
          await writeOpfsFile(opfsKey, compressed);
        } catch (opfsErr) {
          logger.warn('LOAD', `OPFS migration backup skipped: ${(opfsErr as Error).message}`);
        }
      } catch (e) {
        throw new Error(`[loadService] Error parsing localStorage save content: ${(e as Error).message}`);
      }
    }
  }

  // 3. Database is the absolute Single Source of Truth (SSoT) for both Online and Offline contexts.
  // When a database record exists in game_saves, it MUST ALWAYS take precedence over local client caches.
  // This prevents stale local saves from overriding server restorations, database rollbacks, or migrations.
  if (cloudSaveRow) {
    finalSaveData = cloudSaveRow.save_data;
    if (finalSaveData.team && finalSaveData.team.length > 0) {
      finalSaveData.starterChosen = true;
    }
    // Update local OPFS cache to stay synchronized with authoritative database state
    try {
      const compressed = await compressSaveInWorker(JSON.stringify(finalSaveData));
      await writeOpfsFile(opfsKey, compressed);
    } catch (_) {
      // Non-blocking cache sync
    }
  } else if (localData) {
    // Only fall back to local cached save if no database record exists (e.g. initial offline sandbox)
    finalSaveData = localData;
    if (finalSaveData.team && finalSaveData.team.length > 0) {
      finalSaveData.starterChosen = true;
    }
  }

  if (!finalSaveData) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  // Direct Validation & Sanitation without runtime fallback patching (executed via Worker)
  const validationResult = await processSaveInWorker({ rawObject: finalSaveData });
  const { data: sanitized, valid, issues, error: validationError } = validationResult;
  if (!valid || !sanitized) {
    logger.error('LOAD', 'Error crítico de validación al cargar partida:', validationError || issues);
    throw new Error(`Carga abortada por datos corruptos o inválidos: ${validationError || issues.join(', ')}`);
  }
  if (issues?.length) {
    accumulatedIssues.push(...issues);
  }

  return {
    data: sanitized as GameState, // domain-ok
    issues: accumulatedIssues,
    lastSaveId: cloudSaveRow?.last_save_id || null,
    isNewerThanCloud: false
  };
}
