import { describe, expect, it } from 'vitest';
import { createCertifiedItemBattleCases } from '../../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';
import { generateItemBatches } from '../../../scripts/e2e/fuzzer/generators/fuzzer_item_generator.ts';

describe('createCertifiedItemBattleCases', () => {
  it('promotes an organically terminal held-item run to the canonical battle contract', () => {
    const batch = generateItemBatches(['leftovers'], 1)[0];
    if (!batch) throw new Error('Expected a generated Leftovers batch.');
    batch.seed = [1, 2, 3, 4];
    batch.playerChoices = ['move 1'];
    batch.enemyChoices = ['move 1'];
    batch.history = [{ turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 }];
    batch.steps = ['Terminal held-item battle'];
    batch.ended = true;
    batch.winner = 'p1';
    batch.finalState = {
      isOver: true,
      winner: 'p1',
      p1: [{ name: batch.playerTeam[0]!.name, hp: 1, maxHp: 1, fainted: false }],
      p2: [{ name: batch.enemyTeam[0]!.name, hp: 0, maxHp: 1, fainted: true }],
    };

    expect(createCertifiedItemBattleCases([batch])).toHaveLength(1);
  });
});
