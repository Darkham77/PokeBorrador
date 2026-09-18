import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed } from 'vue'
import {
  PostBattleSequenceCoordinator,
  POST_BATTLE_PRIORITIES,
  postBattleCoordinator
} from '@/logic/battle/postBattleSequenceCoordinator'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { useEvolutionStore } from '@/stores/evolution'
import { useEventStore } from '@/stores/events'
import { useBattleStore } from '@/stores/battle/battle'
import { useBattleArenaCoordinator } from '@/composables/battle/useBattleArenaCoordinator'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleState } from '@/types/battle/battle'

vi.mock('@/logic/utils/gsapHelpers', () => ({
  gsapSleep: vi.fn(async () => {
    return new Promise(resolve => setTimeout(resolve, 5))
  }),
  awaitAnimation: vi.fn(() => Promise.resolve()),
  createTimeline: vi.fn(() => ({})),
  killTweens: vi.fn()
}))

function createMockPokemon(uid: string, name: string, id: string): Pokemon {
  return {
    uid,
    name,
    id,
    level: 20,
    hp: 100,
    maxHp: 100,
    moves: [
      { id: 'tackle', name: 'Placaje', pp: 35, maxpp: 35 }
    ]
  } as unknown as Pokemon
}

function createMockMove(id: string, name: string): Move {
  return {
    id,
    name,
    pp: 20,
    maxpp: 20,
    type: 'normal',
    category: 'physical',
    power: 50,
    accuracy: 100
  } as unknown as Move
}

