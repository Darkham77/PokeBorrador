import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { prepareSeatPayload } from '@/logic/battle/orchestratorPayloadHelper.ts';
import { syncActiveMovesFromRequest } from '@/stores/battle/battleMoveSync.ts';
import { makePokemon } from '@/logic/pokemon/pokemonFactory.ts';
import type { BattleState, ShowdownPlayerRequest } from '@/types/battle/battle.ts';
import { useGameStore } from '@/stores/game.ts';

describe('PP Persistence Across Battles & Showdown Worker', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prepareSeatPayload accurately extracts movesPP map with current PP for each move', () => {
    const pidgeot = makePokemon('pidgeot', 31)!;
    pidgeot.uid = 'pidgeot-uid-123';
    pidgeot.moves = [
      { id: 'wingattack', name: 'Ataque Ala', type: 'flying', cat: 'physical', power: 60, acc: 100, pp: 20, maxPP: 56, priority: 0 },
      { id: 'whirlwind', name: 'Remolino', type: 'normal', cat: 'status', power: 0, acc: 100, pp: 23, maxPP: 32, priority: -6 }
    ];

    const payload = prepareSeatPayload([pidgeot], pidgeot, null, 'Player');

    expect(payload.movesPP).toBeDefined();
    expect(payload.movesPP['pidgeot-uid-123']).toEqual({
      wingattack: 20,
      whirlwind: 23
    });
  });

  it('syncActiveMovesFromRequest syncs reduced PP without resetting to maxPP', () => {
    const gs = useGameStore();
    const pidgeot = makePokemon('pidgeot', 31)!;
    pidgeot.uid = 'pidgeot-uid-123';
    pidgeot.moves = [
      { id: 'wingattack', name: 'Ataque Ala', type: 'flying', cat: 'physical', power: 60, acc: 100, pp: 35, maxPP: 56, priority: 0 },
      { id: 'whirlwind', name: 'Remolino', type: 'normal', cat: 'status', power: 0, acc: 100, pp: 23, maxPP: 32, priority: -6 }
    ];
    gs.state.team = [pidgeot];

    const mockActiveBattle: Partial<BattleState> = {
      player: pidgeot,
      playerRequest: {
        active: [{
          moves: [
            { move: 'Ataque Ala', id: 'wingattack', pp: 34, maxpp: 56, target: 'normal' },
            { move: 'Remolino', id: 'whirlwind', pp: 22, maxpp: 32, target: 'normal' }
          ]
        }],
        side: {
          pokemon: [{
            ident: 'p1: pidgeot-uid-123',
            uid: 'pidgeot-uid-123',
            active: true
          }]
        }
      } as unknown as ShowdownPlayerRequest
    };

    syncActiveMovesFromRequest(mockActiveBattle as BattleState, 'player');

    expect(pidgeot.moves[0]!.pp).toBe(34);
    expect(pidgeot.moves[1]!.pp).toBe(22);
    expect(gs.state.team[0]!.moves[0]!.pp).toBe(34);
    expect(gs.state.team[0]!.moves[1]!.pp).toBe(22);
  });
});
