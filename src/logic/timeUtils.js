import { supabase } from './supabase';

/**
 * Time Synchronization Utility (Pure Vue version)
 * Syncs the local system clock with the server time using Supabase RPC.
 * Provides helpers for GMT-3 (Argentina) time and Day/Night cycles.
 */

let _serverTimeOffset = 0;
let _timeSynced = false;

/**
 * Fetches the current time from the server and calculates the offset.
 */
export async function syncServerTime() {
  // Prevent sync in offline mode or if connection is lost
  if (typeof window !== 'undefined' && localStorage.getItem('pokevicio_session_mode') === 'offline') {
    _serverTimeOffset = 0;
    _timeSynced = true;
    return;
  }

  try {
    const { data: serverTime, error } = await supabase.rpc('fn_get_server_time');
    
    if (error) throw error;

    const serverMs = new Date(serverTime).getTime();
    const localMs = Date.now();
    
    _serverTimeOffset = serverMs - localMs;
    _timeSynced = true;
    
    console.log(`[TIME] Server Sync Completed. Offset: ${_serverTimeOffset}ms`);
  } catch (err) {
    // Only log error if not in local/offline mode to avoid console noise
    if (typeof window !== 'undefined' && localStorage.getItem('pokevicio_session_mode') !== 'offline') {
      console.warn('[TIME] Failed to sync with server, using local time as fallback.');
    }
    _serverTimeOffset = 0;
    _timeSynced = true;
  }
}

/**
 * Returns the synchronized current timestamp (ms).
 */
export function getServerTime() {
  return Date.now() + _serverTimeOffset;
}

/**
 * Returns a Date object adjusted to GMT-3.
 */
export function getGMT3Date() {
  const now = getServerTime();
  const d = new Date(now);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -3));
}

/**
 * Returns the current day cycle based on GMT-3 time.
 */
export function getDayCycle() {
  const hour = getGMT3Date().getHours();
  // Standard Gen 3-like cycles
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

// Initial sync on module load REMOVED to avoid errors before login
// syncServerTime();

// Re-sync every 5 minutes to stay accurate (only if synced once)
setInterval(() => {
  if (_timeSynced && typeof window !== 'undefined' && localStorage.getItem('pokevicio_session_mode') === 'online') {
    syncServerTime();
  }
}, 300000);
