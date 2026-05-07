
import { validateAndSanitize } from './saveService';
import type { Pokemon } from '@/types/pokemon';
import { decompress, isGzip } from '@/logic/utils/compression';
import { readOpfsFile, writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';

/**
 * Modernized Load Service.
 * Ported from legacy 01_auth.js 'onLogin' logic.
 */

import type { GameState } from '@/types/game';
import type { AuthUser } from '@/types/auth';

export interface LoadResult {
  data: GameState | null;
  issues: string[];
  lastSaveId: string | null;
  isNewerThanCloud: boolean;
}

export async function loadBestSave(user: AuthUser | null, db: any): Promise<LoadResult> {
  if (!user) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  let cloudSaveRow: any = null;
  let finalSaveData: any = null;

  // 1. Fetch Cloud Save if online
  if (db.mode === 'online') {
    try {
      const { data: saves, error } = await db.from('game_saves')
        .select('save_data, updated_at, last_save_id')
        .eq('user_id', user.id)
        .single();
      
      if (!error && saves) {
        cloudSaveRow = saves;
        finalSaveData = saves.save_data;
      }
    } catch (e) {
      logger.error('LOAD', `Cloud fetch failed: ${(e as Error).message}`);
    }
  }

  // 2. Fetch Local Save (Prioritize OPFS Binary over LocalStorage)
  const opfsKey = `save_${user.id}.gz`
  let localData: any = null
  let source = 'NONE'

  try {
    const binary = await readOpfsFile(opfsKey)
    if (binary) {
      const json = isGzip(binary) ? await decompress(binary) : new TextDecoder().decode(binary)
      localData = JSON.parse(json)
      source = 'OPFS'
    }
  } catch (e) {
    logger.warn('LOAD', `Error reading OPFS save: ${(e as Error).message}`)
  }

  // Fallback to LocalStorage + Migration
  if (!localData) {
    const lsKey = 'pokemon_local_save_' + user.id
    let lsRaw = localStorage.getItem(lsKey)
    
    // Legacy Fallback (v1 -> v2 migration)
    if (!lsRaw) {
      lsRaw = localStorage.getItem('pokevicio_save_v3_ash')
      if (lsRaw) logger.info('LOAD', 'Legacy save found for migration.')
    }

    if (lsRaw) {
      try {
        localData = JSON.parse(lsRaw)
        source = 'LS_MIGRATION'
        
        // AUTOMATED BACKUP & MIGRATION
        logger.info('LOAD', 'Migrating localStorage to OPFS...')
        const timestamp = Temporal.Now.instant().epochMilliseconds
        const { compress } = await import('@/logic/utils/compression')
        const compressed = await compress(lsRaw)
        await writeOpfsFile(`backup_migration_${user.id}_${timestamp}.gz`, compressed)
        await writeOpfsFile(opfsKey, compressed)
      } catch (e) {
        logger.warn('LOAD', `Error parsing localStorage save: ${(e as Error).message}`)
      }
    }
  }

  // Set as initial fallback if cloud failed or was skipped
  if (localData && !finalSaveData) {
    finalSaveData = localData;
  }
  
  // Force starterChosen to true if they already have a team (legacy fix)
  if (localData && localData.team && localData.team.length > 0) {
    localData.starterChosen = true;
  }
 
  if (localData) logger.debug('LOAD', 'Local save state:', { starterChosen: localData.starterChosen, teamSize: localData.team?.length });
  
  if (localData) {
    try {
      if (cloudSaveRow) {
        const cloudData = cloudSaveRow.save_data;
        
        // Legacy fix for cloud saves
        if (cloudData.team && cloudData.team.length > 0) {
          cloudData.starterChosen = true;
        }
        
        const cloudTime = cloudSaveRow.updated_at ? new Date(cloudSaveRow.updated_at).getTime() : 0;
        const localTime = localData._last_updated || 0;
 
        // Legacy Rule: If local is at least 3s newer, prioritize it.
        if (localTime > cloudTime + 3000) {
          logger.info('LOAD', 'Local save is newer. Prioritizing Local.');
          finalSaveData = localData;
        }
      }
    } catch (e) {
      logger.warn('LOAD', `Error parsing local save: ${(e as Error).message}`);
    }
  }

  if (!finalSaveData) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  // 3. Sanitize and Normalize
  const { data: sanitized, issues } = validateAndSanitize(finalSaveData);
  
  // 4. Backfill and Deep Normalization (Legacy Parity)
  const normalized = normalizeData(sanitized as any);

  return {
    data: normalized,
    issues,
    lastSaveId: cloudSaveRow?.last_save_id || null,
    isNewerThanCloud: !!(localData && finalSaveData === localData && cloudSaveRow)
  };
}

/**
 * Deep normalization for legacy data compatibility.
 */
function normalizeData(state: any): GameState {
  if (!state) return state;

  // Ensure arrays exist
  if (!Array.isArray(state.team)) state.team = [];
  if (!Array.isArray(state.box)) state.box = [];
  if (!Array.isArray(state.pokedex)) state.pokedex = [];
  if (!Array.isArray(state.seenPokedex)) state.seenPokedex = [];

  // Data fix: ensure UID and Gender for all Pokemon
  const fixPoke = (p: Pokemon): Pokemon | null => {
    if (!p) return null;
    if (!p.uid) p.uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    
    // Legacy gender backfill
    if (!p.gender) {
      // Logic from legacy 02_pokemon_data.js
      const isGenderless = ['magnemite', 'magneton', 'voltorb', 'electrode', 'staryu', 'starmie', 'ditto', 'porygon', 'mewtwo', 'mew'].includes(p.id);
      if (!isGenderless) {
        p.gender = Math.random() < 0.5 ? 'M' : 'F';
      }
    }

    // Clean legacy iv fields if corrupted
    if (p.ivs) {
      delete (p.ivs as any)._cost;
      delete (p.ivs as any)._nature;
    }

    // Backfill capture date if missing
    if (!p.obtainedAt && !(p as any).created_at && !(p as any).captureDate && !(p as any).timestamp && !(p as any).date) {
      p.obtainedAt = Date.now();
    }

    return p;
  };

  state.team = state.team.map((p: any) => fixPoke(p)).filter((p: any): p is Pokemon => p !== null);
  state.box = state.box.map((p: any) => fixPoke(p)).filter((p: any): p is Pokemon => p !== null);

  // Normalize legacy badges (array to count)
  if (Array.isArray(state.badges)) {
    state.badges = state.badges.length;
  }

  return state;
}
