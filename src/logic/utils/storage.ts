
/**
 * src/logic/utils/storage.ts
 * Safe localStorage wrapper to prevent SecurityErrors in restrictive environments.
 */
import { logger } from './logger.ts';

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof localStorage === 'undefined') return null
      const val = localStorage.getItem(key)
      
      // Shadow Backup Rescue: If primary is missing, try backup
      if (val === null) {
        const backup = localStorage.getItem(key + '_backup')
        if (backup !== null) {
          logger.warn('Storage', `Primary key "${key}" missing. Restoring from Shadow Backup.`)
          localStorage.setItem(key, backup) // Auto-heal
          return backup
        }
      }
      return val
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to get item "${key}": ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(key, value)
      // Create shadow backup for everything
      localStorage.setItem(key + '_backup', value)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to set item "${key}": ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(key)
    } catch (e: unknown) {
      logger.warn('Storage', `Failed to remove item "${key}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

export default safeStorage
