
/**
 * src/logic/utils/storage.ts
 * Safe localStorage wrapper to prevent SecurityErrors in restrictive environments.
 */
import { logger } from './logger.ts';

const memoryStore = new Map<string, string>()

function getStorageBackend(): Storage | null { // result-ok: Operation result wrapper payload
  try {
    if (typeof localStorage !== 'undefined') return localStorage
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    // ignore
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

export default safeStorage
