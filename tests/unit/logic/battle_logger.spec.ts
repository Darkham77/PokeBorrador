
import { describe, it, expect, vi } from 'vitest'
import { formatBattleLog } from '@/logic/battle/battleLogger'

// Mock de assetService
vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn((type, id) => `mock-url-${type}-${id}`),
  ASSET_TYPES: {
    POKEMON: 'pokemon',
    TRAINER: 'trainer',
    ITEM: 'item'
  }
}))

describe('Battle Logger Utility', () => {
  const mockCtx = {
    gs: { state: { team: [{ uid: 'p1', name: 'Pika' }] } },
    activeBattle: { enemy: { uid: 'e1', name: 'Rat' } },
    attackerSide: 'player'
  }

  it('should detect player trainer source', () => {
    const result = formatBattleLog('Hi', 'log-info', 'player' as unknown as Parameters<typeof formatBattleLog>[2], mockCtx as unknown as Parameters<typeof formatBattleLog>[3])
    expect(result.side).toBe('player')
    expect(result.iconType).toBe('trainer')
  })

  it('should detect player pokemon source', () => {
    const p = { uid: 'p1', name: 'Pika', id: '25' }
    const result = formatBattleLog('Hi', 'log-info', p as unknown as Parameters<typeof formatBattleLog>[2], mockCtx as unknown as Parameters<typeof formatBattleLog>[3])
    expect(result.side).toBe('player')
    expect(result.iconType).toBe('pokemon')
    expect(result.icon).toContain('pokemon-25')
  })

  it('should detect enemy pokemon source', () => {
    const e = { uid: 'e1', name: 'Rat', id: '19' }
    const result = formatBattleLog('Hi', 'log-info', e as unknown as Parameters<typeof formatBattleLog>[2], mockCtx as unknown as Parameters<typeof formatBattleLog>[3])
    expect(result.side).toBe('enemy')
    expect(result.iconType).toBe('pokemon')
  })

  it('should handle debug messages with emoji', () => {
    const result = formatBattleLog('DEBUG: test', 'log-info', 'player' as unknown as Parameters<typeof formatBattleLog>[2], mockCtx as unknown as Parameters<typeof formatBattleLog>[3])
    expect(result.icon).toBe('⚙️')
    expect(result.iconType).toBe('emoji')
  })

  it('should handle item source', () => {
    // Usamos 'pocion' que es el ID en data/items.js
    const result = formatBattleLog('Used potion', 'log-info', 'pocion' as unknown as Parameters<typeof formatBattleLog>[2], mockCtx as unknown as Parameters<typeof formatBattleLog>[3])
    expect(result.iconType).toBe('item')
    expect(result.icon).toContain('item-potion')
  })

  it('should fallback to attackerSide if source is unknown', () => {
    const result = formatBattleLog('Unknown', 'log-info', { uid: '???' } as unknown as Parameters<typeof formatBattleLog>[2], mockCtx as unknown as Parameters<typeof formatBattleLog>[3])
    expect(result.side).toBe('player') // attackerSide is 'player'
  })
})
