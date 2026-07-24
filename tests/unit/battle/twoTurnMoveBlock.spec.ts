import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import '../../helpers/battleMockSetup'
import { executeSwitch } from '@/logic/battle/actions/switchAction'
import { clearVolatileStatus } from '@/logic/battle/battleStatus'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Volatile Status & Two-Turn Move Blocking', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('clearVolatileStatus', () => {
    it('should revert Ditto transformation back to original properties and clean up others', () => {
      const originalDitto = {
        id: 'ditto',
        name: 'Ditto',
        type: 'normal',
        atk: 48,
        def: 48,
        spa: 48,
        spd: 48,
        spe: 48,
        moves: [],
        level: 5,
        maxHp: 30
      }

      const pokemon = {
        id: 'pikachu',
        name: 'Pikachu',
        type: 'electric',
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        moves: [{ name: 'Impactrueno', pp: 30, maxPP: 30 }],
        hp: 20,
        maxHp: 35,
        isTransformed: true,
        originalDitto,
        furyCutterCount: 4,
        identified: true
      } as unknown as Pokemon

      clearVolatileStatus(pokemon)

      expect(pokemon.isTransformed).toBe(false)
      expect(pokemon.originalDitto).toBeUndefined()
      expect(pokemon.id).toBe('ditto')
      expect(pokemon.name).toBe('Ditto')
      expect(pokemon.type).toBe('normal')
      expect(pokemon.atk).toBe(48)
      expect(pokemon.def).toBe(48)
      expect(pokemon.hp).toBe(20) // HP should be kept (less than original maxHp 30)
      expect(pokemon.maxHp).toBe(30)
      expect(pokemon.furyCutterCount).toBe(0)
      expect(pokemon.identified).toBe(false)
    })
  })

  describe('executeSwitch blocking', () => {
    it('should block switch when active pokemon has twoturnmove active and is not forced', async () => {
      const oldPoke = {
        uid: 'p-old',
        name: 'Dragonite',
        hp: 100,
        volatileCounters: {
          twoturnmove: 1
        }
      } as unknown as Pokemon

      const newPoke = {
        uid: 'p-new',
        name: 'Charizard',
        hp: 100
      } as unknown as Pokemon

      const team = [oldPoke, newPoke]

      const activeBattle = ref({
        player: oldPoke,
        enemy: { uid: 'e-active', hp: 100 } as unknown as Pokemon,
        playerTeamIndex: 0
      })

      const fsm = {
        currentState: { value: BATTLE_STATES.ACTIVE_BATTLE } as { value: string },
        currentSubState: { value: BATTLE_SUBSTATES.WAIT_INPUT } as { value: string | null },
        transition: vi.fn(async (s: string, sub?: string) => {
          (fsm.currentState as { value: string }).value = s
          if (sub) (fsm.currentSubState as { value: string | null }).value = sub
        })
      }

      const mockCtx = {
        gs: { state: { team } },
        activeBattle,
        fsm,
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        addLog: vi.fn(),
        persistBattle: vi.fn()
      } as unknown as BattleContext

      // Non-forced switch
      await executeSwitch(mockCtx, 1, false)

      // Should have returned early, transitioning back to WAIT_INPUT
      expect(fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.WAIT_INPUT)
      // Active pokemon should still be the old one
      expect(activeBattle.value.player.uid).toBe('p-old')
    })
  })

  describe('parseShowdownLogLine twoturnmove and lockedmove', () => {
    it('should set twoturnmove and lastMove on prepare', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge')
      const player = {
        uid: 'p-active',
        id: 'rayquaza',
        name: 'Rayquaza-Mega',
        hp: 100,
        volatileCounters: {}
      } as unknown as Pokemon
      
      const activeBattle = ref({
        player,
        enemy: { uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 } as unknown as Pokemon,
        playerTeam: [player],
        enemyTeam: [{ uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 }]
      })
      
      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext
      
      await parseShowdownLogLine(mockCtx, '|-prepare|p1a: Rayquaza-Mega|Fly|[uids]p1a:Rayquaza-Mega=p-active')
      
      expect(player.volatileCounters?.['twoturnmove']).toBe(1)
      expect(player.lastMove?.id).toBe('fly')
    })

    it('should set lockedmove on move with locked_move effect', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge')
      const player = {
        uid: 'p-active',
        id: 'rayquaza',
        name: 'Rayquaza-Mega',
        hp: 100,
        volatileCounters: {}
      } as unknown as Pokemon
      
      const activeBattle = ref({
        player,
        enemy: { uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 } as unknown as Pokemon,
        playerTeam: [player],
        enemyTeam: [{ uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 }]
      })
      
      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext
      
      // Simular uso de Enfado (Outrage)
      await parseShowdownLogLine(mockCtx, '|move|p1a: Rayquaza-Mega|Outrage|p2a: Pikachu|[uids]p1a:Rayquaza-Mega=p-active,p2a:Pikachu=e-active')
      
      expect(player.volatileCounters?.['lockedmove']).toBe(1)
      expect(player.lastMove?.id).toBe('outrage')
    })
  })
})

