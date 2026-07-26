
import type { DBRouter } from '@/logic/db/dbRouter';
import { TRAINER_RANKS } from '@/data/player/trainer';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

import { validateAndSanitize } from './saveService.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { decompress, isGzip } from '@/logic/utils/compression';
import { readOpfsFile, writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';

/**
 * Modernized Load Service.
 * Ported from legacy 01_auth.js 'onLogin' logic.
 */

import type { GameState } from '@/types/system/game';
import type { AuthUser } from '@/types/auth/auth';

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

  if ((user.db_version || 1) < 3) {
    if (db.mode === 'offline' || isLocalUser) {
      logger.info('LOAD', `Auto-migrando usuario offline/local a v3 (actual: ${user.db_version || 1})`);
      user.db_version = 3;
      if (isLocalUser && typeof localStorage !== 'undefined') {
        localStorage.setItem('pokevicio_local_user', JSON.stringify(user));
      } else if (!isLocalUser) {
        try {
          await db.from('profiles').update({ db_version: 3 }).eq('id', user.id);
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
  const opfsKey = `save_${user.id}.gz`
  let localData: GameState | null = null;

  try {
    const binary = await readOpfsFile(opfsKey)
    if (binary) {
      const json = isGzip(binary) ? await decompress(binary) : new TextDecoder().decode(binary)
      localData = JSON.parse(json) as GameState
    }
  } catch (e) {
    throw new Error(`[loadService] Error reading OPFS save file: ${(e as Error).message}`)
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
        localData = JSON.parse(lsRaw) as GameState
        
        // AUTOMATED BACKUP & MIGRATION
        logger.info('LOAD', 'Migrating localStorage to OPFS...')
        const timestamp = Temporal.Now.instant().epochMilliseconds
        const serverTime = Temporal.Now.instant().toString();
        db.setMockTime(serverTime);
        try {
          const { compress } = await import('@/logic/utils/compression')
          const compressed = await compress(lsRaw)
          await writeOpfsFile(`backup_migration_${user.id}_${timestamp}.gz`, compressed)
          await writeOpfsFile(opfsKey, compressed)
        } catch (opfsErr) {
          logger.warn('LOAD', `OPFS migration backup skipped: ${(opfsErr as Error).message}`)
        }
      } catch (e) {
        throw new Error(`[loadService] Error parsing localStorage save content: ${(e as Error).message}`)
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
  
  let isNewerThanCloud = false;
  if (localData) {
    try {
      if (cloudSaveRow) {
        const cloudData = cloudSaveRow.save_data;
        
        // Legacy fix for cloud saves
        if (cloudData.team && cloudData.team.length > 0) {
          cloudData.starterChosen = true;
        }
        
        let cloudTime = 0;
        if (cloudSaveRow.updated_at) {
          try {
            let dateStr = cloudSaveRow.updated_at;
            if (dateStr && !dateStr.includes('T') && dateStr.includes(' ')) {
              dateStr = dateStr.replace(' ', 'T') + 'Z';
            }
            cloudTime = (Temporal.Instant.from(dateStr) as unknown as { epochMilliseconds: number }).epochMilliseconds;
          } catch (_) {
            try {
              const ms = Number(cloudSaveRow.updated_at);
              cloudTime = !isNaN(ms) ? ms : Temporal.Instant.from(cloudSaveRow.updated_at).epochMilliseconds;
            } catch (err) {
              throw new Error(`[loadService] Error de parseo de timestamp en cloudSaveRow: ${(err as Error).message}`);
            }
          }
        }
        const localTime = (localData as unknown as { _last_updated?: number })._last_updated || 0;
 
        // Legacy Rule: If local is at least 3s newer, prioritize it.
        if (localTime > cloudTime + 3000) {
          logger.info('LOAD', 'Local save is newer. Prioritizing Local.');
          finalSaveData = localData;
          isNewerThanCloud = true;
        }
      }
    } catch (e) {
      throw new Error(`[loadService] Error parsing local save context: ${(e as Error).message}`);
    }
  }

  if (!finalSaveData) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  // 3. Backfill and Deep Normalization (Legacy Parity)
  const normalized = normalizeData(finalSaveData);

  // 4. Sanitize and Validate
  const { data: sanitized, valid, issues, error: validationError } = validateAndSanitize(normalized);
  if (!valid) {
    logger.error('LOAD', 'Error crítico de validación al cargar partida:', validationError || issues);
    throw new Error(`Carga abortada por datos corruptos o inválidos: ${validationError || issues.join(', ')}`);
  }


  return {
    data: sanitized as unknown as GameState,
    issues,
    lastSaveId: cloudSaveRow?.last_save_id || null,
    isNewerThanCloud
  };
}

/**
 * Deep normalization for legacy data compatibility.
 */
function normalizeData(state: GameState): GameState {
  if (!state) return state;

  // Auto-heal trainerExpNeeded based on current trainerLevel
  const level = state.trainerLevel || 1;
  const idx = Math.min(level - 1, TRAINER_RANKS.length - 1);
  const currentRank = TRAINER_RANKS[idx];
  if (currentRank) {
    state.trainerExpNeeded = currentRank.expNeeded;
  }

  if (!state.gender) state.gender = 'h';
  if (state.fishingRodSecs === undefined) state.fishingRodSecs = 0;
  if (state.fishingRodType === undefined) state.fishingRodType = null;
  if (state.fishingRodType === ('silver' as unknown)) state.fishingRodType = 'good';
  if (state.fishingRodType === ('gold' as unknown)) state.fishingRodType = 'super';
  
  if (state.pickaxeSecs === undefined) state.pickaxeSecs = 0;
  if (state.pickaxeType === undefined) state.pickaxeType = null;
  if (state.pickaxeType === ('silver' as unknown)) state.pickaxeType = 'good';
  if (state.pickaxeType === ('gold' as unknown)) state.pickaxeType = 'super';

  if (state.brushSecs === undefined) state.brushSecs = 0;
  if (state.brushType === undefined) state.brushType = null;
  if (state.brushType === ('silver' as unknown)) state.brushType = 'good';
  if (state.brushType === ('gold' as unknown)) state.brushType = 'super';

  // Ensure arrays exist
  if (!Array.isArray(state.team)) state.team = [];
  if (!Array.isArray(state.box)) state.box = [];
  if (!Array.isArray(state.pokedex)) state.pokedex = [];
  if (!Array.isArray(state.seenPokedex)) state.seenPokedex = [];

  // Data fix: ensure UID and Gender for all Pokemon
  const fixPoke = (p: Pokemon): Pokemon | null => {
    if (!p) return null;
    if (!p.uid) p.uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Temporal.Now.instant().epochMilliseconds.toString(36);
    
    // Legacy gender backfill
    if (!p.gender) {
      // Logic from legacy 02_pokemon_data.js
      const isGenderless = ['magnemite', 'magneton', 'voltorb', 'electrode', 'staryu', 'starmie', 'ditto', 'porygon', 'mewtwo', 'mew'].includes(p.id);
      if (!isGenderless) {
        p.gender = Math.random() < 0.5 ? 'M' : 'F';
      }
    }

    // Legacy ability backfill
    if (!p.ability) {
      const speciesAbilities = pokemonDataProvider.getSpeciesAbilities(p.id);
      p.ability = speciesAbilities[0] || 'overgrow';
    }

    if (p.vigor === undefined) p.vigor = 100;
    if (p.maxVigor === undefined) p.maxVigor = 100;

    // Clean legacy iv fields if corrupted
    if (p.ivs) {
      const ivs = p.ivs as unknown as Record<string, unknown>
      delete ivs._cost;
      delete ivs._nature;
    }

    // Backfill capture date if missing
    const pRaw = p as unknown as Record<string, unknown>
    if (!p.obtainedAt && !pRaw.created_at && !pRaw.captureDate && !pRaw.timestamp && !pRaw.date) {
      p.obtainedAt = Temporal.Now.instant().epochMilliseconds;
    }

    return p;
  };

  state.team = state.team.map((p: Pokemon) => fixPoke(p)).filter((p: Pokemon | null): p is Pokemon => p !== null);
  state.box = state.box.map((p: Pokemon) => fixPoke(p)).filter((p: Pokemon | null): p is Pokemon => p !== null);

  // Patch: If the team exceeds 6 pokemon, safely move the excess to the box
  if (state.team.length > 6) {
    const excess = state.team.slice(6);
    state.team = state.team.slice(0, 6);
    state.box = [...state.box, ...excess];
  }

  // Normalize legacy badges (array to count)
  if (Array.isArray(state.badges)) {
    state.badges = state.badges.length;
  }

  // AUTO-HEAL & MIGRATION FOR LEGACY GYM SAVES
  if (!Array.isArray(state.defeatedGyms)) {
    state.defeatedGyms = [];
  }

  if (state.defeatedGyms.length > 0) {
    // Sincronizar el contador con la lista real de derrotados si hay inconsistencia
    if (state.badges !== state.defeatedGyms.length) {
      state.badges = state.defeatedGyms.length;
    }
  } else if (state.badges > 0) {
    // Si tiene un contador de medallas heredado pero defeatedGyms está vacío,
    // reconstruimos la lista secuencialmente según el orden de progresión de Kanto
    const allGymIds = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'];
    const count = Math.min(8, Math.max(0, state.badges));
    state.defeatedGyms = allGymIds.slice(0, count);
  }

  if (state.lastPokemonCenterHeal === undefined) {
    state.lastPokemonCenterHeal = 0;
  }

  return state;
}
