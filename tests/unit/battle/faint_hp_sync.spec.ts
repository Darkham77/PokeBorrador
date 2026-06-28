import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import '../../helpers/battleMockSetup'
import { processFaint } from '@/logic/battle/resolution'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: {},
  executeTurnInWorker: vi.fn()
}))

vi.mock('@/logic/battle/showdownAdapter', () => ({
  getShowdownSlot: vi.fn(() => 2),
  swapActivePokemon: vi.fn((arr) => arr),
  resolveShowdownSlot: vi.fn(() => 2),
  resolveCurrentTeamOrder: vi.fn((_order, team) => team)
}))

describe('Faint HP Sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should update fainted enemy HP to 0 in enemyTeam array', async () => {
    const faintedEnemy = { uid: 'e-fainted', name: 'Rhydon', hp: 0, maxHp: 165, moves: [] } as unknown as Pokemon
    const nextEnemy = { uid: 'e-next', name: 'Rhyhorn', hp: 137, maxHp: 137, moves: [] } as unknown as Pokemon
    const enemyTeam = [faintedEnemy, nextEnemy]

    const activeBattle = ref({
      player: { uid: 'p-active', name: 'Eevee', hp: 100, moves: [] } as unknown as Pokemon,
      enemy: faintedEnemy,
      enemyTeam,
      isTrainer: true,
      over: false
    })

    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
      currentSubState: { value: BATTLE_SUBSTATES.CLEANUP_MEMORY },
      transition: vi.fn(async (s: string, sub?: string) => {
        fsm.currentState.value = s
        if (sub) fsm.currentSubState.value = sub
      })
    }

    const mockCtx = {
      activeBattle,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      faintedSides: { value: new Set<string>() },
      enemyStages: ref({}),
      gs: {
        state: { team: [] }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn()
    } as unknown as BattleContext

    await processFaint(mockCtx, 'enemy')

    // Expect the fainted enemy's HP in enemyTeam to be 0
    expect(enemyTeam[0]?.hp).toBe(0)
  })
})
