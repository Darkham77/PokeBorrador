import { describe, it, expect } from 'vitest'
import {
  parseSaleData,
  getSoldItemName,
  getSaleVisual,
  isPurchaseRow,
  getSaleAmount,
  buildDisplayHistory,
  type MarketHistoryRow
} from '@/components/market/marketMyItemsHelper.ts'
import type { ClaimItem } from '@/types/system/game'

function createMockClaim(id: string, assetType: 'money' | 'pokemon' | 'item', data: unknown, sourceId = 's1', extra?: Record<string, unknown>): ClaimItem {
  return {
    id,
    source_type: 'gts',
    source_id: sourceId,
    created_at: '2026-09-01T00:00:00Z',
    asset_data: {
      type: assetType,
      data,
      ...extra
    }
  }
}

describe('marketMyItemsHelper', () => {
  it('parses sale data from JSON string, object, or null', () => {
    expect(parseSaleData(null)).toEqual({})
    expect(parseSaleData('{"name":"Ultra Ball"}')).toEqual({ name: 'Ultra Ball' })
    expect(parseSaleData('invalid json')).toEqual({})
    expect(parseSaleData({ name: 'Potion' })).toEqual({ name: 'Potion' })
  })

  it('gets sold item name for pokemon and items', () => {
    const pokeSale: MarketHistoryRow = {
      id: '1',
      seller_id: 'u1',
      listing_type: 'pokemon',
      data: { name: 'Pikachu', level: 25, isShiny: true },
      price: 5000,
      status: 'sold',
      created_at: '2026-09-01T00:00:00Z'
    }
    expect(getSoldItemName(pokeSale)).toBe('Pikachu (Nv. 25) ✨')

    const itemSale: MarketHistoryRow = {
      id: '2',
      seller_id: 'u1',
      listing_type: 'item',
      data: { name: 'potion', qty: 5 },
      price: 1000,
      status: 'sold',
      created_at: '2026-09-01T00:00:00Z'
    }
    expect(getSoldItemName(itemSale)).toContain('x5')
  })

  it('gets visual asset urls for pokemon and items', () => {
    const pokeSale: MarketHistoryRow = {
      id: '1',
      seller_id: 'u1',
      listing_type: 'pokemon',
      data: { id: 'pikachu', isShiny: false },
      price: 5000,
      status: 'sold',
      created_at: '2026-09-01T00:00:00Z'
    }
    const pokeVisual = getSaleVisual(pokeSale)
    expect(pokeVisual.type).toBe('pokemon')
    expect(pokeVisual.url).toBeTruthy()

    const itemSale: MarketHistoryRow = {
      id: '2',
      seller_id: 'u1',
      listing_type: 'item',
      data: { name: 'potion' },
      price: 500,
      status: 'sold',
      created_at: '2026-09-01T00:00:00Z'
    }
    const itemVisual = getSaleVisual(itemSale)
    expect(itemVisual.type).toBe('item')
    expect(itemVisual.url).toBeTruthy()
  })

  it('determines purchase row correctly', () => {
    const sale: MarketHistoryRow = {
      id: '1',
      seller_id: 'u1',
      listing_type: 'pokemon',
      data: {},
      price: 0,
      status: 'purchased',
      created_at: '2026-09-01T00:00:00Z'
    }
    expect(isPurchaseRow(sale)).toBe(true)

    const claimMoney = createMockClaim('c1', 'money', 1000)
    expect(isPurchaseRow(sale, claimMoney)).toBe(true)

    const claimPoke = createMockClaim('c2', 'pokemon', {})
    expect(isPurchaseRow(sale, claimPoke)).toBe(true)
  })

  it('calculates sale amount with fee or claim override', () => {
    const sale: MarketHistoryRow = {
      id: '1',
      seller_id: 'u1',
      listing_type: 'item',
      data: {},
      price: 1000,
      status: 'sold',
      created_at: '2026-09-01T00:00:00Z'
    }
    expect(getSaleAmount(sale, undefined, 0.05)).toBe(950)

    const claim = createMockClaim('c1', 'money', 980)
    expect(getSaleAmount(sale, claim, 0.05)).toBe(980)
  })

  it('builds display history merging unmatched pending claims', () => {
    const history: MarketHistoryRow[] = [
      {
        id: 'h1',
        seller_id: 'u1',
        listing_type: 'item',
        data: { name: 'potion' },
        price: 500,
        status: 'sold',
        created_at: '2026-09-01T00:00:00Z'
      }
    ]

    const claim1 = createMockClaim('c1', 'money', 475, 'h1')
    const claim2 = createMockClaim('c2', 'money', 2000, 'unmatched_sale', { sold_item: { name: 'elixir' } })
    const claims: ClaimItem[] = [claim1, claim2]

    const claimsMap = new Map<string, ClaimItem>()
    claimsMap.set('h1', claim1)
    claimsMap.set('c1', claim1)
    claimsMap.set('unmatched_sale', claim2)
    claimsMap.set('c2', claim2)

    const merged = buildDisplayHistory(history, claims, claimsMap, 0.05)
    expect(merged.length).toBe(2)
    const first = merged[0]
    expect(first?.id).toBe('unmatched_sale')
  })
})
