import { validateAndSanitize } from './saveService';

/**
 * Modernized Load Service.
 * Ported from legacy 01_auth.js 'onLogin' logic.
 */

/**
 * Loads the best available save data (Cloud vs Local).
 * @param {Object} user - Current authenticated user.
 * @param {DBRouter} db - Database router instance.
 */
export async function loadBestSave(user, db) {
  if (!user) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  let cloudSaveRow = null;
  let finalSaveData = null;

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
      console.error('[LOAD] Cloud fetch failed:', e);
    }
  }

  // 2. Fetch Local Save
  const localSaveKey = 'pokemon_local_save_' + user.id;
  let localRaw = localStorage.getItem(localSaveKey);
  
  // Legacy Fallback (v1 -> v2 migration)
  if (!localRaw) {
    localRaw = localStorage.getItem('pokevicio_save_v3_ash');
    if (localRaw) {
      console.log('[LOAD] Legacy save found for migration:', localRaw.substring(0, 50) + '...');
    }
  }

  const localData = localRaw ? JSON.parse(localRaw) : null;
  
  // Set as initial fallback if cloud failed or was skipped
  if (localData && !finalSaveData) {
    finalSaveData = localData;
  }
  
  // Force starterChosen to true if they already have a team (legacy fix)
  if (localData && localData.team && localData.team.length > 0) {
    localData.starterChosen = true;
  }

  if (localData) console.log('[LOAD] Local save state:', { starterChosen: localData.starterChosen, teamSize: localData.team?.length });
  
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
          console.log('[LOAD] Local save is newer. Prioritizing Local.');
          finalSaveData = localData;
        }
      }
    } catch (e) {
      console.warn('[LOAD] Error parsing local save:', e);
    }
  }

  if (!finalSaveData) return { data: null, issues: [], lastSaveId: null, isNewerThanCloud: false };

  // 3. Sanitize and Normalize
  const { data: sanitized, issues } = validateAndSanitize(finalSaveData);
  
  // 4. Backfill and Deep Normalization (Legacy Parity)
  const normalized = normalizeData(sanitized);

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
function normalizeData(state) {
  if (!state) return state;

  // Ensure arrays exist
  if (!Array.isArray(state.team)) state.team = [];
  if (!Array.isArray(state.box)) state.box = [];
  if (!Array.isArray(state.pokedex)) state.pokedex = [];
  if (!Array.isArray(state.seenPokedex)) state.seenPokedex = [];

  // Data fix: ensure UID and Gender for all Pokemon
  const fixPoke = (p) => {
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
      delete p.ivs._cost;
      delete p.ivs._nature;
    }

    // Backfill capture date if missing
    if (!p.obtainedAt && !p.created_at && !p.captureDate && !p.timestamp && !p.date) {
      p.obtainedAt = Date.now();
    }

    return p;
  };

  state.team = state.team.map(fixPoke).filter(p => p !== null);
  state.box = state.box.map(fixPoke).filter(p => p !== null);

  // Normalize legacy badges (array to count)
  if (Array.isArray(state.badges)) {
    state.badges = state.badges.length;
  }

  return state;
}
