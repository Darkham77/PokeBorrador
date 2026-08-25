import { describe, it, expect } from 'vitest'
import { syncActiveMovesFromRequest } from '@/stores/battle/battleMoveSync.ts'
import type { BattleState } from '@/types/battle/battle'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { buildAttackTimeline } from '@/components/battle/helpers/combatantActionAnims.ts'

describe('Battle Move Sync & Animation Isolation', () => {
  it('bypasses move synchronization when request belongs to a different Pokémon UID (preventing cross-contamination)', () => {
    const gengarOriginalMoves: Move[] = [
      { id: 'shadowball', name: 'Bola Sombra', pp: 15, maxPP: 15, type: 'ghost', cat: 'special' },
      { id: 'sludgebomb', name: 'Bomba Lodo', pp: 10, maxPP: 10, type: 'poison', cat: 'special' }
    ]

    const gengarMon: Pokemon = {
      uid: 'gengar-uid-123',
      id: 'gengar',
      name: 'Gengar',
      hp: 148,
      maxHp: 148,
      level: 50,
      moves: [...gengarOriginalMoves],
      ability: 'levitate',
      nature: 'timid'
    } as unknown as Pokemon

    // Simulated stale request that still references Eevee
    const staleEeveeRequest = {
      active: [
        {
          moves: [
            { id: 'copycat', move: 'Copycat', pp: 20, maxpp: 20, disabled: false },
            { id: 'batonpass', move: 'Baton Pass', pp: 40, maxpp: 40, disabled: false },
            { id: 'doubleedge', move: 'Double-Edge', pp: 15, maxpp: 15, disabled: false },
            { id: 'lastresort', move: 'Last Resort', pp: 5, maxpp: 5, disabled: false }
          ]
        }
      ],
      side: {
        pokemon: [
          { ident: 'p1a: Eevee', uid: 'eevee-uid-999', active: true },
          { ident: 'p1: Gengar', uid: 'gengar-uid-123', active: false }
        ]
      }
    }

    const battleState: Partial<BattleState> = {
      player: gengarMon,
      playerRequest: staleEeveeRequest as unknown as BattleState['playerRequest']
    }

    // Attempt to sync moves from the stale request
    syncActiveMovesFromRequest(battleState as BattleState, 'player')

    // Gengar's moves MUST remain untouched
    expect(gengarMon.moves).toHaveLength(2)
    expect(gengarMon.moves[0]?.id).toBe('shadowball')
    expect(gengarMon.moves[1]?.id).toBe('sludgebomb')
  })

  it('updates move PP and disabled state correctly when request UID matches active Pokémon UID', () => {
    const gengarMon: Pokemon = {
      uid: 'gengar-uid-123',
      id: 'gengar',
      name: 'Gengar',
      hp: 148,
      maxHp: 148,
      level: 50,
      moves: [
        { id: 'shadowball', name: 'Bola Sombra', pp: 15, maxPP: 15, type: 'ghost', cat: 'special' }
      ],
      ability: 'levitate',
      nature: 'timid'
    } as unknown as Pokemon

    const freshGengarRequest = {
      active: [
        {
          moves: [
            { id: 'shadowball', move: 'Shadow Ball', pp: 12, maxpp: 15, disabled: false }
          ]
        }
      ],
      side: {
        pokemon: [
          { ident: 'p1a: Gengar', uid: 'gengar-uid-123', active: true }
        ]
      }
    }

    const battleState: Partial<BattleState> = {
      player: gengarMon,
      playerRequest: freshGengarRequest as unknown as BattleState['playerRequest']
    }

    syncActiveMovesFromRequest(battleState as BattleState, 'player')

    expect(gengarMon.moves[0]?.pp).toBe(12)
    expect(gengarMon.moves[0]?.id).toBe('shadowball')
  })

  it('triggers self-KO explosion animation for selfdestruct and explosion moves regardless of physical category', () => {
    const dummyEl = document.createElement('div')
    const moveProps = {
      activeMove: {
        id: 'selfdestruct',
        name: 'Autodestrucción',
        cat: 'physical' as const,
        type: 'normal'
      },
      side: 'enemy' as const,
      pokemon: { id: 'snorlax', name: 'Snorlax' } as unknown as Pokemon,
      baseSize: 64,
      position: { x: 0, y: 0 }
    }

    const tl = buildAttackTimeline(dummyEl, null, moveProps as any)
    expect(tl).not.toBeNull()
  })

  it('rejects saving a Pokémon with illegal moves from another species, preventing database corruption', async () => {
    const { validatePokemon } = await import('@/logic/pokemon/pokemonFactory.ts')

    const corruptedMon = {
      uid: 'gengar-corrupted-uid',
      id: 'gengar',
      species: 'gengar',
      name: 'Gengar',
      type: 'ghost',
      hp: 148,
      maxHp: 148,
      level: 50,
      moves: [
        { id: 'lastresort', name: 'Última Baza', pp: 5, maxPP: 5, type: 'normal', cat: 'physical' }
      ],
      ability: 'cursedbody',
      nature: 'timid',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    } as unknown as Pokemon

    expect(() => validatePokemon(corruptedMon)).toThrow('Movimiento ilegal')
  })

  it('ensures battle switch mode ignores residual box activeTags and displays team bench members', async () => {
    const { filterAndSortPokemon } = await import('@/logic/pokemon/pokemonSelectionFilter.ts')

    const sourceList = [
      {
        pokemon: { uid: 'p-active', id: 'gengar', name: 'Gengar', hp: 0, maxHp: 100 } as Pokemon,
        _source: 'team' as const,
        index: 0
      },
      {
        pokemon: { uid: 'p-bench-1', id: 'vaporeon', name: 'Vaporeon', hp: 150, maxHp: 150 } as Pokemon,
        _source: 'team' as const,
        index: 1
      },
      {
        pokemon: { uid: 'p-bench-2', id: 'snorlax', name: 'Snorlax', hp: 200, maxHp: 200 } as Pokemon,
        _source: 'team' as const,
        index: 2
      }
    ]

    // In battle switch mode with clean initial filters, all valid bench members are returned
    const result = filterAndSortPokemon(sourceList, {
      isBattleSwitch: true,
      activePokemonUid: 'p-active',
      activeTags: [],
      searchQuery: '',
      sortBy: 'index',
      sortOrder: 'asc'
    })

    expect(result).toHaveLength(2)
    expect(result[0]?.pokemon.uid).toBe('p-bench-1')
    expect(result[1]?.pokemon.uid).toBe('p-bench-2')
  })

  it('NEVER truncates a Pokémon moveset when Showdown sends a 1-move lockedmove choice (e.g. Outrage/Enfado)', () => {
    const rayquazaOriginalMoves: Move[] = [
      { id: 'outrage', name: 'Enfado', pp: 16, maxPP: 16, type: 'dragon', cat: 'physical' },
      { id: 'extremespeed', name: 'Velocidad Extrema', pp: 5, maxPP: 5, type: 'normal', cat: 'physical' },
      { id: 'dragonclaw', name: 'Garra Dragón', pp: 15, maxPP: 15, type: 'dragon', cat: 'physical' },
      { id: 'earthquake', name: 'Terremoto', pp: 10, maxPP: 10, type: 'ground', cat: 'physical' }
    ]

    const rayquazaMon: Pokemon = {
      uid: 'rayquaza-uid-456',
      id: 'rayquaza',
      name: 'Rayquaza',
      hp: 190,
      maxHp: 190,
      level: 55,
      moves: [...rayquazaOriginalMoves],
      ability: 'airlock',
      nature: 'adamant'
    } as unknown as Pokemon

    // Showdown sends single locked move for Outrage turn 2
    const lockedOutrageRequest = {
      active: [
        {
          moves: [
            { id: 'outrage', move: 'Outrage', pp: 15, maxpp: 16, disabled: false }
          ]
        }
      ],
      side: {
        pokemon: [
          { ident: 'p1a: Rayquaza', uid: 'rayquaza-uid-456', active: true }
        ]
      }
    }

    const battleState: Partial<BattleState> = {
      player: rayquazaMon,
      playerRequest: lockedOutrageRequest as unknown as BattleState['playerRequest']
    }

    // 1. Sync from locked move request
    syncActiveMovesFromRequest(battleState as BattleState, 'player')

    // Rayquaza MUST retain all 4 moves!
    expect(rayquazaMon.moves).toHaveLength(4)
    expect(rayquazaMon.moves.map(m => m?.id)).toEqual(['outrage', 'extremespeed', 'dragonclaw', 'earthquake'])
    
    // Outrage should have updated PP and be enabled
    expect(rayquazaMon.moves[0]?.pp).toBe(15)
    expect(rayquazaMon.moves[0]?.disabled).toBe(false)

    // The other 3 moves MUST be marked disabled for this locked turn, but NOT deleted
    expect(rayquazaMon.moves[1]?.disabled).toBe(true)
    expect(rayquazaMon.moves[2]?.disabled).toBe(true)
    expect(rayquazaMon.moves[3]?.disabled).toBe(true)

    // 2. When lock ends and full 4-move request arrives, all 4 moves are re-enabled
    const unlockedRequest = {
      active: [
        {
          moves: [
            { id: 'outrage', move: 'Outrage', pp: 15, maxpp: 16, disabled: false },
            { id: 'extremespeed', move: 'Extreme Speed', pp: 5, maxpp: 5, disabled: false },
            { id: 'dragonclaw', move: 'Dragon Claw', pp: 15, maxpp: 15, disabled: false },
            { id: 'earthquake', move: 'Earthquake', pp: 10, maxpp: 10, disabled: false }
          ]
        }
      ],
      side: {
        pokemon: [
          { ident: 'p1a: Rayquaza', uid: 'rayquaza-uid-456', active: true }
        ]
      }
    }

    battleState.playerRequest = unlockedRequest as unknown as BattleState['playerRequest']
    syncActiveMovesFromRequest(battleState as BattleState, 'player')

    expect(rayquazaMon.moves).toHaveLength(4)
    expect(rayquazaMon.moves.every(m => m?.disabled === false)).toBe(true)
  })
})
