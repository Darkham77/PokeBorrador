import { describe, it, expect } from 'vitest';
import { buildSideFieldVolatiles } from '@/composables/battle/combatantStatusHelpers';
import { computeCombatantVolatiles } from '@/components/battle/combatantVolatilesHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';

describe('Battle Hazards and Side Volatiles Parity (RED -> GREEN)', () => {
  const mockPokemon = {
    id: 'pikachu',
    name: 'Pikachu',
    hp: 100,
    maxHp: 100,
    level: 50,
  } as unknown as Pokemon;

  describe('buildSideFieldVolatiles', () => {
    it('generates a status volatile tag for stealthrock (Trampa Rocas)', () => {
      const stages: Partial<BattleStages> = { stealthrock: 1 };
      const volatiles = buildSideFieldVolatiles(stages);
      const sr = volatiles.find(v => v.icon === '🪨');
      expect(sr).toBeDefined();
      expect(sr?.text).toContain('TRAMPA ROCAS');
      expect(sr?.count).toBe(1);
    });

    it('generates a status volatile tag for spikes (Púas)', () => {
      const stages: Partial<BattleStages> = { spikes: 3 };
      const volatiles = buildSideFieldVolatiles(stages);
      const sp = volatiles.find(v => v.icon === '📍');
      expect(sp).toBeDefined();
      expect(sp?.text).toContain('PÚAS');
      expect(sp?.count).toBe(3);
    });

    it('generates a status volatile tag for toxicspikes (Púas Tóxicas)', () => {
      const stages: Partial<BattleStages> = { toxicspikes: 2 };
      const volatiles = buildSideFieldVolatiles(stages);
      const ts = volatiles.find(v => v.icon === '☠️');
      expect(ts).toBeDefined();
      expect(ts?.text).toContain('PÚAS TÓXICAS');
      expect(ts?.count).toBe(2);
    });
  });

  describe('computeCombatantVolatiles', () => {
    it('computes hasStealthRock and hasToxicSpikes as true when present in stages', () => {
      const stages: Partial<BattleStages> = {
        stealthrock: 1,
        toxicspikes: 1,
        spikes: 2,
      };
      const result = computeCombatantVolatiles(mockPokemon, stages);
      expect(result.hasStealthRock).toBe(true);
      expect(result.hasToxicSpikes).toBe(true);
      expect(result.hasSpikes).toBe(true);
    });

    it('computes hasStealthRock and hasToxicSpikes as false when 0 or undefined', () => {
      const stages: Partial<BattleStages> = {
        stealthrock: 0,
        toxicspikes: 0,
        spikes: 0,
      };
      const result = computeCombatantVolatiles(mockPokemon, stages);
      expect(result.hasStealthRock).toBe(false);
      expect(result.hasToxicSpikes).toBe(false);
      expect(result.hasSpikes).toBe(false);
    });
  });
});
