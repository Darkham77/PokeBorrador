import { describe, it, expect } from 'vitest';
import { computeCombatantVolatiles } from '@/components/battle/combatantVolatilesHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';

describe('computeCombatantVolatiles Helper', () => {
  it('returns all false when pokemon is null', () => {
    const res = computeCombatantVolatiles(null, undefined);
    expect(res.isConfused).toBe(false);
    expect(res.isTaunted).toBe(false);
    expect(res.isSubstitute).toBe(false);
    expect(res.hasReflect).toBe(false);
  });

  it('computes active volatiles from volatileCounters correctly', () => {
    const mockPokemon = {
      id: 'gengar',
      name: 'Gengar',
      hp: 100,
      maxHp: 100,
      level: 50,
      confused: false,
      volatileCounters: {
        confusion: 2,
        taunt: 3,
        substitute: 1,
        flinch: 1,
        curse: 1
      }
    } as unknown as Pokemon;

    const mockStages: Partial<BattleStages> = {
      reflect: 5,
      lightScreen: 0,
      safeguard: 0,
      mist: 0
    };

    const res = computeCombatantVolatiles(mockPokemon, mockStages);
    expect(res.isConfused).toBe(true);
    expect(res.isTaunted).toBe(true);
    expect(res.isSubstitute).toBe(true);
    expect(res.isFlinched).toBe(true);
    expect(res.isCursed).toBe(true);
    expect(res.hasReflect).toBe(true);
    expect(res.hasLightScreen).toBe(false);
  });
});
