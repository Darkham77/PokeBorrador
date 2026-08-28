import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { getForcedExitConfig } from '@/logic/battle/helpers/forcedSwitchRegistry';
import { BATTLE_ESCAPE_TYPES } from '@/types/battle/battle';

describe('Audit Parity - Forced Switch Expulsion Animation (|drag|)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('verifies that all forced switch escape types are valid domain union members', () => {
    const moveIds = ['whirlwind', 'roar', 'dragontail', 'circlethrow', 'teleport', 'uturn', 'voltswitch', 'redcard', 'ejectbutton'];
    for (const moveId of moveIds) {
      const config = getForcedExitConfig(moveId);
      expect(BATTLE_ESCAPE_TYPES).toContain(config.escapeType);
      expect(typeof config.getExpulsionLog).toBe('function');
      const log = config.getExpulsionLog('Pikachu');
      expect(log).toContain('Pikachu');
    }
  });

  it('maps whirlwind specifically to whirlwind escape animation and expulsion log', () => {
    const config = getForcedExitConfig('whirlwind');
    expect(config.escapeType).toBe('whirlwind');
    expect(config.getExpulsionLog('Magneton')).toBe('¡Magneton fue expulsado por el remolino!');
  });
});
