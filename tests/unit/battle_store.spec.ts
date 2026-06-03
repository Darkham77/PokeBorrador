/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon'

// Mock de assetService para evitar errores de red
vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn((type, id) => `mock-url-${type}-${id}`),
  ASSET_TYPES: {
    POKEMON: 'pokemon',
    TRAINER: 'trainer',
    ITEM: 'item'
  }
}))

describe('Battle Store - Log Side Detection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should assign "player" side when source is "player"', () => {
    const battle = useBattleStore()
    battle.addLog('Test msg', 'log-info', 'player')
    
    expect(battle.battleLogs[0]!.side).toBe('player')
    expect(battle.battleLogs[0]!.iconType).toBe('player_avatar')
  })

  it('should assign "player" side when source is a pokemon in player team', () => {
    const gs = useGameStore()
    const battle = useBattleStore()
    
    const myPoke = { uid: 'p123', name: 'Pikachu', id: 25 } as unknown as Pokemon
    gs.state.team = [myPoke]
    
    battle.addLog('Pikachu used Thunder!', 'log-info', myPoke)
    
    expect(battle.battleLogs[0]!.side).toBe('player')
    expect(battle.battleLogs[0]!.iconType).toBe('pokemon')
  })

  it('should assign "enemy" side when source is an unknown pokemon', () => {
    const gs = useGameStore()
    const battle = useBattleStore()
    
    gs.state.team = [{ uid: 'p123' } as unknown as Pokemon]
    const enemyPoke = { uid: 'e456', name: 'Rattata', id: 19 } as unknown as Pokemon
    
    battle.addLog('Wild Rattata appeared!', 'log-info', enemyPoke)
    
    expect(battle.battleLogs[0]!.side).toBe('enemy')
  })

  it('should use emoji icon for debug logs regardless of source', () => {
    const battle = useBattleStore()
    battle.addLog('DEBUG: System override', 'log-info', 'player')
    
    expect(battle.battleLogs[0]!.icon).toBe('⚙️')
    expect(battle.battleLogs[0]!.iconType).toBe('emoji')
  })

  it('should handle null source gracefully', () => {
    const battle = useBattleStore()
    // Esto disparaba el error "Cannot read properties of null (reading 'uid')"
    expect(() => {
      battle.addLog('Generic message', 'log-info', null)
    }).not.toThrow()
    
    expect(battle.battleLogs[0]!.side).toBe('enemy') // Default side if not player
  })
})
