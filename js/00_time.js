/**
 * Time Synchronization Utility
 * Syncs the local system clock with the server time to prevent exploits.
 * Also provides helpers for GMT-3 (Argentina) time.
 */

(function(global) {
    // Usamos una propiedad en el objeto global para evitar conflictos de declaración 'let/const'
    global._serverTimeOffset = global._serverTimeOffset || 0;
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
            global._serverTimeOffset = serverTime - (end - latency);
            _timeSynced = true;
            
            console.log(`[TIME] Sincronizado con el servidor. Offset: ${global._serverTimeOffset}ms`);
        } catch (e) {
            console.warn('[TIME] Error sincronizando con el servidor, usando hora local.', e);
            global._serverTimeOffset = 0;
        }
    }

    /**
     * Returns the synchronized current timestamp (ms).
     */
    global.getServerTime = function() {
        return Date.now() + (global._serverTimeOffset || 0);
    };

    /**
     * Returns a Date object adjusted to GMT-3.
     */
    global.getGMT3Date = function() {
        const now = global.getServerTime();
        const d = new Date(now);
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * -3));
    };

    // Initial sync
    syncServerTime();

    // Re-sync every 5 minutes
    setInterval(syncServerTime, 300000);

})(typeof window !== 'undefined' ? window : globalThis);
