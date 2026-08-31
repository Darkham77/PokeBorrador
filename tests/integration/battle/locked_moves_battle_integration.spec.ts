import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { useGameStore } from '@/stores/game.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { BattleState } from '@/types/battle/battle';

describe('Locked Moves Multi-Turn Integration Test (Tier 2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('correctly animates attack across consecutive turns of Outrage and disables non-locked moves', async () => {
    const gameStore = useGameStore();
    const battleStore = useBattleStore();

    const rayquazaMoves: Move[] = [
      { id: 'outrage', name: 'Enfado', type: 'dragon', cat: 'physical', power: 120, acc: 100, pp: 15, maxPP: 15, disabled: false },
      { id: 'dragondance', name: 'Danza Dragón', type: 'dragon', cat: 'status', power: undefined, acc: undefined, pp: 20, maxPP: 20, disabled: false },
      { id: 'raindance', name: 'Danza Lluvia', type: 'water', cat: 'status', power: undefined, acc: undefined, pp: 5, maxPP: 5, disabled: false },
      { id: 'hyperbeam', name: 'Hiperrayo', type: 'normal', cat: 'special', power: 150, acc: 90, pp: 5, maxPP: 5, disabled: false }
    ];

    const rayquaza = {
      uid: 'rayquaza-uid',
      id: 'rayquaza',
      name: 'Rayquaza',
      level: 100,
      hp: 350,
      maxHp: 350,
      moves: rayquazaMoves,
      types: ['dragon', 'flying']
    } as unknown as Pokemon;

    const snorlax = {
      uid: 'snorlax-uid',
      id: 'snorlax',
      name: 'Snorlax',
      level: 100,
      hp: 500,
      maxHp: 500,
      moves: [
        { id: 'rest', name: 'Descanso', type: 'psychic', cat: 'status', pp: 10, maxPP: 10, disabled: false }
      ],
      types: ['normal']
    } as unknown as Pokemon;

    gameStore.state.team = [rayquaza];
    const initialBattleState = {
      player: rayquaza,
      enemy: snorlax,
      playerTeam: [rayquaza],
      enemyTeam: [snorlax],
      turnCount: 0,
      over: false,
      playerRequest: {
        active: [{
          moves: [
            { id: 'outrage', move: 'Enfado', pp: 15, maxpp: 15, disabled: false },
            { id: 'dragondance', move: 'Danza Dragón', pp: 20, maxpp: 20, disabled: false },
            { id: 'raindance', move: 'Danza Lluvia', pp: 5, maxpp: 5, disabled: false },
            { id: 'hyperbeam', move: 'Hiperrayo', pp: 5, maxpp: 5, disabled: false }
          ]
        }]
      }
    } as unknown as BattleState;
    battleStore.state = initialBattleState;

    const activeBattleRef = ref<BattleState>(initialBattleState);
    const playedTweens: string[] = [];
    const attackerSideRef = ref<'player' | 'enemy' | null>(null);
    const activeMoveRef = ref<unknown>(null);

    const mockCtx = {
      activeBattle: activeBattleRef,
      attackerSide: attackerSideRef,
      activeMove: activeMoveRef,
      addLog: vi.fn(),
      animations: {
        awaitTween: vi.fn(async (name: string) => {
          playedTweens.push(name);
        }),
        handleShakeRequest: vi.fn().mockResolvedValue(undefined)
      }
    };

    // Simulate Turn 1: Player uses Outrage
    const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge.ts');
    await parseShowdownLogLine(
      mockCtx as never,
      '|move|p1a: Rayquaza|Outrage|p2a: Snorlax',
      ['|move|p1a: Rayquaza|Outrage|p2a: Snorlax', '|-damage|p2a: Snorlax|300/500']
    );

    expect(playedTweens).toContain('attack-player');
    playedTweens.length = 0;

    // Simulate Showdown state after turn 1: lock into Outrage
    initialBattleState.playerRequest = {
      active: [{
        moves: [
          { id: 'outrage', move: 'Enfado', pp: 14, maxpp: 15, disabled: false }
        ]
      }]
    } as never;
    rayquaza.volatileCounters = { lockedmove: 1 };
    rayquaza.lastMove = rayquazaMoves[0];

    const { syncActiveMovesFromRequest } = await import('@/stores/battle/battleMoveSync.ts');
    syncActiveMovesFromRequest(initialBattleState, 'player');

    // Assert that non-locked moves are marked disabled
    expect(rayquaza.moves[0]!.disabled).toBe(false);
    expect(rayquaza.moves[1]!.disabled).toBe(true);
    expect(rayquaza.moves[2]!.disabled).toBe(true);
    expect(rayquaza.moves[3]!.disabled).toBe(true);

    // Simulate Turn 2: Showdown outputs continuation with [from]lockedmove
    await parseShowdownLogLine(
      mockCtx as never,
      '|move|p1a: Rayquaza|Outrage|p2a: Snorlax|[from]lockedmove',
      ['|move|p1a: Rayquaza|Outrage|p2a: Snorlax|[from]lockedmove', '|-damage|p2a: Snorlax|100/500']
    );

    // Assert that attack animation is triggered on Turn 2 as well!
    expect(playedTweens).toContain('attack-player');
  });
});
