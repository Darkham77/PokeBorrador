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
  if (!user) return null;

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
  const localRaw = localStorage.getItem(localSaveKey);
  
  if (localRaw) {
    try {
      const localData = JSON.parse(localRaw);
      const cloudTime = cloudSaveRow?.updated_at ? new Date(cloudSaveRow.updated_at).getTime() : 0;
      const localTime = localData._last_updated || 0;

      // Legacy Rule: If local is at least 3s newer, prioritize it.
      if (localTime > cloudTime + 3000) {
        console.log('[LOAD] Local save is newer. Prioritizing Local.');
        finalSaveData = localData;
      }
    } catch (e) {
      console.warn('[LOAD] Error parsing local save:', e);
    }
  }

  if (!finalSaveData) return null;

  // 3. Sanitize and Normalize
  const { data: sanitized, issues } = validateAndSanitize(finalSaveData);
  
  // 4. Backfill and Deep Normalization (Legacy Parity)
  const normalized = normalizeData(sanitized);

  return {
    data: normalized,
    issues,
    lastSaveId: cloudSaveRow?.last_save_id || null,
    isNewerThanCloud: finalSaveData === (localRaw ? JSON.parse(localRaw) : null) && cloudSaveRow
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
