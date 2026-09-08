import { describe, it, expect, vi } from 'vitest'
import {
  grantMoneyAward,
  grantBattleCoinsAward,
  grantItemsAward,
  getAvailablePokemonStorageSlots,
  countIncomingPokemonFromPrize,
  validateStorageCapacityForAwards,
  type EventPrizeGameStore,
  type EventPrizeUIStore,
} from '@/stores/events/eventPrizeGrantor'
import type { PendingAward } from '@/types/system/stores'

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

  describe('storage capacity validation', () => {
    it('calculates available storage slots correctly', () => {
      // 6 team slots + 4 boxes * 50 = 206 slots total
      const state = {
        boxCount: 4,
        team: [{ id: 'pikachu' }, { id: 'bulbasaur' }], // 2 team
        box: new Array(10).fill({ id: 'rattata' }) // 10 in box
      } as any
      const mockGameStore = { state } as unknown as EventPrizeGameStore

      const available = getAvailablePokemonStorageSlots(mockGameStore)
      expect(available).toBe(206 - 12) // 194
    })

    it('counts incoming pokemon from various prize formats', () => {
      expect(countIncomingPokemonFromPrize({ type: 'money', amount: 100 })).toBe(0)
      expect(countIncomingPokemonFromPrize({ type: 'pokemon', species: 'mew' })).toBe(1)
      expect(countIncomingPokemonFromPrize(JSON.stringify({ species: 'celebi', level: 10 }))).toBe(1)
      expect(countIncomingPokemonFromPrize({ pokemonList: [{ species: 'eevee' }, { species: 'vaporeon' }] })).toBe(2)
      expect(countIncomingPokemonFromPrize(null)).toBe(0)
    })

    it('validates storage capacity and returns error when storage is full', () => {
      // Team has 6, box has 200 (boxCount 4 * 50 = 200). 0 available!
      const state = {
        boxCount: 4,
        team: new Array(6).fill({ id: 'pikachu' }),
        box: new Array(200).fill({ id: 'rattata' })
      } as any
      const mockGameStore = { state } as unknown as EventPrizeGameStore

      const awards: PendingAward[] = [
        {
          id: 'award-1',
          winner_id: 'u1',
          prize: JSON.stringify({ type: 'pokemon', species: 'dragonite' }),
          received_at: null
        }
      ]

      const check = validateStorageCapacityForAwards(mockGameStore, awards)
      expect(check.ok).toBe(false)
      expect(check.required).toBe(1)
      expect(check.available).toBe(0)
      expect(check.errorMsg).toContain('No tienes suficiente espacio en tu equipo o cajas')
    })

    it('allows claiming when storage capacity is sufficient', () => {
      const state = {
        boxCount: 4,
        team: new Array(6).fill({ id: 'pikachu' }),
        box: new Array(190).fill({ id: 'rattata' }) // 10 slots free in box
      } as any
      const mockGameStore = { state } as unknown as EventPrizeGameStore

      const awards: PendingAward[] = [
        {
          id: 'award-1',
          winner_id: 'u1',
          prize: JSON.stringify({ type: 'pokemon', species: 'dragonite' }),
          received_at: null
        },
        {
          id: 'award-2',
          winner_id: 'u1',
          prize: JSON.stringify({ type: 'money', amount: 5000 }),
          received_at: null
        }
      ]

      const check = validateStorageCapacityForAwards(mockGameStore, awards)
      expect(check.ok).toBe(true)
      expect(check.required).toBe(1)
      expect(check.available).toBe(10)
    })
  })
})