describe('PostBattleSequenceCoordinator - 7 Combination Scenarios', () => {
  let coordinator: PostBattleSequenceCoordinator
  let mockCtx: BattleContext

  beforeEach(() => {
    setActivePinia(createPinia())
    coordinator = new PostBattleSequenceCoordinator()
    postBattleCoordinator.clear()

    mockCtx = {
      postBattleCoordinator: coordinator,
      activeBattle: ref({
        player: createMockPokemon('p1', 'Pikachu', 'pikachu'),
        enemy: createMockPokemon('e1', 'Rattata', 'rattata'),
        over: true
      }),
      fsm: {
        currentState: ref('REWARDS_PHASE'),
        currentSubState: ref('CHECK_PERSISTENCE'),
        transition: vi.fn()
      },
      completeBattleFlow: vi.fn()
    } as unknown as BattleContext
  })

  afterEach(() => {
    coordinator.clear()
    postBattleCoordinator.clear()
    vi.restoreAllMocks()
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 1: Modales individuales aislados
  // --------------------------------------------------------------------------
  describe('Escenario 1: Modal individual aislado', () => {
    it('1a: Encola exclusivamente MoveLearning, abre modal, espera resolución y finaliza', async () => {
      const uiStore = useUIStore()
      const modalStore = useModalStore()
      const mon = createMockPokemon('mon-1', 'Pikachu', 'pikachu')
      const move = createMockMove('thunderbolt', 'Rayo')

      coordinator.enqueueMoveLearning([{ pokemon: mon, move }])
      expect(coordinator.isBusy()).toBe(true)

      const sequencePromise = coordinator.runSequence(mockCtx)

      // Wait for modal to open
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('MoveLearning')).toBe(true)
      expect(uiStore.currentMoveToLearn?.move.id).toBe('thunderbolt')
      expect(coordinator.isRunning()).toBe(true)

      // Player completes move learning
      uiStore.finishMoveLearning()

      await sequencePromise
      expect(modalStore.isOpen('MoveLearning')).toBe(false)
      expect(coordinator.isBusy()).toBe(false)
      expect(coordinator.isRunning()).toBe(false)
    })

    it('1b: Encola exclusivamente Evolution, abre modal, espera finalización y concluye', async () => {
      const modalStore = useModalStore()
      const evoStore = useEvolutionStore()
      const mon = createMockPokemon('mon-2', 'Squirtle', 'squirtle')

      coordinator.enqueueEvolution(mon, 'wartortle')
      expect(coordinator.isBusy()).toBe(true)

      const sequencePromise = coordinator.runSequence(mockCtx)

      // Wait for evolution to trigger
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('Evolution')).toBe(true)
      expect(evoStore.isEvolving).toBe(true)
      expect(coordinator.isRunning()).toBe(true)

      // Simulate evolution animation finished
      modalStore.close('Evolution')
      evoStore.finishEvolution()

      await sequencePromise
      expect(modalStore.isOpen('Evolution')).toBe(false)
      expect(coordinator.isBusy()).toBe(false)
    })

    it('1c: Encola exclusivamente EventAutoEnroll, abre modal y espera confirmación/cierre', async () => {
      const modalStore = useModalStore()
      const eventStore = useEventStore()
      const mon = createMockPokemon('mon-3', 'Caterpie', 'caterpie')

      vi.spyOn(eventStore, 'checkCaptureAndPrompt').mockImplementation(async () => {
        modalStore.open('EventAutoEnroll', { pokemon: mon })
      })

      coordinator.enqueueEventAutoEnroll(mon)
      expect(coordinator.isBusy()).toBe(true)

      const sequencePromise = coordinator.runSequence(mockCtx)

      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('EventAutoEnroll')).toBe(true)

      // Player dismisses or confirms modal
      modalStore.close('EventAutoEnroll')

      await sequencePromise
      expect(modalStore.isOpen('EventAutoEnroll')).toBe(false)
      expect(coordinator.isBusy()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 2: Múltiples Pokémon aprendiendo ataques en serie
  // --------------------------------------------------------------------------
  describe('Escenario 2: Múltiples Pokémon aprendiendo ataques', () => {
    it('presenta el modal del Pokémon 1 primero y, al resolverse, presenta el del Pokémon 2 sin colisiones', async () => {
      const uiStore = useUIStore()
      const modalStore = useModalStore()

      const pika = createMockPokemon('pika', 'Pikachu', 'pikachu')
      const thundershock = createMockMove('thundershock', 'Impactrueno')

      const zard = createMockPokemon('zard', 'Charizard', 'charizard')
      const flamethrower = createMockMove('flamethrower', 'Lanzallamas')

      coordinator.enqueueMoveLearning([
        { pokemon: pika, move: thundershock },
        { pokemon: zard, move: flamethrower }
      ])

      const sequencePromise = coordinator.runSequence(mockCtx)

      // First move (Pikachu) is shown
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('MoveLearning')).toBe(true)
      expect(uiStore.currentMoveToLearn?.pokemon.name).toBe('Pikachu')
      expect(uiStore.currentMoveToLearn?.move.id).toBe('thundershock')

      // Resolve Pikachu's move
      uiStore.finishMoveLearning()

      // Automatically transitions to Charizard's move
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('MoveLearning')).toBe(true)
      expect(uiStore.currentMoveToLearn?.pokemon.name).toBe('Charizard')
      expect(uiStore.currentMoveToLearn?.move.id).toBe('flamethrower')

      // Resolve Charizard's move
      uiStore.finishMoveLearning()

      await sequencePromise
      expect(modalStore.isOpen('MoveLearning')).toBe(false)
      expect(coordinator.isBusy()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 3: Técnica + Evolución en el mismo Pokémon
  // --------------------------------------------------------------------------
  describe('Escenario 3: Técnica + Evolución en el mismo Pokémon', () => {
    it('resuelve la técnica primero (prioridad 100) y la evolución después (prioridad 80)', async () => {
      const uiStore = useUIStore()
      const modalStore = useModalStore()
      const evoStore = useEvolutionStore()

      const charmander = createMockPokemon('char-1', 'Charmander', 'charmander')
      const dragonRage = createMockMove('dragonrage', 'Furia Dragón')

      // Enqueue evolution before move learning to test priority sorting
      coordinator.enqueueEvolution(charmander, 'charmeleon')
      coordinator.enqueueMoveLearning([{ pokemon: charmander, move: dragonRage }])

      const sequencePromise = coordinator.runSequence(mockCtx)

      // Move learning MUST be active first because priority 100 > 80
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('MoveLearning')).toBe(true)
      expect(modalStore.isOpen('Evolution')).toBe(false)
      expect(uiStore.currentMoveToLearn?.move.id).toBe('dragonrage')

      // Resolve move learning
      uiStore.finishMoveLearning()

      // Now Evolution modal MUST open next
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('Evolution')).toBe(true)
      expect(evoStore.isEvolving).toBe(true)

      // Resolve evolution
      modalStore.close('Evolution')
      evoStore.finishEvolution()

      await sequencePromise
      expect(modalStore.isOpen('Evolution')).toBe(false)
      expect(coordinator.isBusy()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 4: Combo Total Post-Captura
  // --------------------------------------------------------------------------
  describe('Escenario 4: Combo Total Post-Captura', () => {
    it('ejecuta estrictamente en orden: MoveLearning (100) -> Evolution (80) -> EventAutoEnroll (60)', async () => {
      const uiStore = useUIStore()
      const modalStore = useModalStore()
      const evoStore = useEvolutionStore()
      const eventStore = useEventStore()

      const leaderMon = createMockPokemon('lead-1', 'Raichu', 'raichu')
      const evoMon = createMockPokemon('evo-1', 'Bulbasaur', 'bulbasaur')
      const capturedMon = createMockPokemon('cap-1', 'Pinsir', 'pinsir')

      vi.spyOn(eventStore, 'checkCaptureAndPrompt').mockImplementation(async () => {
        modalStore.open('EventAutoEnroll', { pokemon: capturedMon })
      })

      // Enqueue in arbitrary order
      coordinator.enqueueEventAutoEnroll(capturedMon)
      coordinator.enqueueEvolution(evoMon, 'ivysaur')
      coordinator.enqueueMoveLearning([{ pokemon: leaderMon, move: createMockMove('thunder', 'Trueno') }])

      const executionOrder: string[] = []

      const sequencePromise = coordinator.runSequence(mockCtx)

      // Step 1: MoveLearning
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('MoveLearning')).toBe(true)
      expect(modalStore.isOpen('Evolution')).toBe(false)
      expect(modalStore.isOpen('EventAutoEnroll')).toBe(false)
      executionOrder.push('MoveLearning')
      uiStore.finishMoveLearning()

      // Step 2: Evolution
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('Evolution')).toBe(true)
      expect(modalStore.isOpen('EventAutoEnroll')).toBe(false)
      executionOrder.push('Evolution')
      modalStore.close('Evolution')
      evoStore.finishEvolution()

      // Step 3: EventAutoEnroll
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('EventAutoEnroll')).toBe(true)
      executionOrder.push('EventAutoEnroll')
      modalStore.close('EventAutoEnroll')

      await sequencePromise
      expect(executionOrder).toEqual(['MoveLearning', 'Evolution', 'EventAutoEnroll'])
      expect(coordinator.isBusy()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 5: Descarte y Cancelación Limpia
  // --------------------------------------------------------------------------
  describe('Escenario 5: Descarte y Cancelación Limpia', () => {
    it('cancela el aprendizaje de técnica y la inscripción al evento sin colgar promesas', async () => {
      const uiStore = useUIStore()
      const modalStore = useModalStore()
      const eventStore = useEventStore()

      const mon = createMockPokemon('mon-cancel', 'Abra', 'abra')
      vi.spyOn(eventStore, 'checkCaptureAndPrompt').mockImplementation(async () => {
        modalStore.open('EventAutoEnroll', { pokemon: mon })
      })

      coordinator.enqueueMoveLearning([{ pokemon: mon, move: createMockMove('teleport', 'Teletransporte') }])
      coordinator.enqueueEventAutoEnroll(mon)

      const sequencePromise = coordinator.runSequence(mockCtx)

      // Step 1: Cancel move learning
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('MoveLearning')).toBe(true)
      uiStore.finishMoveLearning() // User cancels/rejects

      // Step 2: Dismiss event auto enroll
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(modalStore.isOpen('EventAutoEnroll')).toBe(true)
      modalStore.close('EventAutoEnroll') // User rejects enrollment

      await expect(sequencePromise).resolves.toBeUndefined()
      expect(coordinator.isBusy()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 6: Auto-Battle / Bucle de búsqueda en pausa
  // --------------------------------------------------------------------------
  describe('Escenario 6: Auto-Battle / Bucle de búsqueda en pausa', () => {
    it('mantiene isBusy() en true mientras procesa tareas y bloquea avance prematuro', async () => {
      const uiStore = useUIStore()
      uiStore.autoBattle = true

      const mon = createMockPokemon('mon-auto', 'Gengar', 'gengar')
      coordinator.enqueueMoveLearning([{ pokemon: mon, move: createMockMove('shadowball', 'Bola Sombra') }])

      expect(coordinator.isBusy()).toBe(true)

      let resolved = false
      const runPromise = coordinator.runSequence(mockCtx).then(() => {
        resolved = true
      })

      await new Promise(resolve => setTimeout(resolve, 10))
      expect(resolved).toBe(false)
      expect(coordinator.isBusy()).toBe(true)

      // Resolve move
      uiStore.finishMoveLearning()
      await runPromise

      expect(resolved).toBe(true)
      expect(coordinator.isBusy()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // ESCENARIO 7: Prevención de superposición con Minijuegos (Pesca / Arqueología)
  // --------------------------------------------------------------------------
  describe('Escenario 7: Prevención de superposición con Minijuegos', () => {
    it('espera a que el coordinador esté inactivo antes de abrir el modal de Pesca', async () => {
      const modalStore = useModalStore()
      const battleStore = useBattleStore()

      // Enqueue a blocking task in the global postBattleCoordinator singleton
      let finishTask: (() => void) | null = null
      const taskPromise = new Promise<void>(resolve => {
        finishTask = resolve
      })

      postBattleCoordinator.enqueueTask({
        id: 'blocking_post_battle_task',
        type: 'custom',
        priority: POST_BATTLE_PRIORITIES.CUSTOM,
        execute: async () => {
          await taskPromise
        }
      })

      // Start running sequence in background
      void postBattleCoordinator.runSequence(mockCtx)
      expect(postBattleCoordinator.isBusy()).toBe(true)

      const mockEnemy = createMockPokemon('magikarp', 'Magikarp', 'magikarp')
      const battleRef = ref<BattleState | null>({
        minigame: 'fishing',
        enemy: mockEnemy,
        rarity: 'common'
      } as unknown as BattleState)

      // Initialize arena coordinator watcher
      useBattleArenaCoordinator({
        battleStore,
        battle: computed(() => battleRef.value),
        enemy: computed(() => mockEnemy),
        resetAll: vi.fn(),
        handleFishingSuccess: vi.fn(),
        handleFishingFail: vi.fn(),
        handleArchaeologySuccess: vi.fn(),
        handleArchaeologyFail: vi.fn(),
        handleMinigameCancel: vi.fn()
      })

      // Trigger MINIGAME_CHECK substate while coordinator is busy
      await battleStore.fsm.transition('SEARCH_PHASE', 'MINIGAME_CHECK')

      await new Promise(resolve => setTimeout(resolve, 20))
      // Minigame modal MUST NOT open while coordinator is busy
      expect(modalStore.isOpen('Fishing')).toBe(false)

      // Now complete the coordinator task
      if (finishTask) (finishTask as () => void)()
      await new Promise(resolve => setTimeout(resolve, 30))

      // Now that coordinator is idle, the Fishing modal opens
      expect(modalStore.isOpen('Fishing')).toBe(true)
      modalStore.close('Fishing')
    })
  })
})
