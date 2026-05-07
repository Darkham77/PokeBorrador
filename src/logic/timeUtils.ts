
import { supabase } from './supabase';
import { safeStorage } from './utils/storage';

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
export async function syncServerTime(): Promise<void> {
  // Prevent sync in offline mode or if connection is lost
  if (typeof window !== 'undefined' && safeStorage.getItem('pokevicio_session_mode') === 'offline') {
    _serverTimeOffset = 0;
    _timeSynced = true;
    return;
  }

  try {
    const { data: serverTime, error } = await supabase.rpc('fn_get_server_time');
    
    if (error) throw error;

    const serverMs = new Date(serverTime as string).getTime();
    const localMs = Date.now();
    
    _serverTimeOffset = serverMs - localMs;
    _timeSynced = true;
    
    console.log(`[TIME] Server Sync Completed. Offset: ${_serverTimeOffset}ms`);
  } catch (_err) {
    // Only log error if not in local/offline mode to avoid console noise
    if (typeof window !== 'undefined' && safeStorage.getItem('pokevicio_session_mode') !== 'offline') {
      console.warn('[TIME] Failed to sync with server, using local time as fallback.');
    }
    _serverTimeOffset = 0;
    _timeSynced = true;
  }
}

/**
 * Returns the synchronized current timestamp (ms).
 * Includes the debug offset if the router (supabase) is in mock mode.
 */
export function getServerTime(): number {
  const routerOffset = (supabase && typeof supabase.getTimeOffset === 'function') 
    ? supabase.getTimeOffset() 
    : 0;
    
  return Date.now() + _serverTimeOffset + routerOffset;
}

/**
 * Returns a Date object adjusted to GMT-3.
 */
export function getGMT3Date(): Date {
  const now = getServerTime();
  const d = new Date(now);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -3));
}

export type DayPhase = 'morning' | 'day' | 'dusk' | 'night';

/**
 * Returns the current day cycle based on continuous Epoch time.
 * 1 Real Day = 3 Game Days. 1 Game Day = 8 Real Hours.
 * Phases: Morning (2hs), Day (2hs), Dusk (2hs), Night (2hs).
 */
export function getDayCycle(now: number = getServerTime()): DayPhase {
  const totalHours = Math.floor(now / (1000 * 60 * 60));
  const phase = totalHours % 8;
  
  if (phase < 2) return 'morning';
  if (phase < 4) return 'day';
  if (phase < 6) return 'dusk';
  return 'night';
}

export interface Season {
  id: string;
  label: string;
  icon: string;
}

/**
 * Returns the current season based on continuous Epoch time.
 * Changes every 7 real days (1 week).
 */
export function getSeason(now: number = getServerTime()): Season {
  // 1000ms * 60s * 60m * 24h * 7d = 604800000ms per week
  const totalWeeks = Math.floor(now / 604800000);
  const seasonIndex = totalWeeks % 4;
  
  const seasons: Season[] = [
    { id: 'spring', label: 'Primavera', icon: '🌸' },
    { id: 'summer', label: 'Verano', icon: '☀️' },
    { id: 'autumn', label: 'Otoño', icon: '🍂' },
    { id: 'winter', label: 'Invierno', icon: '❄️' }
  ];
  
  return seasons[seasonIndex] || (seasons[0] as Season);
}

// Initial sync on module load REMOVED to avoid errors before login
// syncServerTime();

// Re-sync every 5 minutes to stay accurate (only if synced once)
if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    if (_timeSynced && safeStorage.getItem('pokevicio_session_mode') === 'online') {
      syncServerTime();
    }
  }, 300000);
}
