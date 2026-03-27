/**
 * Time Synchronization Utility
 * Syncs the local system clock with the server time to prevent exploits.
 * Also provides helpers for GMT-3 (Argentina) time.
 */

var _serverTimeOffset = _serverTimeOffset || 0;
let _timeSynced = false;

/**
 * Fetches the current time from the server and calculates the offset.
 */
async function syncServerTime() {
    try {
        const start = Date.now();
        const response = await fetch('/api/time');
        const data = await response.json();
        const serverTime = data.now;
        const end = Date.now();
        
        // Calculate latency (estimated as half the round-trip time)
        const latency = (end - start) / 2;
        
        // Offset is what we add to Date.now() to get server time
        // serverTime = (end - latency) + offset
        _serverTimeOffset = serverTime - (end - latency);
        _timeSynced = true;
        
        console.log(`[TIME] Sincronizado con el servidor. Offset: ${_serverTimeOffset}ms`);
    } catch (e) {
        console.warn('[TIME] Error sincronizando con el servidor, usando hora local.', e);
        // Fallback to local time (offset 0)
        _serverTimeOffset = 0;
    }
}

/**
 * Returns the synchronized current timestamp (ms).
 */
function getServerTime() {
    return Date.now() + _serverTimeOffset;
}

/**
 * Returns a Date object adjusted to GMT-3.
 * This is useful for daily missions and day/night cycles.
 */
function getGMT3Date() {
    const now = getServerTime();
    const d = new Date(now);
    
    // Get UTC milliseconds
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    
    // Argentina is GMT-3
    const gmt3 = new Date(utc + (3600000 * -3));
    return gmt3;
}

// Initial sync
syncServerTime();

// Re-sync every 5 minutes to account for drift
setInterval(syncServerTime, 300000);
