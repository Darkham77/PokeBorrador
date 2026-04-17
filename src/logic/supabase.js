/** 
 * SUPABASE CLIENT - REMOTE PERSISTENCE LAYER
 * IMPORTANT: If you modify the remote schema or RPC calls here, 
 * you MUST update the DBRouter (src/logic/dbRouter.js) to keep Online/Offline parity.
 */
import { createClient } from '@supabase/supabase-js'
import { DBRouter } from './dbRouter'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Expose to global scope for legacy scripts if not already set by index.html
if (typeof window !== 'undefined') {
  window.VITE_SUPABASE_URL = window.VITE_SUPABASE_URL || supabaseUrl
  window.VITE_SUPABASE_KEY = window.VITE_SUPABASE_KEY || supabaseKey
}

let rawClient = null

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [Supabase] Missing environment variables. Connection will be unavailable.')
  console.warn('Please check your .env file.')
} else {
  try {
    rawClient = createClient(supabaseUrl, supabaseKey)
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err)
  }
}

// Export the Unified DB Router as 'supabase' for backward compatibility
export const supabase = new DBRouter(rawClient)

// Ensure legacy scripts always use the resilient proxy / router
if (typeof window !== 'undefined') {
  window.sb = supabase
  window.DBRouterInstance = supabase // Use this to differentiate from the class
}

export default supabase
