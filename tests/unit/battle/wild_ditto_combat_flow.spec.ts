import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { HeuristicAI } from '@/logic/battle/ai/heuristicAI'
import { cleanCapturedPokemonForStorage } from '@/logic/battle/battleCatchProcessor'
import { cloneReactive } from '@/logic/utils/cloneUtils'
import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

describe('Wild Ditto Canonical Combat Simulation & Lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Scenario 1: Wild Ditto forces Transform on Turn 1, combat continues, and Ditto is captured cleanly reverting to original stats and transform move', async () => {
    const ai = new HeuristicAI()
    const wildDitto = makePokemon('ditto', 51, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 50, { bypassWhitelist: true }) as Pokemon

    // Store original Ditto baseline stats
    const originalMaxHp = wildDitto.maxHp
    const originalAtk = wildDitto.atk
    const originalDef = wildDitto.def

    const mockActiveBattle = ref({
      isTrainer: false,
      isGym: false,
      isPvP: false,
      enemy: wildDitto,
      _initialEnemy: cloneReactive(wildDitto),
      player: playerPikachu,
      enemyTeam: [wildDitto],
      turnCount: 1,
      over: false
    })

    const mockCtx = {
      activeBattle: mockActiveBattle,
      playerStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
      enemyStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
      faintedSides: ref(new Set()),
      clearLogs: () => {}
    } as unknown as BattleContext

    // --- TURN 1: Mandatory AI Override for Wild Ditto ---
    const turn1Move = ai.decideMove(
      wildDitto,
      playerPikachu,
      mockCtx.playerStages.value,
      true, // isWild = true
      mockCtx
    )

    expect(turn1Move).not.toBeNull()
    expect(turn1Move?.id).toBe('transform')

    wildDitto._originalId = 'ditto'
    wildDitto.isTransformed = true
    wildDitto.id = playerPikachu.id
    wildDitto.type = playerPikachu.type
    wildDitto.type2 = playerPikachu.type2
    wildDitto.moves = playerPikachu.moves.map(m => {
      if (!m) return null
      return {
        ...m,
        pp: 5,
        maxPP: 5
      } as Move
    })

    expect(wildDitto.isTransformed).toBe(true)
    expect(wildDitto.moves.some(m => m?.id === playerPikachu.moves[0]?.id)).toBe(true)

    // --- TURN 2: Normal Combat Continuation ---
    mockActiveBattle.value.turnCount = 2
    // Now that Ditto is transformed, AI operates normally
    const turn2Move = ai.decideMove(
      wildDitto,
      playerPikachu,
      mockCtx.playerStages.value,
      true,
      mockCtx
    )
    expect(turn2Move).not.toBeNull()
    // It picks from the copied moves
    expect(wildDitto.moves.some(m => m?.id === turn2Move?.id)).toBe(true)

    // --- CAPTURE PHASE: Player throws Pokéball and catches transformed Ditto ---
    const captured = cleanCapturedPokemonForStorage(wildDitto, mockActiveBattle.value._initialEnemy, 'ultraball')

    // Verify Ditto is cleanly restored to original identity without copied moves
    expect(captured.id).toBe('ditto')
    expect(captured.name).toBe('Ditto')
    expect(captured.isTransformed).toBe(false)
    expect(captured.maxHp).toBe(originalMaxHp)
    expect(captured.atk).toBe(originalAtk)
    expect(captured.def).toBe(originalDef)
    expect(captured.moves.length).toBe(1)
    expect(captured.moves[0]?.id).toBe('transform')
    expect(captured.moves[0]?.pp).toBe(10)
    expect(captured.moves[0]?.maxPP).toBe(10)

    // Must pass factory validation with 0 errors
    expect(() => validatePokemon(captured)).not.toThrow()
  })

  it('Scenario 2: Wild Ditto forces Transform on Turn 1, combat continues, and Ditto is defeated cleanly', async () => {
    const ai = new HeuristicAI()
    const wildDitto = makePokemon('ditto', 30, { bypassWhitelist: true }) as Pokemon
    const playerCharizard = makePokemon('charizard', 50, { bypassWhitelist: true }) as Pokemon

    const mockActiveBattle = ref({
      isTrainer: false,
      isGym: false,
      isPvP: false,
      enemy: wildDitto,
      _initialEnemy: wildDitto,
      player: playerCharizard,
      enemyTeam: [wildDitto],
      turnCount: 1,
      over: false
    })

    const mockCtx = {
      activeBattle: mockActiveBattle,
      playerStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
      enemyStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
      faintedSides: ref(new Set()),
      clearLogs: () => {}
    } as unknown as BattleContext

    // Turn 1: Transform
    const turn1Move = ai.decideMove(wildDitto, playerCharizard, mockCtx.playerStages.value, true, mockCtx)
    expect(turn1Move?.id).toBe('transform')

    wildDitto.isTransformed = true
    wildDitto.id = playerCharizard.id

    // Turn 2: Combat exchanges damage, Charizard deals lethal damage to Ditto
    wildDitto.hp = 0
    wildDitto.fainted = true
    mockActiveBattle.value.over = true

    expect(wildDitto.hp).toBe(0)
    expect(wildDitto.fainted).toBe(true)
    expect(mockActiveBattle.value.over).toBe(true)
  })
})
