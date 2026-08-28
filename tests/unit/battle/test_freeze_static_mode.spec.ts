import { describe, it, expect } from 'vitest';
import {
  isIdleSuppressed,
  getIdleFloatingConfig,
  getIdleGroundedConfig
} from '@/components/battle/helpers/combatantIdleAnims';
import {
  COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC,
  COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC,
  COMBATANT_IDLE_GROUNDED_BASE_SCALE_X,
  COMBATANT_IDLE_GROUNDED_VAR_SCALE_X
} from '@/logic/constants/animations';

describe('Freeze Static Mode and Combatant Idle Animations', () => {
  describe('isIdleSuppressed', () => {
    it('suppresses idle floating/breathing animation when status is freeze (frz / freeze / 🧊)', () => {
      expect(isIdleSuppressed('frz', 0, null)).toBe(true);
      expect(isIdleSuppressed('freeze', 0, null)).toBe(true);
      expect(isIdleSuppressed('🧊', 0, null)).toBe(true);
    });

    it('suppresses idle animation when status is paralyzed (par / ⚡)', () => {
      expect(isIdleSuppressed('par', 0, null)).toBe(true);
      expect(isIdleSuppressed('⚡', 0, null)).toBe(true);
    });

    it('suppresses idle animation when pokemon is confused', () => {
      expect(isIdleSuppressed(null, 2, null)).toBe(true);
      expect(isIdleSuppressed('', 1, null)).toBe(true);
    });

    it('suppresses idle animation during trapped or catching animation states', () => {
      expect(isIdleSuppressed(null, 0, 'trapped')).toBe(true);
      expect(isIdleSuppressed(null, 0, 'catching')).toBe(true);
    });

    it('allows idle animation when healthy or under non-blocking status (brn, psn, slp)', () => {
      expect(isIdleSuppressed(null, 0, null)).toBe(false);
      expect(isIdleSuppressed('', 0, null)).toBe(false);
      expect(isIdleSuppressed('brn', 0, null)).toBe(false);
      expect(isIdleSuppressed('psn', 0, null)).toBe(false);
    });
  });

  describe('getIdleFloatingConfig', () => {
    it('generates infinite yoyo sine.inOut tween configuration for floating species', () => {
      const config = getIdleFloatingConfig();

      expect(config.repeat).toBe(-1);
      expect(config.yoyo).toBe(true);
      expect(config.repeatRefresh).toBe(true);
      expect(config.ease).toBe('sine.inOut');

      const durFn = config.duration as () => number;
      for (let i = 0; i < 10; i++) {
        const dur = durFn();
        expect(dur).toBeGreaterThanOrEqual(COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC);
        expect(dur).toBeLessThanOrEqual(COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC + COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC);
      }
    });
  });

  describe('getIdleGroundedConfig', () => {
    it('generates subtle breathing scale tween configuration for grounded species', () => {
      const config = getIdleGroundedConfig();

      expect(config.repeat).toBe(-1);
      expect(config.yoyo).toBe(true);
      expect(config.repeatRefresh).toBe(true);
      expect(config.ease).toBe('sine.inOut');

      const scaleXFn = config.scaleX as () => number;
      for (let i = 0; i < 10; i++) {
        const sx = scaleXFn();
        expect(sx).toBeGreaterThanOrEqual(COMBATANT_IDLE_GROUNDED_BASE_SCALE_X);
        expect(sx).toBeLessThanOrEqual(COMBATANT_IDLE_GROUNDED_BASE_SCALE_X + COMBATANT_IDLE_GROUNDED_VAR_SCALE_X);
      }
    });
  });
});
