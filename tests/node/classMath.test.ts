import test from 'node:test';
import assert from 'node:assert';
import { 
  calculateQuickStealChance, 
  calculateBugSymmetryBonus, 
  calculateTrainerCatchRateModifier, 
  hasDoubleRivalChance,
  calculateMaxNpcRobberyLimit
} from '../../src/logic/player/classMath.ts';

test('calculateQuickStealChance', () => {
  assert.strictEqual(calculateQuickStealChance(1), 0.15);
  assert.strictEqual(calculateQuickStealChance(2), 0.16);
  assert.strictEqual(calculateQuickStealChance(15), 0.29);
  assert.strictEqual(calculateQuickStealChance(16), 0.30);
  assert.strictEqual(calculateQuickStealChance(30), 0.30); // limit cap test
  assert.strictEqual(calculateQuickStealChance(0), 0.15); // low bound test
});

test('calculateMaxNpcRobberyLimit', () => {
  assert.strictEqual(calculateMaxNpcRobberyLimit(1), 8);
  assert.strictEqual(calculateMaxNpcRobberyLimit(4), 128);
  assert.strictEqual(calculateMaxNpcRobberyLimit(10), 800);
  assert.strictEqual(calculateMaxNpcRobberyLimit(20), 3200);
  assert.strictEqual(calculateMaxNpcRobberyLimit(50), 20000);
  assert.strictEqual(calculateMaxNpcRobberyLimit(60), 28800);
  assert.strictEqual(calculateMaxNpcRobberyLimit(100), 80000);
  assert.strictEqual(calculateMaxNpcRobberyLimit(0), 8); // bound limit test
});

test('calculateBugSymmetryBonus', () => {
  const emptyTeam: { type1: string; type2?: string }[] = [];
  assert.strictEqual(calculateBugSymmetryBonus(emptyTeam), 1.0);

  const teamWithBugs = [
    { type1: 'bug' },
    { type1: 'fire' },
    { type1: 'water', type2: 'bug' },
    { type1: 'bicho' },
  ];
  // 3 bugs found: +15% bonus => 1.15
  assert.strictEqual(calculateBugSymmetryBonus(teamWithBugs), 1.15);

  const massiveBugTeam = Array(10).fill({ type1: 'bug' });
  // Max cap 6 bugs => +30% bonus => 1.30
  assert.strictEqual(calculateBugSymmetryBonus(massiveBugTeam), 1.30);
});

test('calculateTrainerCatchRateModifier', () => {
  assert.strictEqual(calculateTrainerCatchRateModifier(100, 100), 100);
  assert.strictEqual(calculateTrainerCatchRateModifier(100, 120), 100);
  assert.strictEqual(calculateTrainerCatchRateModifier(100, 121), 90); // rare iv penalty
});

test('hasDoubleRivalChance', () => {
  assert.strictEqual(hasDoubleRivalChance([], {}), false);

  const defeatedGyms = ['pewter', 'cerulean'];
  const incompleteProgress = {
    pewter: { hard: true },
    cerulean: { normal: true }
  };
  assert.strictEqual(hasDoubleRivalChance(defeatedGyms, incompleteProgress), false);

  const completedHardProgress = {
    pewter: { hard: true },
    cerulean: { hard: true }
  };
  assert.strictEqual(hasDoubleRivalChance(defeatedGyms, completedHardProgress), true);
});
