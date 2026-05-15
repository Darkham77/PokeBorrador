/** 
 * SUPABASE CONFIG - REMOTE PERSISTENCE LAYER
 * Now managed by DBRouter for autonomous lazy initialization.
 */
import { DBRouter } from './db/dbRouter.ts'
import { safeStorage } from './utils/storage.ts'
import type { DBMode } from '@/types/database'
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '../data/official_servers.ts'

// Identify if the instance is running in a local context
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Get stored server or use default
const storedServerId = safeStorage.getItem('pokevicio_selected_server_id')
const selectedServer = OFFICIAL_SERVERS.find(s => s.id === storedServerId) || DEFAULT_SERVER

// Determine initial mode explicitly from session context
const storedMode = safeStorage.getItem('pokevicio_session_mode') as DBMode
const initialMode: DBMode = storedMode || (isLocalhost ? 'offline' : 'online')

// Export the Autonomous DB Router
// It will handle createClient lazily only when mode is 'online'
export const supabase = new DBRouter(
  { url: selectedServer.url, key: selectedServer.anonKey }, 
  initialMode
)

/**
 * Utility to switch the active server and persist the choice.
 */
export const switchServer = (serverId: string) => {
  const server = OFFICIAL_SERVERS.find(s => s.id === serverId)
  if (!server) return
  
  supabase.updateConfig({ url: server.url, key: server.anonKey })
  safeStorage.setItem('pokevicio_selected_server_id', server.id)
}

export default supabase
