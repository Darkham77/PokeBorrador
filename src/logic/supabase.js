import { createClient } from '@supabase/supabase-js'
import { createResilientClient } from './supabaseProxy'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check your .env file.')
}

const rawClient = createClient(supabaseUrl, supabaseKey)
export const supabase = createResilientClient(rawClient)

// Ensure legacy scripts always use the resilient proxy
if (typeof window !== 'undefined') {
  window.sb = supabase
}
