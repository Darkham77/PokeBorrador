import { describe, it, expect } from 'vitest';
import {
  calculateMovePower,
  calculateMoveAccuracy,
  calculateCritChance
} from '@/logic/battle/moveTooltipMath';
import type { Move } from '@/types/pokemon/pokemon';
import type { PurePokemon } from '@/logic/battle/battleMath';

describe('Move Tooltip Math Helpers', () => {
  it('should calculate weather ball adaptation correctly', () => {
    const move = { id: 'weatherball', name: 'Weather Ball', type: 'normal', cat: 'special' } as Move;
    const attacker = { id: 1, type: 'fire', maxHp: 100, hp: 100 } as unknown as PurePokemon;
    const res = calculateMovePower(move, attacker, null, 'sun', undefined, 50);
    expect(res.final).toBeGreaterThan(50);
    expect(res.list.some(l => l.label.includes('Weather Ball'))).toBe(true);
  });

  it('should calculate thunder in rain as 100% accuracy', () => {
    const move = { id: 'thunder', name: 'Thunder', type: 'electric' } as Move;
    const res = calculateMoveAccuracy(move, null, 'rain', undefined, 70, 0, 0);
    expect(res.final).toBe(100);
    expect(res.class).toBe('boosted');
  });

  it('should calculate crit rate with scopelens', () => {
    const attacker = { heldItem: 'scopelens' } as unknown as PurePokemon;
    const res = calculateCritChance(attacker, null);
    expect(res.value).toBe('12');
    expect(res.class).toBe('boosted');
  });
});
