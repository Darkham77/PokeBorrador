import { Temporal } from '@js-temporal/polyfill';
import { supabase } from './supabase';
import { safeStorage } from './utils/storage';
import { logger } from './utils/logger';

/**
 * Time Synchronization Utility (Temporal API version)
 * Syncs the local system clock with the server time.
 * Optimized for Node 26+ and Stage 3 Temporal proposal.
 */

let _serverTimeOffsetNanoseconds = BigInt(0);
let _timeSynced = false;

export async function syncServerTime(): Promise<void> {
  if (typeof window !== 'undefined' && safeStorage.getItem('pokevicio_session_mode') === 'offline') {
    _timeSynced = true;
    return;
  }

  try {
    const { data: serverTime, error } = await supabase.rpc('fn_get_server_time');
    if (error) throw error;

    const serverInstant = Temporal.Instant.from(serverTime as string);
    const localInstant = Temporal.Now.instant();
    
    _serverTimeOffsetNanoseconds = serverInstant.epochNanoseconds - localInstant.epochNanoseconds;
    _timeSynced = true;
    
    logger.info('TIME', `Server Sync Completed. Offset: ${_serverTimeOffsetNanoseconds / BigInt(1000000)}ms`);
  } catch (_err) {
    if (typeof window !== 'undefined' && safeStorage.getItem('pokevicio_session_mode') !== 'offline') {
      logger.warn('TIME', 'Failed to sync with server, using local time.');
    }
    _timeSynced = true;
  }
}

export function getServerInstant(): Temporal.Instant {
  if (!_timeSynced) return Temporal.Now.instant();

  const routerOffsetMs = (supabase && typeof supabase.getTimeOffset === 'function') 
    ? supabase.getTimeOffset() 
    : 0;
    
  const now = Temporal.Now.instant();
  const offsetDuration = Temporal.Duration.from({ 
    nanoseconds: Number(_serverTimeOffsetNanoseconds) + (routerOffsetMs * 1_000_000) 
  });
  
  return now.add(offsetDuration);
}

export function getServerTime(): number {
  return Number(getServerInstant().epochMilliseconds);
}

/**
 * Returns a ZonedDateTime adjusted to GMT-3.
 */
export function getGMT3Date(): Temporal.ZonedDateTime {
  return getServerInstant().toZonedDateTimeISO('America/Argentina/Buenos_Aires');
}

export type DayPhase = 'morning' | 'day' | 'dusk' | 'night';

export function getDayCycle(now: Temporal.Instant | number = getServerInstant()): DayPhase {
  // Compatibility: Handle numeric timestamps (ms)
  const instant = typeof now === 'number' 
    ? Temporal.Instant.fromEpochMilliseconds(now) 
    : now;

  const zdt = instant.toZonedDateTimeISO('UTC');
  const totalHours = Math.floor(Number(zdt.epochNanoseconds / BigInt(1e9)) / 3600);
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

export function getSeason(now: Temporal.Instant | number = getServerInstant()): Season {
  // Compatibility: Handle numeric timestamps (ms)
  const instant = typeof now === 'number' 
    ? Temporal.Instant.fromEpochMilliseconds(now) 
    : now;

  const totalWeeks = Math.floor(Number(instant.epochNanoseconds / BigInt(1e9)) / (7 * 24 * 3600));
  const seasonIndex = totalWeeks % 4;
  
  const seasons: Season[] = [
    { id: 'spring', label: 'Primavera', icon: '🌸' },
    { id: 'summer', label: 'Verano', icon: '☀️' },
    { id: 'autumn', label: 'Otoño', icon: '🍂' },
    { id: 'winter', label: 'Invierno', icon: '❄️' }
  ];
  
  return seasons[seasonIndex] || (seasons[0] as Season);
}

// Interval logic should be managed by the store/app after init
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
