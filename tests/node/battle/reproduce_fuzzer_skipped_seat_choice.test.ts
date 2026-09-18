import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { buildTurnSeats } from '../../../src/logic/battle/engine/showdownSeatSyncHelper.ts';

describe('Showdown Skipped Seat Choice - Reproduction Test', () => {
  const p1Team = [
    {
      name: 'Mew-1',
      species: 'Mew',
      level: 100,
      gender: 'N',
      item: '',
      ability: 'synchronize',
      nature: 'serious',
      moves: ['psychic', 'protect']
    },
    {
      name: 'Mew-2',
      species: 'Mew',
      level: 100,
      gender: 'N',
      item: '',
      ability: 'synchronize',
      nature: 'serious',
      moves: ['flamethrower', 'protect']
    }
  ];

  const p2Team = [
    {
      name: 'Blissey',
      species: 'Blissey',
      level: 100,
      gender: 'F',
      item: '',
      ability: 'naturalcure',
      nature: 'serious',
      moves: ['thunderbolt', 'surf']
    }
  ];

  it('should not throw missing certified choice when a seat is explicitly marked as skip', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player', team: p1Team as any });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as any });

    // Both sides are waiting for input (turn 1 move request)
    assert.strictEqual(battle.requestState, 'move');

    // Executing turn where P1 switches and P2 is marked as skip (p2Skip: true, p2Choice: '')
    // Before fix, this throws: [ShowdownBattleEngine] Required certified choice is missing. context={"seat":"p2"...}
    const result = executeBattleTurn({
      battle,
      p1Choice: 'switch 2',
      p2Choice: '',
      p1Skip: false,
      p2Skip: true,
      history: []
    });

    assert.strictEqual(result.p1AcceptedChoice, 'switch 2');
    assert.strictEqual(result.p2AcceptedChoice, 'default');
  });

  it('should set choice to pass in buildTurnSeats when seatInput.skip is true', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player', team: p1Team as any });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as any });

    let resolveChoiceCalledForP2 = false;
    const seats = buildTurnSeats(
      battle,
      {
        p1Choice: 'switch 2',
        p2Choice: '',
        p1Skip: false,
        p2Skip: true
      },
      (seatId) => {
        if (seatId === 'p2') {
          resolveChoiceCalledForP2 = true;
        }
        return 'switch 2';
      }
    );

    const p2Seat = seats.find(s => s.id === 'p2');
    assert.ok(p2Seat, 'P2 seat must exist');
    assert.strictEqual(p2Seat.skip, true);
    assert.strictEqual(resolveChoiceCalledForP2, false, 'resolveChoice must NOT be called for skipped seat');
    assert.strictEqual(p2Seat.choice, 'pass');
  });
});
