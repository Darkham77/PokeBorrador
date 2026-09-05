import { describe, it, expect } from 'vitest';
import { isTransientNetworkError, isTransientNetworkFailure } from '../../../scripts/e2e/e2e_helpers.ts';

describe('Transient Infrastructure Network Error Detection', () => {
  describe('Positive cases (Must be classified as transient network error)', () => {
    it('detects net::ERR_NETWORK_CHANGED', () => {
      const err = 'Failed to load resource: net::ERR_NETWORK_CHANGED';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects net::ERR_CONNECTION_RESET', () => {
      const err = 'Failed to load resource: net::ERR_CONNECTION_RESET';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects net::ERR_CONNECTION_REFUSED', () => {
      const err = 'Failed to load resource: net::ERR_CONNECTION_REFUSED';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects net::ERR_INTERNET_DISCONNECTED', () => {
      const err = 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects dynamic module import failure caused by network abort', () => {
      const err = 'TypeError: Failed to fetch dynamically imported module: http://localhost:5174/src/views/game/MainGameView.vue';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects Vue error wrapping dynamic import module fetch failure', () => {
      const err = '[Vue error]: TypeError: Failed to fetch dynamically imported module: http://localhost:5174/src/views/game/MainGameView.vue';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects critical console error wrapping dynamic import module fetch failure', () => {
      const err = '[CRITICAL-CONSOLE-ERROR] [Vue error]: TypeError: Failed to fetch dynamically imported module: http://localhost:5174/src/views/game/MainGameView.vue';
      expect(isTransientNetworkError(err)).toBe(true);
    });

    it('detects Node fetch connection refusal to local dev server', () => {
      const err = 'FetchError: request to http://localhost:5174 failed, reason: connect ECONNREFUSED 127.0.0.1:5174';
      expect(isTransientNetworkError(err)).toBe(true);
    });
  });

  describe('Negative cases (Real application/game errors - MUST return false)', () => {
    it('rejects Vue component render errors', () => {
      const err = '[Vue error]: Unhandled error during execution of render function';
      expect(isTransientNetworkError(err)).toBe(false);
    });

    it('rejects Vue undefined property access errors', () => {
      const err = '[Vue error]: TypeError: Cannot read properties of undefined (reading \'state\')';
      expect(isTransientNetworkError(err)).toBe(false);
    });

    it('rejects Vue warnings', () => {
      const err = '[Vue warn]: Component is missing template or render function';
      expect(isTransientNetworkError(err)).toBe(false);
    });

    it('rejects FSM state desynchronization errors', () => {
      const err = 'Error: [FSM-SYNC-FAIL] State desync detected: expected READY_FOR_INPUT, got FIRST_INTRO';
      expect(isTransientNetworkError(err)).toBe(false);
    });

    it('rejects Playwright assertion failures', () => {
      const err = 'AssertionError: expected 100 to be 0';
      expect(isTransientNetworkError(err)).toBe(false);
    });

    it('rejects generic uncaught javascript errors', () => {
      const err = '[CRITICAL-CONSOLE-ERROR] ReferenceError: activePokemon is not defined';
      expect(isTransientNetworkError(err)).toBe(false);
    });

    it('rejects empty or null error messages', () => {
      expect(isTransientNetworkError('')).toBe(false);
      expect(isTransientNetworkError(null as unknown as string)).toBe(false);
      expect(isTransientNetworkError(undefined as unknown as string)).toBe(false);
    });
  });

  describe('isTransientNetworkFailure (Combined Error and Browser LogBuffer Detection)', () => {
    it('returns true when error itself is transient network error', () => {
      expect(isTransientNetworkFailure('net::ERR_NETWORK_CHANGED')).toBe(true);
    });

    it('returns true when error is generic timeout but logBuffer contains net::ERR_NETWORK_CHANGED', () => {
      const errorMsg = 'Error: page.waitForFunction: Timeout 5000ms exceeded.';
      const logBuffer = [
        '[BROWSER-LOG] [vite] connecting...',
        '[BROWSER-LOG] [vite] connected.',
        '[BROWSER-ERROR] Failed to load resource: net::ERR_NETWORK_CHANGED',
        '[BROWSER-ERROR] Failed to load resource: net::ERR_NETWORK_CHANGED'
      ];
      expect(isTransientNetworkFailure(errorMsg, logBuffer)).toBe(true);
    });

    it('returns true when error is generic timeout but logBuffer contains dynamic module import failure', () => {
      const errorMsg = 'Error: page.waitForFunction: Timeout 5000ms exceeded.';
      const logBuffer = [
        '[BROWSER-LOG] [vite] connecting...',
        '[BROWSER-ERROR] TypeError: Failed to fetch dynamically imported module: http://localhost:5174/src/views/game/MainGameView.vue'
      ];
      expect(isTransientNetworkFailure(errorMsg, logBuffer)).toBe(true);
    });

    it('returns false when error is timeout and logBuffer contains only normal logs', () => {
      const errorMsg = 'Error: page.waitForFunction: Timeout 5000ms exceeded.';
      const logBuffer = [
        '[BROWSER-LOG] [vite] connecting...',
        '[BROWSER-LOG] [vite] connected.',
        '[BROWSER-LOG] Game initialized'
      ];
      expect(isTransientNetworkFailure(errorMsg, logBuffer)).toBe(false);
    });

    it('returns false when error is real Vue error and logBuffer contains Vue warnings', () => {
      const errorMsg = '[Vue error]: Unhandled error during execution of render function';
      const logBuffer = [
        '[BROWSER-WARN] [Vue warn]: Component is missing template'
      ];
      expect(isTransientNetworkFailure(errorMsg, logBuffer)).toBe(false);
    });
  });
});
