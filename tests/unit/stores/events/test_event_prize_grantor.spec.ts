import { describe, it, expect, vi } from 'vitest'
import {
  grantMoneyAward,
  grantBattleCoinsAward,
  grantItemsAward,
  type EventPrizeGameStore,
  type EventPrizeUIStore,
} from '@/stores/events/eventPrizeGrantor'

describe('eventPrizeGrantor', () => {
  it('grants money award and notifies UI', () => {
    const state = { money: 1000 } as any
    const mockGameStore = { state } as unknown as EventPrizeGameStore
    const notify = vi.fn()
    const mockUIStore = { notify } as unknown as EventPrizeUIStore

    const count = grantMoneyAward(mockGameStore, mockUIStore, { type: 'money', amount: 500 })
    expect(count).toBe(1)
    expect(state.money).toBe(1500)
    expect(notify).toHaveBeenCalledWith('¡Ganaste ₽500!', '💰')
  })

  it('grants battle coins award and notifies UI', () => {
    const state = { battleCoins: 50 } as any
    const mockGameStore = { state } as unknown as EventPrizeGameStore
    const notify = vi.fn()
    const mockUIStore = { notify } as unknown as EventPrizeUIStore

    const count = grantBattleCoinsAward(mockGameStore, mockUIStore, { type: 'bc', amount: 25 })
    expect(count).toBe(1)
    expect(state.battleCoins).toBe(75)
    expect(notify).toHaveBeenCalledWith('¡Ganaste 25 Battle Coins!', '🪙')
  })

  it('grants item award into inventory and notifies UI', () => {
    const state = { inventory: {} } as any
    const mockGameStore = { state } as unknown as EventPrizeGameStore
    const notify = vi.fn()
    const mockUIStore = { notify } as unknown as EventPrizeUIStore

    const count = grantItemsAward(mockGameStore, mockUIStore, { type: 'item', item: 'potion', qty: 3 })
    expect(count).toBe(1)
    expect(state.inventory['potion']).toBe(3)
  })
})
