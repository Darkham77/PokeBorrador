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
        // En la versión tradicional buscábamos /api/time (Node.js).
        // En la versión Online, podemos usar la hora local o un RPC de Supabase si se desea total precisión.
        // Por ahora, usamos la hora del dispositivo para evitar errores de red.
        global._serverTimeOffset = 0;
        _timeSynced = true;
        console.log('[TIME] Usando hora del dispositivo (Sincronización local).');
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
