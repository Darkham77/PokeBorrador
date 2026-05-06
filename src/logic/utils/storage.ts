
/**
 * src/logic/utils/storage.ts
 * Safe localStorage wrapper to prevent SecurityErrors in restrictive environments.
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof localStorage === 'undefined') return null
      const val = localStorage.getItem(key)
      
      // Shadow Backup Rescue: If primary is missing, try backup
      if (val === null) {
        const backup = localStorage.getItem(key + '_backup')
        if (backup !== null) {
          console.warn(`[Storage] Primary key "${key}" missing. Restoring from Shadow Backup.`)
          localStorage.setItem(key, backup) // Auto-heal
          return backup
        }
      }
      return val
    } catch (e: any) {
      console.warn(`[Storage] Failed to get item "${key}":`, e.message)
      return null
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(key, value)
      // Create shadow backup for everything
      localStorage.setItem(key + '_backup', value)
    } catch (e: any) {
      console.warn(`[Storage] Failed to set item "${key}":`, e.message)
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(key)
    } catch (e: any) {
      console.warn(`[Storage] Failed to remove item "${key}":`, e.message)
    }
  }
}

export default safeStorage
