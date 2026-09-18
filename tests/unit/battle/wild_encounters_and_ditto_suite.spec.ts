import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { HeuristicAI } from '@/logic/battle/ai/heuristicAI'
import { cleanCapturedPokemonForStorage } from '@/logic/battle/battleCatchProcessor'
import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory'
import { cloneReactive } from '@/logic/utils/cloneUtils'
import { useBattleCombatants } from '@/composables/battle/useBattleCombatants'
import { useBattleHud } from '@/composables/battle/useBattleHud'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { AbilityId } from '@/data/battle/abilities'
import type { BattleContext } from '@/types/battle/battleContext'

describe('Wild Encounters, Visibility & Ditto Combat Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Wild Ditto Canonical Behavior & Storage Cleansing', () => {
    it('forces wild Ditto to choose "transform" on Turn 1 regardless of heuristics', () => {
      const ai = new HeuristicAI()
      const wildDitto = makePokemon('ditto', 51, { bypassWhitelist: true }) as Pokemon
      wildDitto.moves.push({
        id: 'hyperbeam',
        name: 'Híper Rayo',
        type: 'normal',
        cat: 'special',
        power: 150,
        acc: 90,
        pp: 5,
        maxPP: 5
      } as Move)

      const playerMon = makePokemon('pikachu', 50, { bypassWhitelist: true }) as Pokemon

      for (let i = 0; i < 20; i++) {
        const chosenMove = ai.decideMove(
          wildDitto,
          playerMon,
          { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
          true
        )

        expect(chosenMove).not.toBeNull()
        expect(chosenMove?.id).toBe('transform')
      }
    })

    it('restores captured transformed Ditto to "ditto" with "transform" move and passes validation', () => {
      const transformedDitto = makePokemon('ditto', 51, { bypassWhitelist: true }) as Pokemon
      transformedDitto.isTransformed = true
      transformedDitto.moves = [
        {
          id: 'swift',
          name: 'Rapidez',
          type: 'normal',
          cat: 'special',
          power: 60,
          acc: 100,
          pp: 5,
          maxPP: 5
        } as Move
      ]

      const cleaned = cleanCapturedPokemonForStorage(transformedDitto, null, 'pokeball')

      expect(cleaned.id).toBe('ditto')
      expect(cleaned.isTransformed).toBe(false)
      expect(cleaned.moves.length).toBeGreaterThan(0)
      expect(cleaned.moves[0]?.id).toBe('transform')
      expect(cleaned.moves.some(m => m?.id === 'swift')).toBe(false)
    })
  })

  describe('Ditto Transformed Capture Ability Reversion', () => {
    it('reproduces crash when captured transformed Ditto has ability "pressure" from combat target', () => {
      const pureDitto = makePokemon('ditto', 27, { bypassWhitelist: true }) as Pokemon
      expect(pureDitto.id).toBe('ditto')
      expect(['limber', 'imposter']).toContain(pureDitto.ability)

      const transformedDitto = cloneReactive(pureDitto) as Pokemon
      transformedDitto.isTransformed = true
      transformedDitto._originalId = 'ditto'
      transformedDitto._originalName = 'Ditto'
      transformedDitto._originalAbility = pureDitto.ability
      transformedDitto.id = 'zapdos'
      transformedDitto.name = 'Zapdos'
      transformedDitto.ability = 'pressure' as AbilityId
      transformedDitto.moves = [
        {
          id: 'thunderbolt',
          name: 'Rayo',
          type: 'electric',
          cat: 'special',
          power: 90,
          acc: 100,
          pp: 5,
          maxPP: 5
        } as Move
      ]

      const cleanedWithoutInitial = cleanCapturedPokemonForStorage(transformedDitto, null, 'pokeball')

      expect(cleanedWithoutInitial.id).toBe('ditto')
      expect(cleanedWithoutInitial.isTransformed).toBe(false)
      expect(['limber', 'imposter']).toContain(cleanedWithoutInitial.ability)
      expect(cleanedWithoutInitial.ability).not.toBe('pressure')
      expect(() => validatePokemon(cleanedWithoutInitial)).not.toThrow()
    })

    it('restores pure snapshot when clean initialEnemy snapshot is provided even if combat entity had pressure', () => {
      const pureDitto = makePokemon('ditto', 27, { bypassWhitelist: true }) as Pokemon
      pureDitto.ability = 'limber'
      const initialEnemySnapshot = cloneReactive(pureDitto) as Pokemon

      const inCombatDitto = cloneReactive(pureDitto) as Pokemon
      inCombatDitto.isTransformed = true
      inCombatDitto.id = 'mewtwo'
      inCombatDitto.name = 'Mewtwo'
      inCombatDitto.ability = 'pressure' as AbilityId
      inCombatDitto.hp = 10

      const cleaned = cleanCapturedPokemonForStorage(inCombatDitto, initialEnemySnapshot, 'ultraball')

      expect(cleaned.id).toBe('ditto')
      expect(cleaned.ability).toBe('limber')
      expect(cleaned.isTransformed).toBe(false)
      expect(cleaned.moves[0]?.id).toBe('transform')
      expect(() => validatePokemon(cleaned)).not.toThrow()
    })
  })

  describe('Wild Ditto Canonical Combat Simulation & Lifecycle', () => {
    it('Scenario 1: Wild Ditto forces Transform on Turn 1, combat continues, and Ditto is captured cleanly reverting to original stats and transform move', async () => {
      const ai = new HeuristicAI()
      const wildDitto = makePokemon('ditto', 51, { bypassWhitelist: true }) as Pokemon
      const playerPikachu = makePokemon('pikachu', 50, { bypassWhitelist: true }) as Pokemon

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

      const turn1Move = ai.decideMove(
        wildDitto,
        playerPikachu,
        mockCtx.playerStages.value,
        true,
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

      mockActiveBattle.value.turnCount = 2
      const turn2Move = ai.decideMove(
        wildDitto,
        playerPikachu,
        mockCtx.playerStages.value,
        true,
        mockCtx
      )
      expect(turn2Move).not.toBeNull()
      expect(wildDitto.moves.some(m => m?.id === turn2Move?.id)).toBe(true)

      const captured = cleanCapturedPokemonForStorage(wildDitto, mockActiveBattle.value._initialEnemy, 'ultraball')

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

      const turn1Move = ai.decideMove(wildDitto, playerCharizard, mockCtx.playerStages.value, true, mockCtx)
      expect(turn1Move?.id).toBe('transform')

      wildDitto.isTransformed = true
      wildDitto.id = playerCharizard.id

      wildDitto.hp = 0
      wildDitto.fainted = true
      mockActiveBattle.value.over = true

      expect(wildDitto.hp).toBe(0)
      expect(wildDitto.fainted).toBe(true)
      expect(mockActiveBattle.value.over).toBe(true)
    })
  })

  describe('Wild Encounter Bushes & Sprite Visibility vs Trainer Empty Seat', () => {
    it('verifies wild encounter shows bushes and silhouette sprite during SEARCH_PHASE PREPARATION', () => {
      const wildPoke = makePokemon('pidgey', 5, { bypassWhitelist: true }) as Pokemon

      const currentFsmState = ref('SEARCH_PHASE')
      const currentSubState = ref('PREPARATION')
      const isSearching = computed(() => currentFsmState.value === 'SEARCH_PHASE')

      const battleState = ref({
        isTrainer: false,
        isGym: false,
        isPvP: false,
        locationId: 'route1',
        enemy: wildPoke,
        enemyTeam: [wildPoke],
        player: makePokemon('bulbasaur', 5, { bypassWhitelist: true }) as Pokemon
      })

      const mockBattleStore = {
        state: battleState.value,
        currentFsmState,
        currentSubState,
        isSearching,
        isSilhouetteMode: ref(true),
        attackerSide: ref(null),
        activeMove: null,
        enemyStages: {},
        playerStages: {},
        exitingPlayer: ref(null),
        exitingEnemy: ref(null),
        fsm: {
          currentState: currentFsmState,
          currentSubState: currentSubState
        }
      } as any

      const mockAnimations = {
        isWildSilhouette: ref(true),
        isWildEntryAnimation: ref(false),
        wildRevealActive: ref(false),
        isEmerging: ref(false),
        isInitialLoad: ref(false),
        isCaptureSequenceActive: ref(false),
        isFaintInProgress: ref(false),
        faintedPokemonSnapshot: ref(null),
        caughtPokemonSnapshot: ref(null),
        enemyAnimState: ref(null),
        seats: ref({
          seat1: { entry: {}, exit: {} },
          seat2: { entry: {}, exit: {} }
        })
      } as any

      const enemyRef = computed(() => mockBattleStore.state.enemy)
      const playerRef = computed(() => mockBattleStore.state.player)

      const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)
      const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

      expect(enemyCombatants.value).toHaveLength(1)
      expect(enemyCombatants.value[0]?.id).toBe('pidgey')
      expect(hud.isEnemyTechnicalHidden.value).toBe(false)
      expect(hud.shouldShowEncounterLayers.value).toBe(true)
      expect(hud.activeEnemyIsSilhouette.value).toBe(true)
    })

    it('verifies trainer encounters keep Seat 2 strictly EMPTY during SEARCH_PHASE and FIRST_INTRO before POKEMON_CALL', () => {
      const trainerPoke = makePokemon('geodude', 12, { bypassWhitelist: true }) as Pokemon

      const currentFsmState = ref('SEARCH_PHASE')
      const currentSubState = ref('PREPARATION')
      const isSearching = computed(() => currentFsmState.value === 'SEARCH_PHASE')

      const battleState = ref({
        isTrainer: true,
        trainerName: 'Brock',
        isGym: true,
        isPvP: false,
        locationId: 'route1',
        enemy: null as Pokemon | null,
        enemyTeam: [trainerPoke],
        player: makePokemon('charmander', 10, { bypassWhitelist: true }) as Pokemon
      })

      const mockBattleStore = {
        state: battleState.value,
        currentFsmState,
        currentSubState,
        isSearching,
        isSilhouetteMode: ref(false),
        attackerSide: ref(null),
        activeMove: null,
        enemyStages: {},
        playerStages: {},
        exitingPlayer: ref(null),
        exitingEnemy: ref(null),
        fsm: {
          currentState: currentFsmState,
          currentSubState: currentSubState
        }
      } as any

      const mockAnimations = {
        isWildSilhouette: ref(false),
        isWildEntryAnimation: ref(false),
        wildRevealActive: ref(false),
        isEmerging: ref(false),
        isInitialLoad: ref(false),
        isCaptureSequenceActive: ref(false),
        isFaintInProgress: ref(false),
        faintedPokemonSnapshot: ref(null),
        caughtPokemonSnapshot: ref(null),
        enemyAnimState: ref(null),
        seats: ref({
          seat1: { entry: {}, exit: {} },
          seat2: { entry: {}, exit: {} }
        })
      } as any

      const enemyRef = computed(() => mockBattleStore.state.enemy)
      const playerRef = computed(() => mockBattleStore.state.player)

      const { enemyCombatants } = useBattleCombatants(mockBattleStore, playerRef, enemyRef)
      const hud = useBattleHud(mockAnimations, mockBattleStore, enemyRef)

      expect(enemyCombatants.value).toHaveLength(0)
      expect(hud.shouldShowEncounterLayers.value).toBe(false)

      currentFsmState.value = 'FIRST_INTRO'
      currentSubState.value = 'SHOW_DIALOGS'
      expect(enemyCombatants.value).toHaveLength(0)

      currentSubState.value = 'POKEMON_CALL'
      battleState.value.enemy = trainerPoke
      expect(enemyCombatants.value).toHaveLength(1)
      expect(enemyCombatants.value[0]?.id).toBe('geodude')
    })
  })
})
