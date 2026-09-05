import { describe, it, expect } from 'vitest';
import { isCriticalConsoleMessage } from '../../../scripts/e2e/e2e_helpers.ts';

describe('Console Error Hardening - isCriticalConsoleMessage', () => {
  describe('Vue Warnings', () => {
    it('detects [Vue warn] component resolution failure as critical', () => {
      expect(isCriticalConsoleMessage('[Vue warn]: Failed to resolve component: PokemonSortBar', 'warning')).toBe(true);
    });

    it('detects [Vue warn] missing required prop as critical', () => {
      expect(isCriticalConsoleMessage('[Vue warn]: Missing required prop: "id"', 'warning')).toBe(true);
    });

    it('detects [Vue warn] prop type check validation as critical', () => {
      expect(isCriticalConsoleMessage('[Vue warn]: Invalid prop: type check failed for prop "title"', 'warning')).toBe(true);
    });

    it('detects [Vue warn] duplicate keys in v-for as critical', () => {
      expect(isCriticalConsoleMessage('[Vue warn]: Duplicate keys detected: "item-1"', 'warning')).toBe(true);
    });

    it('detects [Vue warn] prop direct mutation anti-pattern as critical', () => {
      expect(isCriticalConsoleMessage('[Vue warn]: Avoid mutating a prop directly', 'warning')).toBe(true);
    });

    it('detects legacy or un-prefixed Failed to resolve component as critical', () => {
      expect(isCriticalConsoleMessage('Failed to resolve component: CustomButton', 'error')).toBe(true);
    });

    it('detects Failed to resolve directive as critical', () => {
      expect(isCriticalConsoleMessage('Failed to resolve directive: custom-directive', 'warning')).toBe(true);
    });
  });

  describe('Vue Errors', () => {
    it('detects [Vue error] runtime prefix as critical', () => {
      expect(isCriticalConsoleMessage('[Vue error]: Unhandled error during render', 'error')).toBe(true);
    });

    it('detects Vue Render Error string as critical', () => {
      expect(isCriticalConsoleMessage('Vue Render Error: component failed mounting', 'error')).toBe(true);
    });

    it('detects [Vue warn]: Unhandled error as critical', () => {
      expect(isCriticalConsoleMessage('[Vue warn]: Unhandled error during execution of render function', 'error')).toBe(true);
    });
  });

  describe('Standard Runtime Errors & Exceptions', () => {
    it('detects [CRITICAL] tags as critical', () => {
      expect(isCriticalConsoleMessage('[CRITICAL] Unhandled state transition failure', 'error')).toBe(true);
    });

    it('detects ReferenceError as critical', () => {
      expect(isCriticalConsoleMessage('ReferenceError: activeBattle is not defined', 'error')).toBe(true);
    });

    it('detects standard TypeError as critical', () => {
      expect(isCriticalConsoleMessage('TypeError: Cannot read properties of undefined (reading "hp")', 'error')).toBe(true);
    });

    it('ignores transient TypeError: Failed to fetch dynamically imported module (handled by resilientComponent)', () => {
      expect(isCriticalConsoleMessage('TypeError: Failed to fetch dynamically imported module /src/views/Home.vue', 'error')).toBe(false);
    });
  });

  describe('Harmless Console Messages', () => {
    it('does not flag normal application logs', () => {
      expect(isCriticalConsoleMessage('[SQLite] Persistence successful', 'log')).toBe(false);
      expect(isCriticalConsoleMessage('⚡ [E2E] GSAP timeScale set to 100x', 'debug')).toBe(false);
    });

    it('does not flag standard browser non-vue warnings', () => {
      expect(isCriticalConsoleMessage('A cookie associated with a cross-site resource was set without SameSite attribute', 'warning')).toBe(false);
    });
  });
});
