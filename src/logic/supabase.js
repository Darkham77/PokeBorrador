import { createClient } from '@supabase/supabase-js'
import { createResilientClient } from './supabaseProxy'

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

export const supabase = createResilientClient(rawClient)

// Ensure legacy scripts always use the resilient proxy
if (typeof window !== 'undefined') {
  window.sb = supabase
}
