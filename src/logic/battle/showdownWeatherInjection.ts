/**
 * src/logic/battle/showdownWeatherInjection.ts
 *
 * Weather resolver registry and Worker.prototype.postMessage monkey patch
 * for runtime weather state injection.
 */

import { logger } from '../utils/logger.ts';

let bridgeWeatherResolver: (() => string | undefined) | null = null;

export function setBridgeWeatherResolver(resolver: () => string | undefined): void {
  bridgeWeatherResolver = resolver;
}

// Monkey-patch Worker.prototype.postMessage to inject weather into EXECUTE_TURN (browser only)
if (typeof Worker !== 'undefined') {
  const originalPostMessage = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (
    this: Worker,
    message: unknown,
    transferOrOptions?: unknown
  ) {
    if (
      message &&
      typeof message === 'object' &&
      (message as Record<string, unknown>).type === 'EXECUTE_TURN' // open-record: Generic key-value data dictionary container
    ) {
      const payload = (message as Record<string, unknown>).payload as Record<string, unknown> | undefined; // open-record: Generic key-value data dictionary container
      if (payload) {
        try {
          const weather = bridgeWeatherResolver?.() || (typeof window !== 'undefined' && window.__CURRENT_BATTLE_WEATHER__);
          if (weather) {
            payload.weather = weather;
          }
        } catch (err) {
          logger.debug('showdownBridge', 'Error al adjuntar clima al payload:', err);
        }
      }
    }
    return (originalPostMessage as (this: Worker, message: unknown, transfer?: unknown) => void).call(
      this,
      message,
      transferOrOptions
    );
  };
}
