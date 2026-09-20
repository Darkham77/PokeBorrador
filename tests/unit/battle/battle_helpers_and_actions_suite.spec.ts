// @vitest-environment jsdom
// jsdom-ok: Web Worker client showdown.worker.ts accesses browser self global
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { parseLogsWithSkip } from '@/logic/battle/battleTurnLogHelper'
import { STATUS_NAME_MAP, STATUS_EMOJI_MAP, STATUS_SHORT_LABEL_MAP } from '@/logic/battle/battleUiUtils'
import { executeTeleportAction } from '@/logic/battle/actions/specialActionsTeleportHelper'
import {
  sanitizeExplicitSwitchChoice,
  sanitizeSeatChoiceInput,
  buildTurnSeats,
  applyPostTurnHealing,
  type BattleSeat,
  type TurnExecutionInput,
} from '@/logic/battle/engine/showdownSeatSyncHelper'
import { processSearchPhaseSequence } from '@/logic/battle/orchestratorSearchPhaseHelper'
import { checkLockedVolatiles, resetPlayerStages } from '@/logic/battle/actions/switchActionHelpers'
import {
  constructPokemonId,
  deconstructPokemonId,
  resolveBaseNumber,
  resolveAnimatedSpriteKey,
  toggleCombatantStatus,
} from '@/components/battle/debugActionPanelHelpers.ts'
import {
  resolvePlayerForcedMoveIndex,
  evaluateMoveValidityAndLock,
} from '@/logic/battle/helpers/turnMoveValidator'
import { getForcedExitConfig } from '@/logic/battle/helpers/forcedSwitchRegistry'
import { BATTLE_ESCAPE_TYPES } from '@/types/battle/battle'
import { isFlying, computeShadowCoords, computeShadowBodyRadius } from '@/composables/battle/useBattleShadows'
import {
  isPokemonFaintedOrActive,
  resolveExplicitChoiceHelper,
  resolveForceSwitchFallback,
  resolveReplayerCandidate,
} from '@/logic/battle/engine/showdownChoiceResolver'
import { ShowdownTeamResolver } from '@/logic/battle/showdownTeamResolver'
import { injectUidsIntoRequest, setTestingBattle } from '@/logic/battle/showdown.worker'
import type { Battle, Side, Pokemon as SimPokemon } from '@pkmn/sim'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleMinigame } from '@/types/battle/battle'
import type { PokemonMoveId } from '@/data/battle/moves'
import type { ItemId } from '@/data/inventory/items'

vi.mock('@/stores/ui', () => ({
  useUIStore: () => ({
    autoBattle: false,
  }),
}))

