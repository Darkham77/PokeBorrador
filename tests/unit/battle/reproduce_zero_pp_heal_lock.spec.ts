import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useShopStore } from '@/stores/inventory/shop.ts'
import { syncActiveMovesFromRequest } from '@/stores/battle/battleMoveSync.ts'
import {
  type ShowdownPlayerRequest,
  isBattleMoveDisabled
} from '@/components/battle/battleMoveSlotHelpers.ts'
import type { BattleState } from '@/types/battle/battle'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

describe('Bug Reproduction: 0 PP move healed at Pokemon Center remains disabled on Turn 1 until switched', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('demonstrates that healing at Pokemon Center clears disabled flag and allows attacking on Turn 1 without switching', () => {
    const gameStore = useGameStore()
    const shopStore = useShopStore()

    // 1. Setup Gengar with Shadow Punch (32/32 PP)
    const shadowPunch: Move = {
      id: 'shadowpunch',
      name: 'Puño Sombra',
      type: 'ghost',
      cat: 'physical',
      pp: 32,
      maxPP: 32,
      disabled: false
    }

    const gengar: Pokemon = {
      uid: 'gengar-user-repro',
      id: 'gengar',
      name: 'Gengar',
      level: 60,
      hp: 162,
      maxHp: 162,
      status: '',
      moves: [shadowPunch]
    } as unknown as Pokemon

    gameStore.state.team = [gengar]
    gameStore.state.money = 10000

    // 2. Battle 1: Shadow Punch exhausts all PP (0 PP)
    // Showdown emits a request with Shadow Punch disabled due to 0 PP
    const battle1State: Partial<BattleState> = {
      player: gengar,
      playerRequest: {
        active: [
          {
            moves: [
              { id: 'shadowpunch', move: 'Shadow Punch', pp: 0, maxpp: 32, disabled: true }
            ]
          }
        ],
        side: {
          pokemon: [
            { ident: 'p1a: Gengar', uid: 'gengar-user-repro', active: true }
          ]
        }
      } as unknown as BattleState['playerRequest']
    }

    // Sync moves in battle
    syncActiveMovesFromRequest(battle1State as BattleState, 'player')

    // Verify move is now 0 PP and disabled: true
    expect(gengar.moves[0]?.pp).toBe(0)
    expect(gengar.moves[0]?.disabled).toBe(true)

    // 3. Battle 1 finishes, player leaves combat
    // Gengar in gameStore.state.team holds the exhausted move
    expect(gameStore.state.team[0]?.moves[0]?.pp).toBe(0)
    expect(gameStore.state.team[0]?.moves[0]?.disabled).toBe(true)

    // 4. Player visits Pokemon Center and heals the entire team
    shopStore.healAllPokemon(0)

    // PP was restored to 32
    expect(gameStore.state.team[0]?.moves[0]?.pp).toBe(32)

    // BUG CHECK 1: The move's `disabled` property MUST be reset to false upon healing!
    // (If this fails, the move still has disabled=true despite having full PP)
    expect(gameStore.state.team[0]?.moves[0]?.disabled).toBe(false)
  })

  it('demonstrates that isBattleMoveDisabled incorrectly disables move when local disabled=true even if Showdown request has disabled=false', () => {
    const shadowPunchWithStaleDisabled: Move = {
      id: 'shadowpunch',
      name: 'Puño Sombra',
      type: 'ghost',
      cat: 'physical',
      pp: 32,
      maxPP: 32,
      disabled: true // Stale disabled flag from prior 0 PP before healing
    }

    const gengar: Pokemon = {
      uid: 'gengar-user-repro',
      id: 'gengar',
      name: 'Gengar',
      level: 60,
      hp: 162,
      maxHp: 162,
      status: '',
      moves: [shadowPunchWithStaleDisabled]
    } as unknown as Pokemon

    // Showdown worker explicitly says the move is enabled (disabled: false)
    const freshBattleRequest: ShowdownPlayerRequest = {
      active: [
        {
          moves: [
            { id: 'shadowpunch', disabled: false }
          ]
        }
      ]
    }

    // BUG: Showdown request has absolute authority, so isBattleMoveDisabled SHOULD return false.
    // However, because of line 48 in battleMoveSlotHelpers.ts checking `if (move.disabled === true) return true`
    // before consulting the Showdown request, it returns true!
    const isMoveDisabled = isBattleMoveDisabled(
      shadowPunchWithStaleDisabled,
      false, // isProcessing
      gengar,
      freshBattleRequest
    )

    expect(isMoveDisabled).toBe(false)
  })

  it('confirms the user observation: switching out and back in previously unlocked the move via Showdown request sync', () => {
    const gameStore = useGameStore()

    // Setup Gengar with stale disabled: true but healed PP: 32
    const shadowPunch: Move = {
      id: 'shadowpunch',
      name: 'Puño Sombra',
      type: 'ghost',
      cat: 'physical',
      pp: 32,
      maxPP: 32,
      disabled: true // Stale disabled flag from prior 0 PP before healing
    }

    const dragonite: Pokemon = {
      uid: 'dragonite-bench',
      id: 'dragonite',
      name: 'Dragonite',
      level: 86,
      hp: 279,
      maxHp: 279,
      status: '',
      moves: []
    } as unknown as Pokemon

    const gengar: Pokemon = {
      uid: 'gengar-user-repro',
      id: 'gengar',
      name: 'Gengar',
      level: 60,
      hp: 162,
      maxHp: 162,
      status: '',
      moves: [shadowPunch]
    } as unknown as Pokemon

    gameStore.state.team = [gengar, dragonite]

    const battleState: Partial<BattleState> = {
      player: gengar,
      playerRequest: undefined
    }

    // On Turn 1, before any switch, Gengar is active and has stale disabled: true
    expect(gengar.moves[0]?.disabled).toBe(true)

    // User switches to Dragonite:
    battleState.player = dragonite

    // User switches back to Gengar:
    battleState.player = gengar

    // Showdown sends fresh request for Gengar with disabled: false
    battleState.playerRequest = {
      active: [
        {
          moves: [
            { id: 'shadowpunch', move: 'Shadow Punch', pp: 32, maxpp: 32, disabled: false }
          ]
        }
      ],
      side: {
        pokemon: [
          { ident: 'p1a: Gengar', uid: 'gengar-user-repro', active: true },
          { ident: 'p1: Dragonite', uid: 'dragonite-bench', active: false }
        ]
      }
    } as unknown as BattleState['playerRequest']

    // When Gengar is active during switch-in, syncActiveMovesFromRequest runs
    syncActiveMovesFromRequest(battleState as BattleState, 'player')

    // This cleared gengar.moves[0].disabled to false!
    expect(gengar.moves[0]?.disabled).toBe(false)
  })
})
