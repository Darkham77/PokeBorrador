/** 
 * SUPABASE CONFIG - REMOTE PERSISTENCE LAYER
 * Now managed by DBRouter for autonomous lazy initialization.
 */
import { DBRouter } from './dbRouter.ts'
import { safeStorage } from '../utils/storage.ts'
import type { SessionMode } from '../../types/system/database.ts'
import type { OfficialServer } from '../../data/system/official_servers.ts'
import { OFFICIAL_SERVERS_BY_ID, DEFAULT_SERVER } from '../../data/system/official_servers.ts'

import { isLocalEnvironment } from '../utils/env.ts'

const TEST_POSTGRES_SERVER: OfficialServer = {
  id: 'test_postgres',
  name: 'Test Postgres (Local)',
  region: 'Local',
  url: 'http://127.0.0.1:54321',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjI1MDAwMDAwMDB9.bWuWcdy1ICtTs7Zq7TNjum7G0VIS5je9rFlzshoeBLA'
}

// Identify if the instance is running in a local or dev LAN context
const isLocal = isLocalEnvironment()

// Get stored server or use default
const storedServerId = safeStorage.getItem('pokevicio_selected_server_id')
const selectedServer = (storedServerId === 'test_postgres' ? TEST_POSTGRES_SERVER : (storedServerId ? OFFICIAL_SERVERS_BY_ID[storedServerId] : undefined)) || DEFAULT_SERVER

// Determine initial mode explicitly from session context
const storedMode = safeStorage.getItem('pokevicio_session_mode') as SessionMode
const initialMode: SessionMode = storedMode || (isLocal ? 'offline' : 'online')

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
  const server = serverId === 'test_postgres' ? TEST_POSTGRES_SERVER : OFFICIAL_SERVERS_BY_ID[serverId]
  if (!server) return
  
  supabase.updateConfig({ url: server.url, key: server.anonKey })
  safeStorage.setItem('pokevicio_selected_server_id', server.id)
}

export default supabase
