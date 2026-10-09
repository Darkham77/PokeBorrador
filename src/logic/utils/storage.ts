
/**
 * src/logic/utils/storage.ts
 * Safe localStorage wrapper to prevent SecurityErrors in restrictive environments.
 */
import { logger } from './logger.ts';

const memoryStore = new Map<string, string>()
const memorySessionStore = new Map<string, string>()

export const LOCAL_STORAGE_KEYS = {
  LOCAL_USER: 'pokevicio_local_user',
  SANDBOX_SAVE: 'pvs_sandbox_save',
  SELECTION_FILTERS: 'pv_selection_filters',
  COMBAT_ZOOM: 'pvs_combat_zoom',
  LOW_POWER_MODE: 'low-power-mode',
  HIDE_MAP_POKEMON: 'hide-map-pokemon',
  AUTO_BATTLE: 'auto-battle',
  APP_ZOOM: 'app-zoom',
  COLLAPSED_WIDGETS: 'pokevicio_home_collapsed_widgets',
  INVENTORY_LAST_TAB: 'inventory_last_tab',
  SESSION_MODE: 'pokevicio_session_mode',
  SELECTED_SERVER_ID: 'pokevicio_selected_server_id',
  DAYCARE_WAREHOUSE_EGGS_PREFIX: 'daycare_warehouse_eggs_',
  POKEMON_LOCAL_SAVE_PREFIX: 'pokemon_local_save_',
  SQLITE_KEY: 'pokevicio_sqlite_key',
  SAVE_V3_ASH: 'pokevicio_save_v3_ash',
  AUTH_TOKEN: 'pokevicio_auth_token',
  PVP_LAST_SEEN_DEFENSE_REPORT_PREFIX: 'pvp_last_seen_defense_report_'
} as const;

export const SESSION_STORAGE_KEYS = {
  PVP_SESSION_INITIALIZED: 'pvp_session_initialized',
  PVP_LOGIN_REMINDER_PENDING: 'pvp_login_reminder_pending',
  LOGOUT_REASON: 'pokevicio_logout_reason',
  BLOCK_AUTOLOGIN: 'block_autologin',
  LOAD_RETRY_COUNT: 'load_retry_count',
  DEV_SHADOW_SCROLL_TOP: 'dev_shadow_scroll_top',
  IMPORT_RELOAD: 'pokevicio_import_reload',
  IMPORT_ORIGINAL_PATH: 'pokevicio_import_original_path',
  PVP_DEFENSE_REPORTS_LAST_SEEN: 'pvp_defense_reports_last_seen',
  PVP_ACTIVE_MATCH: 'pvp_active_match'
} as const;

function getStorageBackend(): Storage | null { // result-ok: Operation result wrapper payload
  try {
    if (typeof localStorage !== 'undefined') return localStorage
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch (err) {
    logger.debug('Storage', 'localStorage no accesible:', err)
  }
  return null
}

function getSessionStorageBackend(): Storage | null { // result-ok: Operation result wrapper payload
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage
  } catch (err) {
    logger.debug('Storage', 'sessionStorage no accesible:', err)
  }
  return null
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      const storage = getStorageBackend()
      if (!storage) {
        return memoryStore.get(key) ?? null
      }
      return storage.getItem(key)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to get item "${key}": ${e instanceof Error ? e.message : String(e)}`)
      return memoryStore.get(key) ?? null
    }
  },

  setItem(key: string, value: string): void {
    try {
      memoryStore.set(key, value)
      const storage = getStorageBackend()
      if (!storage) return
      storage.setItem(key, value)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to set item "${key}": ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  removeItem(key: string): void {
    try {
      memoryStore.delete(key)
      const storage = getStorageBackend()
      if (!storage) return
      storage.removeItem(key)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to remove item "${key}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      const storage = getSessionStorageBackend()
      if (!storage) {
        return memorySessionStore.get(key) ?? null
      }
      return storage.getItem(key)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to get session item "${key}": ${e instanceof Error ? e.message : String(e)}`)
      return memorySessionStore.get(key) ?? null
    }
  },

  setItem(key: string, value: string): void {
    try {
      memorySessionStore.set(key, value)
      const storage = getSessionStorageBackend()
      if (!storage) return
      storage.setItem(key, value)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to set session item "${key}": ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  removeItem(key: string): void {
    try {
      memorySessionStore.delete(key)
      const storage = getSessionStorageBackend()
      if (!storage) return
      storage.removeItem(key)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to remove session item "${key}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

export default safeStorage
