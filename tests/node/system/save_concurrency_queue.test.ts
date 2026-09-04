/**
 * tests/node/system/save_concurrency_queue.test.ts
 *
 * Tier 1 Unit test verifying that concurrent saveGame operations
 * are queued and coalesced rather than being dropped with null / success: false.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { saveGame, resetSaveOperationState } from '../../../src/logic/auth/saveService.ts';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import { pokemonDebugService } from '../../../src/logic/debug/pokemonDebugService.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { AuthUser } from '../../../src/types/auth/auth.ts';

describe('saveService Concurrency Queue', () => {
  it('coalesces and executes concurrent save calls without dropping saves', async () => {
    resetSaveOperationState();

    const user: AuthUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      user_metadata: { username: 'TrainerRed' }
    };

    const starter = pokemonDebugService.generate({ id: requirePokemonSpeciesId('charmander'), level: 5 });

    const state1: GameState = JSON.parse(JSON.stringify(INITIAL_STATE));
    state1.trainer = 'TrainerRed';
    state1.starterChosen = true;
    state1.team = [starter];
    state1.box = [];
    state1.eggs = [];

    const state2: GameState = JSON.parse(JSON.stringify(state1));
    state2.eggs = [
      {
        uid: 'egg-1',
        id: requirePokemonSpeciesId('charmander'),
        steps: 20,
        ready: false,
        isNpc: false,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        nature: 'hardy',
        movesAtBirth: [],
        abilitySlot: 0,
        isShiny: false
      }
    ];

    // Mock DBRouter where rpc simulates an async network latency
    let rpcCallCount = 0;
    const saveIdsReceived: (string | null)[] = [];
    const mockDb: any = {
      mode: 'online',
      rpc: async (_name: string, params: { p_save_data: any; p_expected_id: string | null }) => {
        rpcCallCount++;
        saveIdsReceived.push(params.p_expected_id);
        await new Promise(resolve => setTimeout(resolve, 30));
        return { data: { success: true, last_save_id: `save-${rpcCallCount}` }, error: null };
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: user.id } }) }) }),
        update: () => ({ eq: async () => ({ data: null, error: null }) })
      })
    };

    // Trigger two saves concurrently: save 1 starts, save 2 arrives while save 1 is in-flight
    const p1 = saveGame(state1, user, { db: mockDb, showNotif: false });
    const p2 = saveGame(state2, user, { db: mockDb, showNotif: false });

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.ok(res1 !== null, 'Save 1 should not return null');
    assert.ok(res1?.success, 'Save 1 should succeed');
    assert.ok(res2 !== null, 'Save 2 should not be dropped or return null');
    assert.ok(res2?.success, 'Save 2 should succeed via coalesced queue');
    assert.strictEqual(rpcCallCount, 2, 'Both save states should have been saved sequentially');
    assert.strictEqual(user.last_save_id, 'save-2', 'user.last_save_id should reflect the second save');
  });
});
