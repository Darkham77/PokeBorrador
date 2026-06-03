/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useBoxFilters } from '@/composables/useBoxFilters'
import type { Pokemon } from '@/types/pokemon'

// Mock the data provider
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id) => {
      if (id === 'pikachu') return { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 } // BST 320
      if (id === 'bulbasaur') return { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 } // BST 318
      return null
    })
  }
}))

describe('useBoxFilters - Total Power (BST + IVs)', () => {
  const mockBox = ref([
    { 
      id: 'pikachu', 
      name: 'Pikachu', 
      level: 25, 
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } // Total IVs: 186, TOTAL: 320 + 186 = 506
    },
    { 
      id: 'bulbasaur', 
      name: 'Bulbasaur', 
      level: 5, 
      ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } // Total IVs: 0, TOTAL: 318 + 0 = 318
    }
  ]) as Ref<Pokemon[]>

  let filtersObj: ReturnType<typeof useBoxFilters>

  beforeEach(() => {
    filtersObj = useBoxFilters(mockBox)
    filtersObj.resetFilters()
  })

  it('should filter by TOTAL power range', () => {
    // Filter for > 500
    filtersObj.filters.value.bstMin = 500
    let results = filtersObj.processedBoxList.value
    expect(results).toHaveLength(1)
    expect(results[0]!.p!.id).toBe('pikachu')

    // Filter for < 400
    filtersObj.filters.value.bstMin = 0
    filtersObj.filters.value.bstMax = 400
    results = filtersObj.processedBoxList.value
    expect(results).toHaveLength(1)
    expect(results[0]!.p!.id).toBe('bulbasaur')
  })

  it('should sort by TOTAL power (BST + IVs)', () => {
    filtersObj.sortMode.value = 'bst'
    filtersObj.sortDirection.value = 'desc'
    const results = filtersObj.processedBoxList.value
    expect(results[0]!.p!.id).toBe('pikachu') // 506
    expect(results[1]!.p!.id).toBe('bulbasaur') // 318
  })
})
