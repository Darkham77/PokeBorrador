/**
 * tests/node/system/save_concurrency_force_remote.test.ts
 *
 * Tier 1 Unit test reproducing the regression where a queued saveGame call
 * requesting `forceRemote: true` loses its options and is downgraded to `forceRemote: false`
 * because the in-flight save's options were used instead.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { saveGame, resetSaveOperationState } from '../../../src/logic/auth/saveService.ts';
import { saveCoordinator } from '../../../src/logic/auth/saveCoordinator.ts';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import { pokemonDebugService } from '../../../src/logic/debug/pokemonDebugService.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { AuthUser } from '../../../src/types/auth/auth.ts';

describe('saveService Concurrency forceRemote Preservation', () => {
  it('preserves forceRemote: true when queued behind an un-forced in-flight save', async () => {
    resetSaveOperationState();

    // Simulate that a cloud save happened recently, so un-forced saves are throttled by the 60s rule
    saveCoordinator.notifyCloudSaveSuccess();
    assert.strictEqual(saveCoordinator.shouldExecuteCloudSave(false), false, 'Cloud saves should be throttled');

    const user: AuthUser = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'trainer@example.local',
      user_metadata: { username: 'TrainerPvp' }
    };

    const starter = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 50 });

    const state1: GameState = JSON.parse(JSON.stringify(INITIAL_STATE));
    state1.trainer = 'TrainerPvp';
    state1.starterChosen = true;
    state1.team = [starter];
    state1.box = [];

    const state2: GameState = JSON.parse(JSON.stringify(state1));
    state2.money = 5000;

    let rpcCallCount = 0;
    const mockDb: any = {
      mode: 'online',
      rpc: async (_name: string, _params: unknown) => {
        rpcCallCount++;
        await new Promise(resolve => setTimeout(resolve, 30));
        return { data: { success: true, last_save_id: `save-${rpcCallCount}` }, error: null };
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: user.id } }) }) }),
        update: () => ({ eq: async () => ({ data: null, error: null }) })
      })
    };

    // Save 1: Un-forced background save (throttled locally)
    const p1 = saveGame(state1, user, { db: mockDb, showNotif: false, forceRemote: false });
    // Save 2: Explicit forceRemote: true arrived while Save 1 is in-flight
    const p2 = saveGame(state2, user, { db: mockDb, showNotif: false, forceRemote: true });

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.ok(res1 !== null, 'Save 1 should succeed');
    assert.ok(res2 !== null, 'Save 2 should succeed');
    assert.strictEqual(res2?.remote, true, 'Save 2 MUST have executed as a remote cloud save (remote: true)');
    assert.strictEqual(rpcCallCount, 1, 'Save 2 MUST have invoked db.rpc to persist to the remote database');
  });
});
