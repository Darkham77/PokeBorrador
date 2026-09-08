import { describe, it, expect } from 'vitest'
import { TacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine.ts'
import type { BattleReplayRecord } from '@/types/battle/pvp.ts'

describe('TacticalReplayEngine Fog-of-War Resilience', () => {
  it('handles pokemon without explicit name or with speciesId gracefully without throwing TypeError', () => {
    const mockReplay: Partial<BattleReplayRecord> = {
      id: 'sim_replay_001',
      battleCode: 'BTL-TEST-2026' as any,
      seasonId: 'season_1',
      themeId: 'kanto_classic' as any,
      p1: {
        userId: 'u_p1',
        username: 'Player1',
        tier: 'maestro' as any,
        elo: 2450,
        team: [
          {
            speciesId: 'pikachu',
            level: 50,
            revealedMoves: ['thunderbolt'],
            revealedAbility: 'static'
          } as any
        ]
      },
      p2: {
        userId: 'u_p2',
        username: 'Player2',
        tier: 'diamante' as any,
        elo: 2380,
        team: [
          {
            speciesId: 'eevee',
            level: 50,
            revealedMoves: ['quickattack']
          } as any
        ]
      },
      turnsCount: 2,
      winnerSide: 'p1',
      choiceStream: [
        {
          turnNumber: 1,
          p1Choice: 'move 1',
          p2Choice: 'move 1',
          logLines: [
            '|move|p1a: Pikachu|Thunderbolt|p2a: Eevee',
            '|-damage|p2a: Eevee|40/100'
          ]
        }
      ],
      initialSeed: [1, 2, 3, 4],
      isTop10Archived: true,
      viewsCount: 0,
      createdAt: '2026-09-08T00:00:00Z'
    }

    const engine = new TacticalReplayEngine(mockReplay as BattleReplayRecord)
    const p1State = engine.getFogOfWarState('p1')

    expect(p1State).toBeDefined()
    expect(p1State.pokemonList.length).toBe(1)
    expect(p1State.pokemonList[0]!.name).toBe('pikachu')
  })
})
