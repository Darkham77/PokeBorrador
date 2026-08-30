/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'

vi.mock('@/logic/battle/orchestratorWorkerInitHelper.ts', () => ({
  initWorkerForBattle: vi.fn(async (ctx) => {
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.playerRequest = {
        active: [{
          moves: [
            { id: 'thunderbolt', name: 'Rayo', pp: 15, maxpp: 15, disabled: false },
            { id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxpp: 30, disabled: false }
          ]
        }]
      }
    }
  }),
  preloadShowdownWorker: vi.fn()
}))

vi.mock('@/logic/encounters/encounters', () => ({
  generateEncounter: vi.fn(async () => ({
    type: 'wild',
    pokemon: makePokemon('pidgey', 5)!
  })),
  getEncounterPool: vi.fn(() => ({ pool: ['pidgey'], rates: [100] })),
  getSpeciesEntries: vi.fn(() => [])
}))

vi.mock('@/logic/utils/gsapHelpers', () => ({
  awaitAnimation: vi.fn(() => Promise.resolve()),
  gsapSleep: vi.fn(() => Promise.resolve())
}))

vi.mock('gsap', () => ({
  default: {
    delayedCall: vi.fn((_delay, cb) => { if (cb) cb(); return {} }),
    fromTo: vi.fn(() => ({ progress: vi.fn() })),
    to: vi.fn(() => ({ progress: vi.fn() })),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), progress: vi.fn() })),
    set: vi.fn(),
    context: vi.fn((fn) => { fn(); return { revert: vi.fn() } })
  },
  gsap: {
    delayedCall: vi.fn((_delay, cb) => { if (cb) cb(); return {} }),
    fromTo: vi.fn(() => ({ progress: vi.fn() })),
    to: vi.fn(() => ({ progress: vi.fn() })),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), progress: vi.fn() })),
    set: vi.fn(),
    context: vi.fn((fn) => { fn(); return { revert: vi.fn() } })
  }
}))

describe('Auto-Battle Multi-Encounter Integration Test (Tier 2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seamlessly completes multiple wild encounters in search loop when autoBattle is active without UI locking in grayscale', async () => {
    const gameStore = useGameStore()
    const uiStore = useUIStore()
    const battleStore = useBattleStore()

    uiStore.setAutoBattle(true)

    const pikachu = makePokemon('pikachu', 20)!
    gameStore.state.team = [pikachu]
    gameStore.state.starterChosen = true
    gameStore.state.map.currentMap = 'route1'

    // --- ENCUENTRO 1 ---
    const enemy1 = makePokemon('rattata', 3)!
    await battleStore.startBattle(enemy1, { locationId: 'route1', wasSearching: true })

    expect(battleStore.currentFsmState).toBe(BATTLE_STATES.SEARCH_PHASE)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.COMBAT_OR_FLEE)

    // Al estar en COMBAT_OR_FLEE con auto-combatir, se dispara el inicio del combate
    await battleStore.startEncounter()

    expect(battleStore.currentFsmState).toBe(BATTLE_STATES.ACTIVE_BATTLE)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.WAIT_INPUT)
    expect(battleStore.isProcessing).toBe(false)
    expect(battleStore.isSearching).toBe(false)
    expect(battleStore.state?.over).toBe(false)

    // Debilitar enemigo 1 y completar flujo de búsqueda
    battleStore.state!.enemy!.hp = 0
    await battleStore.endBattle(true, false)

    // Al terminar con wasSearching = true, el flujo transiciona a SEARCH_PHASE/COMBAT_OR_FLEE
    // y el auto-combatir inicia el siguiente encuentro automáticamente
    expect(battleStore.isSearching || battleStore.currentFsmState === BATTLE_STATES.SEARCH_PHASE).toBe(true)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.COMBAT_OR_FLEE)

    // El watcher o el startEncounter inicia el Combate 2
    await battleStore.startEncounter()

    // --- ENCUENTRO 2 ---
    expect(battleStore.currentFsmState).toBe(BATTLE_STATES.ACTIVE_BATTLE)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.WAIT_INPUT)
    expect(battleStore.isProcessing).toBe(false)
    expect(battleStore.state?.over).toBe(false)
    expect(battleStore.state?.playerRequest?.active?.[0]?.moves).toBeDefined()
    expect(battleStore.state?.playerRequest?.active?.[0]?.moves?.[0]?.disabled).toBe(false)

    // Debilitar enemigo 2
    battleStore.state!.enemy!.hp = 0
    await battleStore.endBattle(true, false)

    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.COMBAT_OR_FLEE)

    // --- ENCUENTRO 3 ---
    await battleStore.startEncounter()

    expect(battleStore.currentFsmState).toBe(BATTLE_STATES.ACTIVE_BATTLE)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.WAIT_INPUT)
    expect(battleStore.isProcessing).toBe(false)
    expect(battleStore.state?.player?.hp).toBeGreaterThan(0)
  })
})
