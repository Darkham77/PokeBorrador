/**
 * tests/node/player/player_progression_suite.test.ts
 *
 * Consolidated Suite for Player Progression & Class Mechanics:
 * 1. Player Class Math: Steal chance, robbery limits, bug symmetry bonus, catch rate modifiers, double rival chance.
 * 2. Player Class Missions: Mission recovery / heal stuck pokemon, mission metadata & rules audit across classes.
 */

import { describe, it, test } from 'vitest';
import assert from 'node:assert/strict';

import {
  calculateQuickStealChance,
  calculateBugSymmetryBonus,
  calculateTrainerCatchRateModifier,
  hasDoubleRivalChance,
  calculateMaxNpcRobberyLimit
} from '../../../src/logic/player/classMath.ts';
import { healStuckMissions } from '../../../src/logic/player/missionRecovery.ts';
import { getClassMissionDetails } from '../../../src/logic/player/classMissionsData.ts';
import { CLASS_MISSIONS, type PlayerClassId } from '../../../src/data/player/playerClasses.ts';
import { isItemId } from '../../../src/data/inventory/items.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Player Progression Suite', () => {
  describe('Player Class Math', () => {
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
  });

  describe('Player Class Missions Integrity & Self-Healing', () => {
    it('healStuckMissions should release pokemon stuck onMission when no activeMission is present', () => {
      const team = [
        { uid: 'poke1', name: 'Bulbasaur', onMission: true } as unknown as Pokemon
      ];
      const box = [
        { uid: 'poke2', name: 'Charmander', onMission: true } as unknown as Pokemon,
        { uid: 'poke3', name: 'Squirtle', onMission: false } as unknown as Pokemon
      ];
      const activeMission = null;

      const fixedAny = healStuckMissions(team, box, activeMission);

      // Verify both poke1 and poke2 are self-healed (onMission = false)
      assert.strictEqual(team[0]?.onMission, false);
      assert.strictEqual(box[0]?.onMission, false);
      assert.strictEqual(box[1]?.onMission, false);
      assert.strictEqual(fixedAny, true, 'Should return true indicating changes were made');
    });

    it('healStuckMissions should NOT release pokemon currently active on a class mission', () => {
      const team = [
        { uid: 'active-poke', name: 'Bulbasaur', onMission: true } as unknown as Pokemon
      ];
      const box = [
        { uid: 'stuck-poke', name: 'Charmander', onMission: true } as unknown as Pokemon
      ];
      const activeMission = {
        id: 'mission_6h',
        targetPokemonUid: 'active-poke'
      };

      const fixedAny = healStuckMissions(team, box, activeMission);

      // Verify active-poke remains onMission: true, but stuck-poke is released
      assert.strictEqual(team[0]?.onMission, true);
      assert.strictEqual(box[0]?.onMission, false);
      assert.strictEqual(fixedAny, true);
    });

    it('healStuckMissions should resolve stuck pokemon using targetPokemonIdx if targetPokemonUid is not stored', () => {
      const team: Pokemon[] = [];
      const box = [
        { uid: 'active-idx-poke', name: 'Charmander', onMission: true } as unknown as Pokemon,
        { uid: 'stuck-poke', name: 'Squirtle', onMission: true } as unknown as Pokemon
      ];
      const activeMission = {
        id: 'mission_6h',
        targetPokemonIdx: 0 // Index 0 is active-idx-poke
      };

      const fixedAny = healStuckMissions(team, box, activeMission);

      // Index 0 should remain on mission, but index 1 is stuck and should be healed
      assert.strictEqual(box[0]?.onMission, true);
      assert.strictEqual(box[1]?.onMission, false);
      assert.strictEqual(fixedAny, true);
    });

    describe('Class Missions Metadata & Rules Audit', () => {
      const classes = ['rocket', 'cazabichos', 'entrenador', 'criador'] as const;

      for (const cls of classes) {
        describe(`Class: ${cls}`, () => {
          for (const m of CLASS_MISSIONS) {
            it(`provides complete dialogue, rulesText, and detailed rewards for ${m.id}`, () => {
              const details = getClassMissionDetails(cls, m.id);

              assert.ok(details, `Mission details must exist for ${cls} - ${m.id}`);
              assert.ok(details.dialogue.length > 10, 'Dialogue flavor text should be descriptive');
              assert.ok(details.rulesText.length > 15, 'Rules text must explain requirements and mechanics');
              assert.ok(details.rewards.length >= 2, 'Must have at least 2 detailed reward items');

              for (const reward of details.rewards) {
                assert.ok(reward.label.length > 0, 'Reward must have a label');
                assert.ok(reward.val.length > 0, 'Reward must have a value');
                assert.ok(reward.tooltipTitle.length > 0, 'Reward must have a tooltip title');
                assert.ok(reward.tooltipDesc.length > 0, 'Reward must have a tooltip description');

                if (reward.isItem && reward.id) {
                  assert.strictEqual(
                    isItemId(reward.id),
                    true,
                    `Item reward id '${reward.id}' must be a valid canonical ItemId`
                  );
                }
              }
            });
          }
        });
      }

      it('returns fallback defaults when classId is invalid or undefined', () => {
        const fallback = getClassMissionDetails('invalid_class' as unknown as PlayerClassId, 'mission_6h');
        assert.ok(fallback.dialogue.length > 0);
        assert.ok(fallback.rulesText.length > 0);
        assert.ok(fallback.rewards.length > 0);
      });
    });
  });
});
