import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { getClassMissionDetails } from '../../../src/logic/player/classMissionsData.ts';
import { CLASS_MISSIONS } from '../../../src/data/player/playerClasses.ts';
import { isItemId } from '../../../src/data/inventory/items.ts';

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
    const fallback = getClassMissionDetails(undefined, 'mission_6h');
    assert.ok(fallback.dialogue.length > 0);
    assert.ok(fallback.rulesText.length > 0);
    assert.ok(fallback.rewards.length > 0);
  });
});
