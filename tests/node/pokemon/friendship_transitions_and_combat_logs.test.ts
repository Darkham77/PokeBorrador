import { describe, it, expect, vi } from 'vitest';
import {
  calculateFriendshipLevelUpDelta,
  getFriendshipTransitionLog,
  applyFriendshipDelta,
} from '@/logic/pokemon/friendshipLogic';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Friendship Tier Transitions & Battle Log Notifications', () => {
  it('calculates level up friendship gains properly with and without Soothe Bell', () => {
    // Low friendship (< 100) -> base +5
    expect(calculateFriendshipLevelUpDelta(40, false)).toBe(5);
    expect(calculateFriendshipLevelUpDelta(40, true)).toBe(7); // 5 * 1.5 = 7.5 -> 7

    // Mid friendship (100 - 219) -> base +3
    expect(calculateFriendshipLevelUpDelta(150, false)).toBe(3);
    expect(calculateFriendshipLevelUpDelta(150, true)).toBe(4); // 3 * 1.5 = 4.5 -> 4

    // High friendship (>= 220) -> base +2
    expect(calculateFriendshipLevelUpDelta(230, false)).toBe(2);
    expect(calculateFriendshipLevelUpDelta(230, true)).toBe(3); // 2 * 1.5 = 3
  });

  it('detects ascending tier transitions and formats rich log messages', () => {
    // Distrust -> Sprout (49 -> 50)
    const logSprout = getFriendshipTransitionLog(49, 50, 'Pikachu');
    expect(logSprout).not.toBeNull();
    expect(logSprout?.newTier).toBe('sprout');
    expect(logSprout?.direction).toBe('up');
    expect(logSprout?.message).toContain('🌱');
    expect(logSprout?.message).toContain('florecer');

    // Sprout -> Comrade (99 -> 100)
    const logComrade = getFriendshipTransitionLog(99, 100, 'Pikachu');
    expect(logComrade).not.toBeNull();
    expect(logComrade?.newTier).toBe('comrade');
    expect(logComrade?.direction).toBe('up');
    expect(logComrade?.message).toContain('🤝');
    expect(logComrade?.message).toContain('camarada');

    // Comrade -> Radiant Prism (159 -> 160)
    const logRadiant = getFriendshipTransitionLog(159, 160, 'Pikachu');
    expect(logRadiant).not.toBeNull();
    expect(logRadiant?.newTier).toBe('radiant_prism');
    expect(logRadiant?.direction).toBe('up');
    expect(logRadiant?.message).toContain('💎');
    expect(logRadiant?.message).toContain('evolucionar');

    // Radiant Prism -> Best Friends (219 -> 220)
    const logBestFriends = getFriendshipTransitionLog(219, 220, 'Pikachu');
    expect(logBestFriends).not.toBeNull();
    expect(logBestFriends?.newTier).toBe('best_friends');
    expect(logBestFriends?.direction).toBe('up');
    expect(logBestFriends?.message).toContain('🎀');
    expect(logBestFriends?.message).toContain('Mejores Amigos');
  });

  it('detects descending tier transitions when friendship drops and alerts the trainer', () => {
    // Best Friends -> Radiant Prism (220 -> 219)
    const logDropBestFriends = getFriendshipTransitionLog(220, 219, 'Lucario');
    expect(logDropBestFriends).not.toBeNull();
    expect(logDropBestFriends?.newTier).toBe('radiant_prism');
    expect(logDropBestFriends?.direction).toBe('down');
    expect(logDropBestFriends?.type).toBe('log-error');
    expect(logDropBestFriends?.message).toContain('ha descendido del nivel de Mejores Amigos');

    // Radiant Prism -> Comrade (160 -> 159)
    const logDropRadiant = getFriendshipTransitionLog(160, 159, 'Lucario');
    expect(logDropRadiant).not.toBeNull();
    expect(logDropRadiant?.newTier).toBe('comrade');
    expect(logDropRadiant?.direction).toBe('down');
    expect(logDropRadiant?.message).toContain('ya no está listo para evolucionar');

    // Comrade -> Sprout (100 -> 99)
    const logDropComrade = getFriendshipTransitionLog(100, 99, 'Lucario');
    expect(logDropComrade).not.toBeNull();
    expect(logDropComrade?.newTier).toBe('sprout');
    expect(logDropComrade?.direction).toBe('down');
    expect(logDropComrade?.message).toContain('parece dudar');

    // Sprout -> Distrust (50 -> 49)
    const logDropDistrust = getFriendshipTransitionLog(50, 49, 'Lucario');
    expect(logDropDistrust).not.toBeNull();
    expect(logDropDistrust?.newTier).toBe('distrust');
    expect(logDropDistrust?.direction).toBe('down');
    expect(logDropDistrust?.message).toContain('⛓️');
    expect(logDropDistrust?.message).toContain('desconfianza');
  });

  it('returns null when friendship changes within the same tier (no spam)', () => {
    expect(getFriendshipTransitionLog(50, 75, 'Eevee')).toBeNull();
    expect(getFriendshipTransitionLog(120, 140, 'Eevee')).toBeNull();
    expect(getFriendshipTransitionLog(180, 200, 'Eevee')).toBeNull();
    expect(getFriendshipTransitionLog(230, 255, 'Eevee')).toBeNull();
    expect(getFriendshipTransitionLog(30, 10, 'Eevee')).toBeNull();
  });

  it('applies friendship delta directly on Pokemon instance and dispatches log function', () => {
    const dummyPokemon = {
      id: 'pikachu',
      name: 'Pikachu',
      nickname: 'Sparky',
      friendship: 159,
    } as unknown as Pokemon;

    const mockLogFn = vi.fn();

    // Crossing from 159 to 162 (Radiant Prism)
    const result = applyFriendshipDelta(dummyPokemon, 3, mockLogFn);

    expect(dummyPokemon.friendship).toBe(162);
    expect(result.newFriendship).toBe(162);
    expect(result.transition).not.toBeNull();
    expect(mockLogFn).toHaveBeenCalledTimes(1);
    expect(mockLogFn).toHaveBeenCalledWith(
      expect.stringContaining('💎 ¡El lazo de Sparky brilla intensamente!'),
      'log-player',
      dummyPokemon
    );
  });
});
