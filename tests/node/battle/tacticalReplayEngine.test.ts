import { describe, it, expect } from 'vitest';
import { TacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine.ts';
import type { BattleReplayRecord } from '@/types/battle/pvp.ts';

describe('Tactical Replay Engine & Fog of War', () => {
  const mockReplay: BattleReplayRecord = {
    id: 'test-replay-uuid-1',
    battleCode: 'BTL-T3ST-C0D3' as any,
    seasonId: 'season_1',
    themeId: 'kanto_classic',
    p1: {
      userId: 'user-1',
      username: 'Ash',
      tier: 'maestro',
      elo: 3450,
      team: [
        {
          species: 'pikachu',
          name: 'Pikachu',
          level: 50,
          sprite: '/assets/sprites/pikachu.png',
          revealedMoves: []
        },
        {
          species: 'charizard',
          name: 'Charizard',
          level: 50,
          sprite: '/assets/sprites/charizard.png',
          revealedMoves: []
        }
      ]
    },
    p2: {
      userId: 'user-2',
      username: 'Gary',
      tier: 'diamante',
      elo: 3050,
      team: [
        {
          species: 'blastoise',
          name: 'Blastoise',
          level: 50,
          sprite: '/assets/sprites/blastoise.png',
          revealedMoves: []
        }
      ]
    },
    turnsCount: 3,
    winnerSide: 'p1',
    initialSeed: [1, 2, 3, 4],
    isTop10Archived: true,
    viewsCount: 15,
    createdAt: '2026-09-07T00:00:00Z',
    choiceStream: [
      {
        turnNumber: 1,
        p1Choice: 'move thunderbolt',
        p2Choice: 'move surf',
        logLines: [
          '|turn|1',
          '|-ability|p1a: Pikachu|Static',
          '|move|p1a: Pikachu|Thunderbolt|p2a: Blastoise',
          '|-item|p2a: Blastoise|Leftovers|[from] ability: Pickup',
          '|move|p2a: Blastoise|Surf|p1a: Pikachu'
        ]
      },
      {
        turnNumber: 2,
        p1Choice: 'switch 2',
        p2Choice: 'move icebeam',
        logLines: [
          '|turn|2',
          '|switch|p1a: Charizard|Charizard, L50|100/100',
          '|-item|p1a: Charizard|Heavy-Duty Boots',
          '|move|p2a: Blastoise|Ice Beam|p1a: Charizard'
        ]
      },
      {
        turnNumber: 3,
        p1Choice: 'move solarbeam',
        p2Choice: 'move surf',
        logLines: [
          '|turn|3',
          '|move|p1a: Charizard|Solar Beam|p2a: Blastoise',
          '|faint|p2a: Blastoise',
          '|win|p1'
        ]
      }
    ]
  };

  it('initializes in preview state (turn 0) with completely hidden fog of war', () => {
    const engine = new TacticalReplayEngine(mockReplay);
    expect(engine.getCurrentTurn()).toBe(0);
    expect(engine.getTotalTurns()).toBe(3);
    expect(engine.isOver()).toBe(false);

    const p1Fog = engine.getFogOfWarState('p1');
    expect(p1Fog.pokemonList[0]?.revealedMoves).toEqual([]);
    expect(p1Fog.pokemonList[0]?.revealedItem).toBeUndefined();
    expect(p1Fog.pokemonList[0]?.revealedAbility).toBeUndefined();
    expect(p1Fog.pokemonList[0]?.isFainted).toBe(false);
  });

  it('reveals moves, items, and abilities progressively as turns advance', () => {
    const engine = new TacticalReplayEngine(mockReplay);

    // Advance to Turn 1
    const adv1 = engine.nextTurn();
    expect(adv1).toBe(true);
    expect(engine.getCurrentTurn()).toBe(1);

    const p1FogT1 = engine.getFogOfWarState('p1');
    expect(p1FogT1.pokemonList[0]?.revealedMoves).toContain('Thunderbolt');
    expect(p1FogT1.pokemonList[0]?.revealedAbility).toBe('Static');

    const p2FogT1 = engine.getFogOfWarState('p2');
    expect(p2FogT1.pokemonList[0]?.revealedMoves).toContain('Surf');
    expect(p2FogT1.pokemonList[0]?.revealedItem).toBe('Leftovers');

    // Advance to Turn 2 (Switch + new item)
    const adv2 = engine.nextTurn();
    expect(adv2).toBe(true);
    expect(engine.getCurrentTurn()).toBe(2);

    const p1FogT2 = engine.getFogOfWarState('p1');
    expect(p1FogT2.activePokemon?.name).toBe('Charizard');
    expect(p1FogT2.pokemonList[1]?.revealedItem).toBe('Heavy-Duty Boots');

    // Advance to Turn 3 (Final turn + Faint)
    const adv3 = engine.nextTurn();
    expect(adv3).toBe(true);
    expect(engine.getCurrentTurn()).toBe(3);
    expect(engine.isOver()).toBe(true);

    const p2FogT3 = engine.getFogOfWarState('p2');
    expect(p2FogT3.pokemonList[0]?.isFainted).toBe(true);
    expect(engine.getWinnerSide()).toBe('p1');

    // Attempting nextTurn at end returns false
    expect(engine.nextTurn()).toBe(false);
  });

  it('supports jumping to specific turn and restart', () => {
    const engine = new TacticalReplayEngine(mockReplay);
    engine.jumpToTurn(2);
    expect(engine.getCurrentTurn()).toBe(2);

    const p1Fog = engine.getFogOfWarState('p1');
    expect(p1Fog.pokemonList[0]?.revealedMoves).toContain('Thunderbolt');

    engine.restart();
    expect(engine.getCurrentTurn()).toBe(0);
    const p1FogRestart = engine.getFogOfWarState('p1');
    expect(p1FogRestart.pokemonList[0]?.revealedMoves).toEqual([]);
  });
});
