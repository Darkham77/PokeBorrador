/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useBoxFilters } from '@/composables/pokemon/useBoxFilters'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('useBoxFilters', () => {
  const mockBox = ref([
    { id: 'pikachu', name: 'Pikachu', nickname: 'Sparky', level: 25 },
    { id: 'bulbasaur', name: 'Bulbasaur', nickname: null, level: 5 },
    { id: 'charmander', name: 'Charmander', nickname: 'Blaze 🔥', level: 10 }
  ]) as Ref<Pokemon[]>

  let filtersObj: ReturnType<typeof useBoxFilters>

  beforeEach(() => {
    filtersObj = useBoxFilters(mockBox)
    filtersObj.resetFilters()
  })

  it('should filter by species name', () => {
    filtersObj.filters.value.search = 'pika'
    const results = filtersObj.processedBoxList.value
    expect(results).toHaveLength(1)
    expect(results[0]!.p!.id).toBe('pikachu')
  })

  it('should filter by nickname', () => {
    filtersObj.filters.value.search = 'sparky'
    const results = filtersObj.processedBoxList.value
    expect(results).toHaveLength(1)
    expect(results[0]!.p!.id).toBe('pikachu')
  })

  it('should filter by emoji nickname', () => {
    filtersObj.filters.value.search = '🔥'
    const results = filtersObj.processedBoxList.value
    expect(results).toHaveLength(1)
    expect(results[0]!.p!.id).toBe('charmander')
  })

  it('should be case-insensitive for nicknames', () => {
    filtersObj.filters.value.search = 'SPARKY'
    const results = filtersObj.processedBoxList.value
    expect(results).toHaveLength(1)
    expect(results[0]!.p!.id).toBe('pikachu')
  })
})