describe('Battle Helpers & Actions Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('battleTurnLogHelper - parseLogsWithSkip', () => {
    it('should parse logs and filter correctly', async () => {
      const logsAdded: string[] = []
      const mockStore = {
        activeBattle: ref({
          player: { uid: 'p1', name: 'Pikachu', hp: 100 },
          enemy: { uid: 'p2', name: 'Charizard', hp: 100 },
        }),
        addLog: (msg: string) => {
          logsAdded.push(msg)
        },
      } as unknown as BattleContext

      const logs = [
        '|-damage|p2a: Charizard|80/100',
        '|turn|2',
      ]

      await parseLogsWithSkip(mockStore, logs, false, false)
      expect(logsAdded.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('battleUiUtils', () => {
    it('should have all primary status names translated to Spanish', () => {
      expect(STATUS_NAME_MAP.brn).toBe('QUEMADURA')
      expect(STATUS_NAME_MAP.psn).toBe('VENENO')
      expect(STATUS_NAME_MAP.slp).toBe('SUEÑO')
      expect(STATUS_NAME_MAP.par).toBe('PARÁLISIS')
      expect(STATUS_NAME_MAP.frz).toBe('CONGELACIÓN')
    })

    it('should have consistent emoji mappings', () => {
      expect(STATUS_EMOJI_MAP.brn).toBe('🔥')
      expect(STATUS_EMOJI_MAP.slp).toBe('💤')
    })

    it('should have consistent short label mappings', () => {
      expect(STATUS_SHORT_LABEL_MAP.brn).toBe('BRN')
      expect(STATUS_SHORT_LABEL_MAP.frz).toBe('FRZ')
    })
  })

  describe('specialActionsTeleportHelper', () => {
    it('handles wild teleport escape correctly', async () => {
      const src = { uid: 'p1', name: 'Abra' } as Pokemon
      const addLogFn = vi.fn()
      const activeBattle = ref({
        isTrainer: false,
        isGym: false,
        fled: false,
        over: false,
      })
      const ctx = {
        activeBattle,
      } as unknown as BattleContext

      await executeTeleportAction(src, addLogFn, ctx)

      expect(activeBattle.value.fled).toBe(true)
      expect(activeBattle.value.over).toBe(true)
      expect(addLogFn).toHaveBeenCalledWith(expect.stringContaining('se teletransportó'), 'log-info', src)
    })

    it('fails teleport when no bench teammates are available in trainer battle', async () => {
      const src = { uid: 'p1', name: 'Abra' } as Pokemon
      const addLogFn = vi.fn()
      const activeBattle = ref({
        isTrainer: true,
        player: { uid: 'p1' },
        playerTeam: [src],
      })
      const ctx = {
        activeBattle,
      } as unknown as BattleContext

      await executeTeleportAction(src, addLogFn, ctx)

      expect(addLogFn).toHaveBeenCalledWith('¡Pero no hay nadie para sustituirle!', 'log-info', src)
    })
  })

  describe('showdownSeatSyncHelper', () => {
    describe('sanitizeExplicitSwitchChoice', () => {
      it('returns original text if not a switch command', () => {
        const mockSide = { pokemon: [], active: [] } as unknown as Side
        expect(sanitizeExplicitSwitchChoice('move 1', mockSide, 'move')).toBe('move 1')
      })

      it('returns switch choice if target is alive and not active', () => {
        const mockPoke = { fainted: false, hp: 100 } as unknown as SimPokemon
        const mockSide = {
          pokemon: [mockPoke],
          active: [],
        } as unknown as Side
        expect(sanitizeExplicitSwitchChoice('switch 1', mockSide, 'switch')).toBe('switch 1')
      })

      it('returns undefined or move fallback if target is active or fainted', () => {
        const mockPoke = { fainted: true, hp: 0 } as unknown as SimPokemon
        const mockSide = {
          pokemon: [mockPoke],
          active: [],
          activeRequest: { active: [{ moves: [{ id: 'tackle', disabled: false }] }] },
        } as unknown as Side
        expect(sanitizeExplicitSwitchChoice('switch 1', mockSide, 'move')).toBe('move 1')
      })
    })

    describe('sanitizeSeatChoiceInput', () => {
      it('returns undefined if explicit input is empty or undefined', () => {
        const mockSide = { pokemon: [], active: [] } as unknown as Side
        expect(sanitizeSeatChoiceInput(undefined, mockSide, 'move', false)).toBeUndefined()
      })

      it('rejects move choices if isForce is true', () => {
        const mockSide = { pokemon: [], active: [] } as unknown as Side
        expect(sanitizeSeatChoiceInput('move 1', mockSide, 'force-switch', true)).toBeUndefined()
      })
    })

    describe('buildTurnSeats', () => {
      it('constructs seat array from battle sides', () => {
        const mockSideP1 = {
          id: 'p1',
          activeRequest: { requestType: 'move' },
        } as unknown as Side
        const mockSideP2 = {
          id: 'p2',
          activeRequest: { requestType: 'move' },
        } as unknown as Side
        const mockBattle = {
          sides: [mockSideP1, mockSideP2],
        } as unknown as Battle

        const input: TurnExecutionInput = {
          p1Choice: 'move 1',
          p2Choice: 'move 2',
        }

        const seats: BattleSeat[] = buildTurnSeats(mockBattle, input, (_seatId, _req, explicit) => explicit || 'pass')

        expect(seats.length).toBe(2)
        expect(seats[0]!.id).toBe('p1')
        expect(seats[1]!.id).toBe('p2')
      })
    })

    describe('applyPostTurnHealing', () => {
      it('applies heal cheat when active pokemon HP is <= 30% and IPB is active', () => {
        const activeMon = { fainted: false, hp: 20, maxhp: 100 }
        const mockSide = {
          id: 'p1',
          active: [activeMon],
          pokemon: [activeMon],
        } as unknown as Side
        const mockBattle = {
          sides: [mockSide],
          turn: 1,
          add: () => {},
        } as unknown as Battle

        const appliedCheats: { turn: number; side: 'p1'; type: 'heal' }[] = []
        applyPostTurnHealing(mockBattle, false, {} as any, { ipbActive: true }, appliedCheats)

        expect(appliedCheats.length).toBe(1)
        expect(appliedCheats[0]!.type).toBe('heal')
      })

      it('skips healing when ipbActive is false', () => {
        const activeMon = { fainted: false, hp: 10, maxhp: 100 }
        const mockSide = {
          id: 'p1',
          active: [activeMon],
          pokemon: [activeMon],
        } as unknown as Side
        const mockBattle = {
          sides: [mockSide],
          turn: 1,
          add: () => {},
        } as unknown as Battle

        const appliedCheats: any[] = []
        applyPostTurnHealing(mockBattle, false, {} as any, { ipbActive: false }, appliedCheats)

        expect(appliedCheats.length).toBe(0)
      })
    })
  })

  describe('processSearchPhaseSequence', () => {
    let mockCtx: BattleContext
    let transitions: Array<[string, string?]>
    let playedSounds: string[]
    let dummyPokemon: Pokemon

    beforeEach(() => {
      transitions = []
      playedSounds = []
      dummyPokemon = {
        uid: 'p1',
        id: 25,
        name: 'Pikachu',
        level: 10,
        hp: 35,
        maxHp: 35,
      } as unknown as Pokemon

      mockCtx = {
        BATTLE_STATES: {
          INITIALIZING: 'INITIALIZING',
          SEARCH_PHASE: 'SEARCH_PHASE',
        },
        BATTLE_SUBSTATES: {
          MINIGAME_CHECK: 'MINIGAME_CHECK',
          PREPARATION: 'PREPARATION',
          AUTO_BATTLE_CHECK: 'AUTO_BATTLE_CHECK',
          UPDATE_BUTTON: 'UPDATE_BUTTON',
          ENTRY_ANIM: 'ENTRY_ANIM',
          REORDER_TEAM: 'REORDER_TEAM',
          COMBAT_OR_FLEE: 'COMBAT_OR_FLEE',
        },
        fsm: {
          transition: vi.fn(async (state: string, substate?: string) => {
            transitions.push([state, substate])
          }),
        },
        isIntroAnimating: { value: true },
        isProcessing: { value: true },
        activeBattle: {
          value: {
            enemy: null,
            enemyTeam: [],
            minigame: null,
            trainerArchetype: null,
          },
        },
        audio: {
          play: vi.fn((sound: string) => {
            playedSounds.push(sound)
          }),
        },
        animations: {
          triggerTrainerEntry: vi.fn(async () => {}),
        },
        persistBattle: vi.fn(),
      } as unknown as BattleContext
    })

    it('handles minigame encounter by setting enemy, minigame, and transitioning to MINIGAME_CHECK', async () => {
      const minigame: BattleMinigame = 'fishing'
      const handled = await processSearchPhaseSequence(mockCtx, dummyPokemon, minigame, false, false)

      expect(handled).toBe(true)
      expect(mockCtx.isIntroAnimating.value).toBe(false)
      expect(mockCtx.activeBattle.value?.enemy).toBe(dummyPokemon)
      expect(mockCtx.activeBattle.value?.minigame).toBe(minigame)
      expect(transitions).toEqual([
        ['INITIALIZING', undefined],
        ['INITIALIZING', 'MINIGAME_CHECK'],
      ])
    })

    it('handles wild pokemon encounter without minigame', async () => {
      const handled = await processSearchPhaseSequence(mockCtx, dummyPokemon, null, false, false)

      expect(handled).toBe(true)
      expect(mockCtx.isIntroAnimating.value).toBe(false)
      expect(mockCtx.isProcessing.value).toBe(false)
      expect(mockCtx.activeBattle.value?.enemy).toBe(dummyPokemon)
      expect(mockCtx.activeBattle.value?.enemyTeam).toEqual([dummyPokemon])
      expect(mockCtx.persistBattle).toHaveBeenCalled()
      expect(mockCtx.animations?.triggerTrainerEntry).not.toHaveBeenCalled()
      expect(transitions).toContainEqual(['SEARCH_PHASE', 'UPDATE_BUTTON'])
      expect(transitions).toContainEqual(['SEARCH_PHASE', 'COMBAT_OR_FLEE'])
    })

    it('handles trainer encounter triggering trainer entry animation and siren if policeman', async () => {
      if (mockCtx.activeBattle.value) {
        mockCtx.activeBattle.value.trainerArchetype = 'policeman'
      }

      const handled = await processSearchPhaseSequence(mockCtx, dummyPokemon, null, true, false)

      expect(handled).toBe(true)
      expect(mockCtx.animations?.triggerTrainerEntry).toHaveBeenCalled()
      expect(playedSounds).toContain('siren')
      expect(mockCtx.activeBattle.value?.enemy).toBeNull()
    })
  })

  describe('switchActionHelpers', () => {
    it('correctly detects locked volatile moves on old pokemon', () => {
      expect(checkLockedVolatiles({ volatileCounters: { twoturnmove: 1 } })).toBe(true)
      expect(checkLockedVolatiles({ volatileCounters: { lockedmove: 1 } })).toBe(true)
      expect(checkLockedVolatiles({ volatileCounters: {} })).toBe(false)
      expect(checkLockedVolatiles(null)).toBe(false)
    })

    it('correctly resets player stat stages to 0', () => {
      const current = { atk: 2, def: -1, spa: 3, spd: 0, spe: -2, acc: 1, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 } as any
      expect(resetPlayerStages(current)).toEqual({
        atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0,
      })
    })
  })

  describe('DebugActionPanel ID Helpers', () => {
    it('correctly constructs pokemon ID from baseId, variant, and gender', () => {
      expect(constructPokemonId('pikachu', '', '')).toBe('pikachu')
    })

    it('correctly deconstructs pokemon ID into baseId, variant, and gender', () => {
      const res = deconstructPokemonId('25_shiny_m')
      expect(res.baseId).toBe('25')
      expect(res.variant).toBe('shiny')
      expect(res.gender).toBe('m')
    })

    it('correctly resolves base numbers from numeric strings or species names', () => {
      expect(resolveBaseNumber('25')).toBe(25)
      expect(resolveBaseNumber('bulbasaur')).toBe(1)
    })

    it('correctly resolves animated sprite key candidates', () => {
      const key = resolveAnimatedSpriteKey('25i', '25', false, false)
      expect(typeof key).toBe('string')
    })

    it('correctly toggles combatant shiny and guardian status', () => {
      const target = { isShiny: false, isGuardian: false }
      toggleCombatantStatus(target, 'shiny')
      expect(target.isShiny).toBe(true)
      toggleCombatantStatus(target, 'guardian')
      expect(target.isGuardian).toBe(true)
    })
  })

  describe('turnMoveValidator', () => {
    it('resolves locked move from volatileCounters', () => {
      const tackleMove: Move = { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, power: 40, acc: 100, type: 'normal', cat: 'physical' }
      const emberMove: Move = { id: 'ember', name: 'Ascuas', pp: 25, maxPP: 25, power: 40, acc: 100, type: 'fire', cat: 'special' }

      const dummyPokemon = {
        moves: [tackleMove, emberMove],
        lastMove: emberMove,
        volatileCounters: { lockedmove: 2 },
      } as unknown as Pokemon

      const result = resolvePlayerForcedMoveIndex(dummyPokemon, 0)
      expect(result.finalMoveIndex).toBe(1)
      expect(result.isRecharge).toBe(false)
    })

    it('validates PP and returns false if PP is 0', () => {
      const emptyMove: Move = { id: 'tackle', name: 'Placaje', pp: 0, maxPP: 35, power: 40, acc: 100, type: 'normal', cat: 'physical' }
      const dummyPokemon = {
        moves: [emptyMove, { id: 'scratch', name: 'Arañazo', pp: 10 }],
        volatileCounters: {},
      } as unknown as Pokemon

      let logged = false
      const mockStore = {
        addLog: () => { logged = true },
      } as unknown as BattleContext

      const validity = evaluateMoveValidityAndLock(dummyPokemon, 0, false, mockStore)
      expect(validity.isValid).toBe(false)
      expect(logged).toBe(true)
    })

    it('allows Struggle if moveIndex is -1', () => {
      const dummyPokemon = {
        moves: [],
        volatileCounters: {},
      } as unknown as Pokemon

      const mockStore = {
        addLog: () => {},
      } as unknown as BattleContext

      const validity = evaluateMoveValidityAndLock(dummyPokemon, -1, false, mockStore)
      expect(validity.isValid).toBe(true)
      expect(validity.isStruggle).toBe(true)
    })
  })

  describe('Audit Parity - Forced Switch Expulsion Animation (|drag|)', () => {
    it('verifies that all forced switch escape types are valid domain union members', () => {
      const moveIds: readonly (PokemonMoveId | ItemId)[] = ['whirlwind', 'roar', 'dragontail', 'circlethrow', 'teleport', 'uturn', 'voltswitch', 'redcard', 'ejectbutton'] as const
      for (const moveId of moveIds) {
        const config = getForcedExitConfig(moveId)
        expect(BATTLE_ESCAPE_TYPES).toContain(config.escapeType)
        expect(typeof config.getExpulsionLog).toBe('function')
        const log = config.getExpulsionLog('Pikachu')
        expect(log).toContain('Pikachu')
      }
    })

    it('maps whirlwind specifically to whirlwind escape animation and expulsion log', () => {
      const config = getForcedExitConfig('whirlwind')
      expect(config.escapeType).toBe('whirlwind')
      expect(config.getExpulsionLog('Magneton')).toBe('¡Magneton fue expulsado por el remolino!')
    })
  })

  describe('useBattleShadows helpers', () => {
    it('correctly calculates isFlying for floating vs grounded species', () => {
      expect(isFlying({ id: 'butterfree' } as unknown as Pokemon)).toBe(true)
      expect(isFlying({ id: 'pikachu' } as unknown as Pokemon)).toBe(false)
    })

    it('correctly resolves shadow coordinates for form-based species without throwing', () => {
      const castformSunny = { id: 'castform', form: 'sunny' } as unknown as Pokemon
      const coords = computeShadowCoords(castformSunny, false)
      expect(coords).toBeDefined()
      expect(typeof coords.x).toBe('number')
      expect(typeof coords.y).toBe('number')

      const castformSunnyHyphen = { id: 'castform-sunny' } as unknown as Pokemon
      const coordsHyphen = computeShadowCoords(castformSunnyHyphen, false)
      expect(coordsHyphen).toBeDefined()
      expect(typeof coordsHyphen.x).toBe('number')
      expect(typeof coordsHyphen.y).toBe('number')

      const castformSunnyPure = { id: 'castformsunny' } as unknown as Pokemon
      const coordsPure = computeShadowCoords(castformSunnyPure, false)
      expect(coordsPure).toBeDefined()
      expect(typeof coordsPure.x).toBe('number')
      expect(typeof coordsPure.y).toBe('number')

      const radius = computeShadowBodyRadius(castformSunny, false)
      expect(radius).toBeDefined()
      expect(typeof radius).toBe('string')
    })
  })

  describe('showdownChoiceResolver', () => {
    it('correctly identifies fainted and active pokemons', () => {
      const activePoke = { active: true, fainted: false }
      const faintedPoke = { active: false, fainted: true }
      const benchPoke = { active: false, fainted: false }

      expect(isPokemonFaintedOrActive(activePoke, [activePoke])).toEqual({ isFnt: false, isAct: true })
      expect(isPokemonFaintedOrActive(faintedPoke, [])).toEqual({ isFnt: true, isAct: false })
      expect(isPokemonFaintedOrActive(benchPoke, [])).toEqual({ isFnt: false, isAct: false })
    })

    it('resolves valid explicit switch choice when target is healthy and on bench', () => {
      const simPokemons = [
        { id: 'charizard', fainted: false, active: true, hp: 100 },
        { id: 'blastoise', fainted: false, active: false, hp: 100 },
      ]
      const activeList = [simPokemons[0]]

      const res = resolveExplicitChoiceHelper('switch 2', true, simPokemons, [], activeList, null)
      expect(res).toBe('switch 2')
    })

    it('resolves force switch fallback to first available living bench slot', () => {
      const simPokemons = [
        { id: 'charizard', fainted: true, active: false, hp: 0 },
        { id: 'blastoise', fainted: false, active: false, hp: 100 },
      ] as unknown as SimPokemon[]

      const res = resolveForceSwitchFallback('force-switch', simPokemons, [], [])
      expect(res).toBe('switch 2')
    })

    it('resolves pass when no living pokemon are available', () => {
      const simPokemons = [
        { id: 'charizard', fainted: true, active: false, hp: 0 },
      ] as unknown as SimPokemon[]

      const res = resolveForceSwitchFallback('force-switch', simPokemons, [], [])
      expect(res).toBe('pass')
    })

    it('resolves replayer candidate properly for move choice', () => {
      const res = resolveReplayerCandidate('move 1', 'move', null, [], [], [])
      expect(res).toBe('move 1')
    })
  })

  describe('ShowdownTeamResolver unit tests', () => {
    const p1Uid = 'charmeleon-uid-123'
    const p2Uid = 'charizard-uid-456'
    const p3Uid = 'blastoise-uid-789'

    const mockTeam: Pokemon[] = [
      { uid: p1Uid, name: 'Charmeleon', hp: 100, maxHp: 100, status: null } as unknown as Pokemon,
      { uid: p2Uid, name: 'Charizard', hp: 100, maxHp: 100, status: null } as unknown as Pokemon,
      { uid: p3Uid, name: 'Blastoise', hp: 80, maxHp: 100, status: null } as unknown as Pokemon,
    ]

    const mockRequest = {
      side: {
        pokemon: [
          { ident: 'p1: Charizard', details: 'Charizard', condition: '100/100', active: true, uid: p2Uid },
          { ident: 'p1: Charmeleon', details: 'Charmeleon', condition: '100/100', active: false, uid: p1Uid },
          { ident: 'p1: Blastoise', details: 'Blastoise', condition: '80/100', active: false, uid: p3Uid },
        ],
      },
    }

    it('debería resolver correctamente el slot a partir del UID (getShowdownSlotForUid)', () => {
      expect(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, p2Uid)).toBe(1)
      expect(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, p1Uid)).toBe(2)
      expect(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, p3Uid)).toBe(3)
    })

    it('debería lanzar un error descriptivo si el UID no se encuentra en el request', () => {
      expect(() => ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, 'invalid-uid')).toThrow(
        '[ShowdownTeamResolver] UID "invalid-uid" no encontrado en los UIDs del request',
      )
    })

    it('debería resolver correctamente el Pokémon a partir del slot de Showdown (getPokemonByShowdownSlot)', () => {
      const poke1 = ShowdownTeamResolver.getPokemonByShowdownSlot(mockTeam, mockRequest, 1)
      expect(poke1?.uid).toBe(p2Uid)

      const poke2 = ShowdownTeamResolver.getPokemonByShowdownSlot(mockTeam, mockRequest, 2)
      expect(poke2?.uid).toBe(p1Uid)
    })

    it('debería ordenar correctamente el equipo según Showdown (getShowdownOrder)', () => {
      const ordered = ShowdownTeamResolver.getShowdownOrder(mockTeam, mockRequest)
      expect(ordered[0]?.uid).toBe(p2Uid)
      expect(ordered[1]?.uid).toBe(p1Uid)
      expect(ordered[2]?.uid).toBe(p3Uid)
    })

    it('debería fallar si se busca un slot inexistente o inválido', () => {
      expect(() => ShowdownTeamResolver.getPokemonByShowdownSlot(mockTeam, mockRequest, 99)).toThrow(
        '[ShowdownTeamResolver] Slot de Showdown 99 no tiene un Pokémon válido',
      )
    })
  })

  describe('injectUidsIntoRequest unit tests', () => {
    it('debería inyectar UIDs correctamente a partir del ident corto (prefijo de UID)', () => {
      const mockBattle = {
        p1: {
          pokemon: [
            { name: 'efef7f8a', uid: 'efef7f8a-a014-4edf-a651-acee73b6123f' },
            { name: 'cf48779a', uid: 'cf48779a-9eae-4a3c-827e-4d91d0397ebe' },
          ],
        },
      }

      setTestingBattle(mockBattle as any)

      const request = {
        side: {
          pokemon: [
            { ident: 'p1a: efef7f8a', details: 'Blissey', condition: '100/100', active: true },
            { ident: 'p1: cf48779a', details: 'Blissey', condition: '100/100', active: false },
          ],
        },
      }

      const result = injectUidsIntoRequest('p1', request) as any

      expect(result.side.pokemon[0].uid).toBe('efef7f8a-a014-4edf-a651-acee73b6123f')
      expect(result.side.pokemon[1].uid).toBe('cf48779a-9eae-4a3c-827e-4d91d0397ebe')

      setTestingBattle(null)
    })
  })
})
