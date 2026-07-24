// src/logic/battle/helpers/__tests__/showdownBridgeV3Fixes.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcStatsPure } from '../../../pokemon/statsMath.ts';
import { filterShowdownLogs } from '../../showdownBridge.ts';

describe('Showdown Audit v3 Fixes Unit Tests', () => {
  it('enforces EV clamping (0-252) in calcStatsPure (NEW-11)', () => {
    const base = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const natureData = { name: 'serious', up: null, down: null };

    // Pass illegal EV 500 — should clamp to 252 (giving identical result to ev = 252)
    const statsClamped = calcStatsPure(100, ivs, base, natureData, false, { atk: 252 });
    const statsOverflown = calcStatsPure(100, ivs, base, natureData, false, { atk: 500 });

    assert.equal(statsOverflown.atk, statsClamped.atk);
  });

  it('parameterizes filterShowdownLogs with custom playerSide (NEW-10)', () => {
    const logs = [
      '|split|p2',
      '|-secret|p2 secret log',
      '|-public|p2 public log',
    ];

    // For player side = p2, it should pick the secret line
    const filteredP2 = filterShowdownLogs(logs, 'p2');
    assert.deepEqual(filteredP2, ['|-secret|p2 secret log']);

    // For default player side = p1, it should pick the public line for a p2 split
    const filteredP1 = filterShowdownLogs(logs, 'p1');
    assert.deepEqual(filteredP1, ['|-public|p2 public log']);
  });
});
