/** 
 * SUPABASE CONFIG - REMOTE PERSISTENCE LAYER
 * Now managed by DBRouter for autonomous lazy initialization.
 */
import { DBRouter } from './db/dbRouter'
import { safeStorage } from './utils/storage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Expose to global scope for legacy scripts if needed
if (typeof window !== 'undefined') {
  window.VITE_SUPABASE_URL = window.VITE_SUPABASE_URL || supabaseUrl
  window.VITE_SUPABASE_KEY = window.VITE_SUPABASE_KEY || supabaseKey
}

<<<<<<< HEAD
let rawClient = null

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [Supabase] Missing environment variables. Connection will be unavailable.')
  console.warn('Please check your .env file.')
} else {
  try {
    rawClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'ngrok-skip-browser-warning': '1' // Bypasses the Ngrok free tier interstitial warning page for API calls
        }
      }
    })
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err)
  }
}

=======
>>>>>>> 733f8d7 (feat(pwa): standardize responsive layout and finalize pure vue transition)
// Determine initial mode explicitly from session context
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const storedMode = safeStorage.getItem('pokevicio_session_mode')
const initialMode = storedMode || (isLocalhost ? 'offline' : 'online')

// Export the Autonomous DB Router
// It will handle createClient lazily only when mode is 'online'
export const supabase = new DBRouter({ url: supabaseUrl, key: supabaseKey }, initialMode)

export default supabase
