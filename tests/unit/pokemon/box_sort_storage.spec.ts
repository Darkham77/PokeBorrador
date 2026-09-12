/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { useBoxFilters } from '@/composables/pokemon/useBoxFilters'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { mockLocalStorage } from '../../helpers/debugSetup.ts'

mockLocalStorage()
if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: (global as unknown as { localStorage: unknown }).localStorage,
    writable: true,
    configurable: true
  })
}

describe('useBoxFilters storage persistence', () => {
  const mockBox = ref([
    { id: 'pikachu', name: 'Pikachu', level: 25, obtainedAt: 1000 },
    { id: 'bulbasaur', name: 'Bulbasaur', level: 5, obtainedAt: 2000 },
    { id: 'charmander', name: 'Charmander', level: 50, obtainedAt: 500 }
  ]) as Ref<Pokemon[]>

  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to recent and desc if localStorage is empty', () => {
    const { sortMode, sortDirection } = useBoxFilters(mockBox)
    expect(sortMode.value).toBe('recent')
    expect(sortDirection.value).toBe('desc')
  })

  it('updates localStorage when sortMode or sortDirection changes', async () => {
    const { sortMode, sortDirection } = useBoxFilters(mockBox)
    sortMode.value = 'level'
    sortDirection.value = 'asc'
    await nextTick()

    expect(localStorage.getItem('box_sort_mode')).toBe('level')
    expect(localStorage.getItem('box_sort_direction')).toBe('asc')
  })

  it('re-initializes from localStorage on a new instance (simulating page reload)', () => {
    localStorage.setItem('box_sort_mode', 'level')
    localStorage.setItem('box_sort_direction', 'asc')

    const { sortMode, sortDirection, processedBoxList } = useBoxFilters(mockBox)
    expect(sortMode.value).toBe('level')
    expect(sortDirection.value).toBe('asc')

    // Since it's level asc, order should be Bulbasaur (5), Pikachu (25), Charmander (50)
    const list = processedBoxList.value
    expect(list[0]!.p!.name).toBe('Bulbasaur')
    expect(list[1]!.p!.name).toBe('Pikachu')
    expect(list[2]!.p!.name).toBe('Charmander')
  })
})
