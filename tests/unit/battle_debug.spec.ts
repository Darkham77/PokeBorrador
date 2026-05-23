/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon'
import type { BattleState } from '@/types/battle'

// Mock de assetService para evitar errores de red
vi.mock('@/logic/assetService', () => ({
  getAssetUrl: vi.fn((type, id) => `mock-url-${type}-${id}`),
  ASSET_TYPES: {
    POKEMON: 'pokemon',
    TRAINER: 'trainer',
    ITEM: 'item'
  }
}))

describe('Battle Debug Commands', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    delete (window as any).__VITE_DEBUG__
  })

  it('should initialize and register debug commands on window', () => {
    useBattleStore()

    const win = window as any
    expect(win.__VITE_DEBUG__).toBeDefined()
    expect(win.__VITE_DEBUG__.battle).toBeDefined()
    expect(win.__VITE_DEBUG__.battle.fullHeal).toBeTypeOf('function')
    expect(win.__VITE_DEBUG__.battle.killEnemy).toBeTypeOf('function')
  })

  it('should fullHeal player and sync with game team HP reactively', () => {
    const gs = useGameStore()
    const battleStore = useBattleStore()

    // 1. Configurar un Pokémon dañado en el equipo
    const p1 = { uid: 'p1', name: 'Pikachu', hp: 10, maxHp: 100, status: 'paralysis' } as unknown as Pokemon
    gs.state.team = [p1]

    // 2. Configurar la batalla activa
    battleStore.state = {
      player: { ...p1 },
      enemy: { uid: 'e1', name: 'Rattata', hp: 50, maxHp: 50 } as unknown as Pokemon,
      playerTeamIndex: 0,
      over: false
    } as unknown as BattleState

    // 3. Ejecutar fullHeal desde el window registrado por useBattleStore()
    const win = window as any
    win.__VITE_DEBUG__.battle.fullHeal()

    // 4. Comprobar que el Pokémon en batalla se curó
    expect(battleStore.state.player!.hp).toBe(100)
    expect(battleStore.state.player!.status).toBeNull()

    // 5. Comprobar que el HP en el equipo de gameStore se sincronizó
    expect(gs.state.team[0]!.hp).toBe(100)
    expect(gs.state.team[0]!.status).toBeNull()
  })

  it('should set enemy HP to 0 and trigger faint sequence in killEnemy', async () => {
    const battleStore = useBattleStore()

    // Configurar la batalla activa
    battleStore.state = {
      player: { uid: 'p1', name: 'Pikachu', hp: 100, maxHp: 100 } as unknown as Pokemon,
      enemy: { uid: 'e1', name: 'Rattata', hp: 50, maxHp: 50 } as unknown as Pokemon,
      over: false,
      participants: ['p1']
    } as unknown as BattleState

    // Ejecutar killEnemy desde el window registrado por useBattleStore()
    const win = window as any
    await win.__VITE_DEBUG__.battle.killEnemy()

    // Comprobar que el enemigo fue vaciado del asiento (hp -> 0 y faint completado)
    expect(battleStore.state.enemy).toBeNull()
  })
})
