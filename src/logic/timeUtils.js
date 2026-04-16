/**
 * Time Synchronization Utility
 * Provides helpers for synchronized time and GMT-3 (Argentina) time.
 */

let _serverTimeOffset = 0;
let _timeSynced = false;

/**
 * Fetches the current time from the server and calculates the offset.
 */
export async function syncServerTime() {
  // En la versión Online, usamos la hora local.
  // Podríamos expandir esto para usar un RPC de Supabase.
  _serverTimeOffset = 0;
  _timeSynced = true;
  console.log('[TIME] Usando hora del dispositivo (Sincronización local).');
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
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

// Initial sync on module load
syncServerTime();

// Re-sync every 5 minutes
setInterval(syncServerTime, 300000);
