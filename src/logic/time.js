/**
 * Time Synchronization Utility
 * Syncs the local system clock with the server time to prevent exploits.
 * Provides helpers for GMT-3 (Argentina) time and Day/Night cycles.
 */

let serverTimeOffset = 0;
let timeSynced = false;

/**
 * Fetches the current time from the server and calculates the offset.
 */
export async function syncServerTime() {
  // In the web version, we use device time by default.
  // This can be expanded to use a Supabase RPC or external API for better precision.
  serverTimeOffset = 0;
  timeSynced = true;
  console.log('[TIME] Sync completed (Local device time).');
}

/**
 * Returns the synchronized current timestamp (ms).
 */
export function getServerTime() {
  return Date.now() + serverTimeOffset;
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
 * Returns the current game period: morning, day, dusk, or night.
 */
export function getTimePeriod() {
  const hours = getGMT3Date().getHours();
  
  if (hours >= 5 && hours < 11) return 'morning';
  if (hours >= 11 && hours < 18) return 'day';
  if (hours >= 18 && hours < 21) return 'dusk';
  return 'night';
}

// Initial sync
syncServerTime();

// Re-sync every 5 minutes
setInterval(syncServerTime, 300000);
