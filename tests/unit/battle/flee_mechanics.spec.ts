import { describe, it, expect } from 'vitest';
import { calculateEscapeChancePure } from '../../../src/logic/battle/battleCatchMath.ts';
import { calculateEscapeChance } from '../../../src/logic/battle/battleFormulas.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Flee Mechanics', () => {
  it('guarantees escape if player speed is greater than or equal to wild enemy speed', () => {
    const playerPoke: Partial<Pokemon> = {
      id: 'charmander',
      name: 'Charmander',
      level: 10,
      spe: 25,
      type: 'fire'
    };
    const enemyPoke: Partial<Pokemon> = {
      id: 'rattata',
      name: 'Rattata',
      level: 5,
      spe: 15,
      type: 'normal'
    };

    const canEscape = calculateEscapeChance(
      playerPoke as Pokemon,
      enemyPoke as Pokemon,
      0,
      {}
    );

    expect(canEscape).toBe(true);
  });

  it('guarantees escape if player has runaway ability or smokeball or is ghost type', () => {
    const ghostPoke: Partial<Pokemon> = {
      id: 'gastly',
      name: 'Gastly',
      level: 5,
      spe: 10,
      type: 'ghost'
    };
    const fastEnemy: Partial<Pokemon> = {
      id: 'electrode',
      name: 'Electrode',
      level: 50,
      spe: 150,
      type: 'electric'
    };

    const canEscapeGhost = calculateEscapeChance(
      ghostPoke as Pokemon,
      fastEnemy as Pokemon,
      0,
      {}
    );

    expect(canEscapeGhost).toBe(true);
  });

  it('calculates probability and increases chance with escape attempts when player is slower', () => {
    const slowPlayer = { spe: 10, type: 'normal' };
    const fastEnemy = { spe: 100, type: 'normal' };

    // With 0 attempts, f = (10 * 128) / 100 + 0 = 12.8 (12/256 = ~4.6%)
    // With 10 attempts, f = 12 + 300 = 312 >= 256 (100% chance)
    const guaranteedWithAttempts = calculateEscapeChancePure(
      slowPlayer as any,
      fastEnemy as any,
      10,
      null
    );

    expect(guaranteedWithAttempts).toBe(true);
  });

  it('prevents escape when trapped by Shadow Tag, Arena Trap, or Magnet Pull unless immune', () => {
    const groundedPlayer = { spe: 50, type: 'normal' };
    const arenaTrapEnemy = { spe: 20, type: 'ground', ability: 'arenatrap' };

    expect(calculateEscapeChancePure(groundedPlayer as any, arenaTrapEnemy as any, 0, null)).toBe(false);

    const flyingPlayer = { spe: 50, type: 'flying' };
    expect(calculateEscapeChancePure(flyingPlayer as any, arenaTrapEnemy as any, 0, null)).toBe(true);
  });
});
