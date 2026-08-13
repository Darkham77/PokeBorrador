import assert from 'node:assert/strict';
import { test } from 'vitest';
import { ShowdownBattleRunner } from '../../../src/logic/battle/helpers/showdownBattleRunner.ts';

const P2_ONLY_HISTORY_INDEX = 0;
const NORMAL_HISTORY_INDEX = 1;

test('certified history keeps P2-only switches atomic before the following normal turn', () => {
  const debug: object = {
    replayHistoryIdx: P2_ONLY_HISTORY_INDEX,
    history: [
      { p1Choice: '', p2Choice: 'switch 2' },
      { p1Choice: 'move 3', p2Choice: 'move 1' },
    ],
  };

  assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p1'), '');
  assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p2'), 'switch 2');
  ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(debug);
  assert.equal(Reflect.get(debug, 'replayHistoryIdx'), NORMAL_HISTORY_INDEX);
  assert.equal(Reflect.get(debug, 'p1ChoiceIdx'), P2_ONLY_HISTORY_INDEX);
  assert.equal(Reflect.get(debug, 'p2ChoiceIdx'), NORMAL_HISTORY_INDEX);
  assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p1'), 'move 3');
  assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p2'), 'move 1');
});

test('certified history preserves both choices for a simultaneous forced replacement', () => {
  const debug: object = {
    replayHistoryIdx: P2_ONLY_HISTORY_INDEX,
    history: [{ p1Choice: 'switch 3', p2Choice: 'switch 2' }],
  };

  assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p1'), 'switch 3');
  assert.equal(ShowdownBattleRunner.requireHistoryChoice(debug, 'p2'), 'switch 2');
});

test('does not request a replacement choice after the certified worker ended on the final history entry', () => {
  const debug = {
    history: [{ p1Choice: 'move 1', p2Choice: 'move 1' }],
    replayHistoryIdx: NORMAL_HISTORY_INDEX,
    certifiedReplayWorkerEnded: true,
  };

  assert.equal(ShowdownBattleRunner.requirePendingHistoryEntry(debug), null);
});

test('rejects an exhausted history while the certified worker still requires an action', () => {
  const debug = {
    history: [{ p1Choice: 'move 1', p2Choice: 'move 1' }],
    replayHistoryIdx: NORMAL_HISTORY_INDEX,
    certifiedReplayWorkerEnded: false,
  };

  assert.throws(
    () => ShowdownBattleRunner.requirePendingHistoryEntry(debug),
    /Certified replay history step is missing/,
  );
});
