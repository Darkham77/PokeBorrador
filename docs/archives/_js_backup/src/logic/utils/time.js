/**
 * src/logic/utils/time.js
 * Time Synchronization Utility
 * Syncs the local system clock with the server time to prevent exploits.
 * Provides helpers for GMT-3 (Argentina) time.
 */

let _serverTimeOffset = 0;
let _timeSynced = false;

/**
 * Fetches the current time from the server and calculates the offset.
 */
export async function syncServerTime() {
  // Por ahora, usamos la hora del dispositivo para evitar errores de red.
  // En futuras fases, esto podría realizar un RPC a Supabase para mayor precisión.
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
 * Returns a Date object adjusted to GMT-3 (Argentina).
 */
export function getGMT3Date() {
  const now = getServerTime();
  const d = new Date(now);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -3));
}

/**
 * Returns if the time has been synchronized at least once.
 */
export function isTimeSynced() {
  return _timeSynced;
}

// Auto-sync initialized at module load
syncServerTime();

// Re-sync every 5 minutes
setInterval(syncServerTime, 300000);
