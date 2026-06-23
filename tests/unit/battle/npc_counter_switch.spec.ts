import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import '../../helpers/battleMockSetup'
import { processFaint } from '@/logic/battle/resolution'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'

const mockExecuteTurn = vi.hoisted(() => vi.fn())
const mockGetShowdownSlot = vi.hoisted(() => vi.fn(() => 3))
const mockFindBestSwitchIndex = vi.hoisted(() => vi.fn(() => 1))

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: {}, // Truthy worker to trigger the showdown flow
  executeTurnInWorker: mockExecuteTurn
}))

vi.mock('@/logic/battle/showdownAdapter', () => ({
  getShowdownSlot: mockGetShowdownSlot,
  swapShowdownOrder: vi.fn((arr) => arr)
}))

vi.mock('@/logic/battle/ai/battleAI', () => ({
  findBestSwitchIndex: mockFindBestSwitchIndex
}))

describe('NPC Counter Switching & Showdown Sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should choose the best counter and notify the showdown worker with correct slot index on NPC faint', async () => {
    const faintedEnemy = { uid: 'e-fainted', name: 'Rattata', hp: 0, maxHp: 30 } as unknown as Pokemon
    const nextEnemy1 = { uid: 'e-next1', name: 'Pidgeotto', hp: 50, maxHp: 50 } as unknown as Pokemon
    const nextEnemy2 = { uid: 'e-next2', name: 'Alakazam', hp: 80, maxHp: 80 } as unknown as Pokemon // Selected by findBestSwitchIndex (idx 1)

    const enemyTeam = [faintedEnemy, nextEnemy2, nextEnemy1]

    const player = { uid: 'p-active', name: 'Charizard', hp: 100, maxHp: 100 } as unknown as Pokemon

    const activeBattle = ref({
      player,
      enemy: faintedEnemy,
      enemyTeam,
      playerTeamIndex: 0,
      isTrainer: true,
      over: false,
      locationId: 'route1'
    })

    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE } as { value: string },
      currentSubState: { value: BATTLE_SUBSTATES.CLEANUP_MEMORY } as { value: string | null },
      transition: vi.fn(async (s: string, sub?: string) => {
        (fsm.currentState as { value: string }).value = s
        if (sub) (fsm.currentSubState as { value: string | null }).value = sub
      })
    }

    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })

    const mockCtx = {
      activeBattle,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      faintedSides: { value: new Set<string>() },
      enemyStages,
      gs: {
        state: {
          team: [player]
        }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn(),
      animations: {
        handleCatchRequest: vi.fn(),
        playBallFadeOut: vi.fn(),
        handleReleaseRequest: vi.fn()
      }
    } as unknown as BattleContext

    await processFaint(mockCtx, 'enemy')

    // 1. Should have run the AI picker to choose the best switch index
    expect(mockFindBestSwitchIndex).toHaveBeenCalledWith(enemyTeam, player, faintedEnemy.uid)

    // 2. Should have selected index 1 (Alakazam) as the next enemy
    expect(activeBattle.value.enemy?.uid).toBe(nextEnemy2.uid)

    const expectedOrder = enemyTeam.map(p => p.uid)
    expect(mockGetShowdownSlot).toHaveBeenCalledWith(expectedOrder, nextEnemy2.uid)

    // 4. Should have sent the switch command to Showdown worker
    expect(mockExecuteTurn).toHaveBeenCalledWith('', 'switch 3')
  })
})
