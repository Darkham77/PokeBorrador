import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ShowdownBattleRunner } from '@/logic/battle/helpers/showdownBattleRunner.ts';

describe('ShowdownBattleRunner: History Cursor & Boundary Conditions', () => {
  it('returns null from requirePendingHistoryEntry when historyIndex equals history.length (exhausted)', () => {
    const mockDebug = {
      history: [
        { p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 }
      ],
      replayHistoryIdx: 1, // cursor advanced past turn 1
      certifiedReplayWorkerEnded: true
    };

    const entry = ShowdownBattleRunner.requirePendingHistoryEntry(mockDebug);
    assert.strictEqual(entry, null);
  });

  it('marks certifiedReplayWorkerEnded when advancing cursor past the last history entry', () => {
    const mockDebug = {
      history: [
        { p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 }
      ],
      replayHistoryIdx: 0,
      p1ChoiceIdx: 0,
      p2ChoiceIdx: 0,
      certifiedReplayWorkerEnded: false
    };

    ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(mockDebug);
    assert.strictEqual(mockDebug.replayHistoryIdx, 1);
    assert.strictEqual(mockDebug.certifiedReplayWorkerEnded, true);
  });
});
