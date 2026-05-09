
/** 
 * SUPABASE CONFIG - REMOTE PERSISTENCE LAYER
 * Now managed by DBRouter for autonomous lazy initialization.
 */
import { DBRouter } from './db/dbRouter.ts'
import { safeStorage } from './utils/storage.ts'
import type { DBMode } from '@/types/database'

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env[key];
  if (typeof process !== 'undefined' && process.env) return process.env[key];
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_KEY')

// Expose to global scope for legacy scripts if needed
if (typeof window !== 'undefined') {
  const win = window as unknown as { VITE_SUPABASE_URL?: string; VITE_SUPABASE_KEY?: string };
  win.VITE_SUPABASE_URL = win.VITE_SUPABASE_URL || supabaseUrl;
  win.VITE_SUPABASE_KEY = win.VITE_SUPABASE_KEY || supabaseKey;
}

// Determine initial mode explicitly from session context
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const storedMode = safeStorage.getItem('pokevicio_session_mode') as DBMode
const initialMode: DBMode = storedMode || (isLocalhost ? 'offline' : 'online')

// Export the Autonomous DB Router
// It will handle createClient lazily only when mode is 'online'
export const supabase = new DBRouter({ url: supabaseUrl, key: supabaseKey }, initialMode)

export default supabase
