/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'

const mockWorker = vi.hoisted(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null as ((ev: MessageEvent) => void) | null
}))

vi.mock('@/logic/battle/orchestratorWorkerInitHelper.ts', () => ({
  initWorkerForBattle: vi.fn(async (ctx, initialPlayer) => {
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.player = initialPlayer
      ctx.activeBattle.value.playerRequest = {
        active: [{
          moves: (initialPlayer.moves || []).map((m: { id?: string; name?: string; pp?: number; maxpp?: number }) => ({
            id: m.id,
            name: m.name,
            pp: m.pp ?? 15,
            maxpp: m.maxpp ?? 15,
            disabled: false
          }))
        }],
        side: {
          pokemon: ctx.gs.state.team.map((p: { uid: string; name: string }) => ({
            uid: p.uid,
            ident: `p1: ${p.name}`,
            condition: '100/100',
            active: p.uid === initialPlayer.uid
          }))
        }
      }
    }
  }),
  preloadShowdownWorker: vi.fn()
}))

vi.mock('@/logic/battle/showdownWorkerClient.ts', () => ({
  showdownWorker: mockWorker,
  getShowdownWorker: vi.fn(() => mockWorker),
  setShowdownWorker: vi.fn(),
  preloadShowdownWorker: vi.fn(),
  isPlayerTrappedInWorker: vi.fn(async () => false),
  testResetShowdownWorker: vi.fn(),
  executeTurnInWorker: vi.fn(async (p1Choice: string, _p2Choice?: string) => {
    if (p1Choice.startsWith('switch ')) {
      // Simulate Showdown executing the switch to Dragonite
      return {
        logs: [
          '|switch|p1a: Dragonite|Dragonite, L85, M|273/273',
          '|move|p2a: Rattata|Tackle|p1a: Dragonite'
        ],
        isOver: false,
        winner: null,
        p1Request: {
          active: [{
            moves: [
              { id: 'agility', name: 'Agilidad', pp: 30, maxpp: 30, disabled: false },
              { id: 'safeguard', name: 'Velo Sagrado', pp: 25, maxpp: 25, disabled: false },
              { id: 'outrage', name: 'Enfado', pp: 10, maxpp: 10, disabled: false },
              { id: 'hyperbeam', name: 'Hiperrayo', pp: 5, maxpp: 5, disabled: false }
            ]
          }],
          side: {
            pokemon: [
              { uid: 'gengar-uid', ident: 'p1: Gengar', condition: '100/100', active: false },
              { uid: 'dragonite-uid', ident: 'p1: Dragonite', condition: '273/273', active: true }
            ]
          }
        },
        p2Request: { active: [{ moves: [] }] }
      }
    }

    return {
      logs: [
        `|move|p1a: Dragonite|Safeguard|p2a: Rattata`,
        '|-sidestart|p1: Player|Safeguard'
      ],
      isOver: false,
      winner: null,
      p1Request: {
        active: [{
          moves: [
            { id: 'agility', name: 'Agilidad', pp: 30, maxpp: 30, disabled: false },
            { id: 'safeguard', name: 'Velo Sagrado', pp: 24, maxpp: 25, disabled: false },
            { id: 'outrage', name: 'Enfado', pp: 10, maxpp: 10, disabled: false },
            { id: 'hyperbeam', name: 'Hiperrayo', pp: 5, maxpp: 5, disabled: false }
          ]
        }]
      },
      p2Request: { active: [{ moves: [] }] }
    }
  }),
  syncTeamsFromLastWorkerState: vi.fn(async () => {})
}))

vi.mock('@/logic/battle/orchestrator.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/logic/battle/orchestrator.ts')>()
  return {
    ...actual,
    isPlayerTrappedInWorker: vi.fn(async () => false)
  }
})

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

describe('Mid-Battle Voluntary Switch Integration Test (Tier 2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('correctly switches active pokemon in Showdown worker and executes attacks with new pokemon moves', async () => {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

    const gengar = makePokemon('gengar', 60)!
    gengar.uid = 'gengar-uid'
    const dragonite = makePokemon('dragonite', 85)!
    dragonite.uid = 'dragonite-uid'
    const enemyRattata = makePokemon('rattata', 4)!
    enemyRattata.uid = 'rattata-uid'

    gameStore.state.team = [gengar, dragonite]

    // Iniciar batalla salvaje
    await battleStore._startBattle(enemyRattata, {
      locationId: 'route1',
      wasSearching: false
    })

    // Verificar que Gengar es el activo inicial
    expect(battleStore.state?.player?.name).toBe(gengar.name)
    expect(battleStore.currentFsmState).toBe(BATTLE_STATES.ACTIVE_BATTLE)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.WAIT_INPUT)

    // Ejecutar cambio voluntario a Dragonite (índice 1)
    await battleStore.executeSwitch(1, false)

    // Verificar que tras el switch, el activo es Dragonite
    expect(battleStore.state?.player?.name).toBe(dragonite.name)
    expect(battleStore.state?.player?.uid).toBe('dragonite-uid')
    expect(battleStore.currentFsmState).toBe(BATTLE_STATES.ACTIVE_BATTLE)
    expect(battleStore.currentSubState).toBe(BATTLE_SUBSTATES.WAIT_INPUT)

    // Verificar que Showdown playerRequest se actualizó con los movimientos de Dragonite
    const activeMoves = battleStore.state?.playerRequest?.active?.[0]?.moves
    expect(activeMoves?.some((m: { id?: string }) => m.id === 'safeguard')).toBe(true)

    // Ejecutar movimiento 1 de Dragonite (Velo Sagrado / Safeguard)
    await battleStore.executeMove(1)

    // Verificar que el log contiene el ataque de Dragonite y no de Gengar
    const logs = battleStore.battleLogs || []
    expect(logs.some(l => l.msg.includes('Dragonite'))).toBe(true)
  })
})
