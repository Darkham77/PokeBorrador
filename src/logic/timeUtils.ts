import { gsap } from 'gsap';
import { supabase } from './supabase.ts';
import { safeStorage } from './utils/storage.ts';
import { logger } from './utils/logger.ts';

export const GAME_TIMEZONE = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TIMEZONE) ||
  (typeof process !== 'undefined' && process.env?.VITE_TIMEZONE) ||
  'America/Argentina/Buenos_Aires';

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
    const result = await Promise.race([
      supabase.rpc('fn_get_server_time'),
      new Promise((_, reject) => gsap.delayedCall(3, () => reject(new Error('FETCH_TIMEOUT'))))
    ]);
    
    const { data: serverTime, error } = result as { data: string | null; error: { message: string } | null };
    
    if (error) throw new Error(error.message);
    if (!serverTime) throw new Error('NO_SERVER_TIME_RETURNED');

    const serverInstant = Temporal.Instant.from(serverTime);
    const localInstant = Temporal.Now.instant();
    
    _serverTimeOffsetNanoseconds = BigInt(serverInstant.epochNanoseconds) - BigInt(localInstant.epochNanoseconds);
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

  const routerOffsetMs = (supabase && typeof (supabase as unknown as { getTimeOffset: () => number }).getTimeOffset === 'function') 
    ? (supabase as unknown as { getTimeOffset: () => number }).getTimeOffset() 
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
 * Returns a ZonedDateTime adjusted to the configured game timezone.
 */
export function getGMT3Date(): Temporal.ZonedDateTime {
  return getServerInstant().toZonedDateTimeISO(GAME_TIMEZONE);
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
    { id: 'summer', label: 'Verano', icon: '🌻' },
    { id: 'autumn', label: 'Otoño', icon: '🍂' },
    { id: 'winter', label: 'Invierno', icon: '⛄' }
  ];
  
  return seasons[seasonIndex] || (seasons[0] as Season);
}

// Asynchronous pause tied to the GSAP clock for deterministic logic
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => gsap.delayedCall(ms / 1000, resolve));
}

/**
 * Formats a date string or number for UI display in GMT-3.
 * Handles robust parsing of SQLite/Supabase/Legacy formats.
 */
export function formatDisplayDate(ts: string | number | null | undefined): string {
  if (!ts) return '---';
  try {
    let cleanTs = typeof ts === 'string' ? ts.trim().replace(' ', 'T') : ts;

    // Fix for SQLite datetime('now') missing 'Z' and 'T'
    if (typeof cleanTs === 'string') {
      // If it looks like YYYY-MM-DDTHH:MM:SS but lacks timezone, assume UTC (standard for our DB)
      if (cleanTs.length === 19 && !cleanTs.includes('Z') && !cleanTs.includes('+')) {
        cleanTs += 'Z';
      }
    }

    const instant = typeof cleanTs === 'string'
      ? Temporal.Instant.from(cleanTs)
      : Temporal.Instant.fromEpochMilliseconds(Number(cleanTs));

    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE);

    const day = String(zdt.day).padStart(2, '0');
    const month = String(zdt.month).padStart(2, '0');
    const hour = String(zdt.hour).padStart(2, '0');
    const min = String(zdt.minute).padStart(2, '0');

    return `${day}/${month} ${hour}:${min}`;
  } catch (e) {
    logger.warn('TIME', `Failed to format date: ${ts}`, (e as Error).message);
    return '---';
  }
}
/**
 * Formats any timestamp (ISO string or epoch ms) as HH:mm in 24h format,
 * adjusted to GAME_TIMEZONE. Use this in ALL UI components instead of
 * local toLocaleString() calls that may produce AM/PM depending on locale.
 */
export function formatTime(ts: string | number | Date | null | undefined): string {
  if (!ts) return '';
  try {
    let instant: Temporal.Instant;
    if (ts instanceof Date) {
      instant = Temporal.Instant.fromEpochMilliseconds(ts.getTime());
    } else if (typeof ts === 'number') {
      instant = Temporal.Instant.fromEpochMilliseconds(ts);
    } else {
      const normalized = ts.includes('Z') || ts.includes('+') || ts.includes('-', 10)
        ? ts
        : ts.replace(' ', 'T') + 'Z';
      instant = Temporal.Instant.from(normalized);
    }
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE);
    return `${String(zdt.hour).padStart(2, '0')}:${String(zdt.minute).padStart(2, '0')}`;
  } catch (_e) {
    return '';
  }
}

/**
 * Safely parses any date/time string or number into a Temporal.ZonedDateTime in the configured GAME_TIMEZONE.
 * Falls back to a default PlainDateTime or offset string if parsing fails.
 * Handles ISO strings, date-only formats (YYYY-MM-DD), date-time without offset, and milliseconds timestamps.
 */
export function parseZonedTime(
  ts: string | number | null | undefined,
  fallback = '2026-04-01T00:00:00'
): Temporal.ZonedDateTime {
  if (!ts) {
    return Temporal.PlainDateTime.from(fallback).toZonedDateTime(GAME_TIMEZONE);
  }

  try {
    if (typeof ts === 'number') {
      return Temporal.Instant.fromEpochMilliseconds(ts).toZonedDateTimeISO(GAME_TIMEZONE);
    }

    const clean = ts.trim();
    if (clean === '') {
      return Temporal.PlainDateTime.from(fallback).toZonedDateTime(GAME_TIMEZONE);
    }

    if (clean.endsWith('Z')) {
      return Temporal.Instant.from(clean).toZonedDateTimeISO(GAME_TIMEZONE);
    }

    return Temporal.PlainDateTime.from(clean).toZonedDateTime(GAME_TIMEZONE);
  } catch (_err) {
    try {
      if (typeof ts === 'string') {
        return Temporal.Instant.from(ts.trim()).toZonedDateTimeISO(GAME_TIMEZONE);
      }
    } catch (_instantErr) {
      // Ignore and proceed to fallback
    }

    try {
      return Temporal.PlainDateTime.from(fallback).toZonedDateTime(GAME_TIMEZONE);
    } catch (_fallbackErr) {
      return Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(GAME_TIMEZONE);
    }
  }
}

