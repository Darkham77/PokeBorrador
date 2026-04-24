// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PokemonSelectionModal from '@/components/modals/PokemonSelectionModal.vue'

// Mock dependencies
vi.mock('@/stores/game', () => ({
  useGameStore: () => ({
    state: { pokedex: [] }
  })
}))

describe('PokemonSelectionModal Persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('saves filters to localStorage when changed', async () => {
    const wrapper = mount(PokemonSelectionModal, {
      props: {
        isOpen: true,
        pokemons: [],
        title: 'Select'
      }
    })

    // Simulate changes
    wrapper.vm.sortBy = 'level'
    wrapper.vm.sortOrder = 'desc'
    wrapper.vm.activeTags = ['team']
    wrapper.vm.searchQuery = 'pikachu'

    // Watchers are async, wait for the next tick/timeout
    await new Promise(resolve => setTimeout(resolve, 50))

    const saved = JSON.parse(localStorage.getItem('pv_selection_filters'))
    expect(saved).not.toBeNull()
    expect(saved.sortBy).toBe('level')
    expect(saved.sortOrder).toBe('desc')
    expect(saved.activeTags).toContain('team')
    expect(saved.searchQuery).toBe('pikachu')
  })

  it('restores filters from localStorage on mount', () => {
    const savedState = {
      sortBy: 'name',
      sortOrder: 'asc',
      activeTags: ['box'],
      searchQuery: 'char'
    }
    localStorage.setItem('pv_selection_filters', JSON.stringify(savedState))

    const wrapper = mount(PokemonSelectionModal, {
      props: {
        isOpen: true,
        pokemons: [],
        title: 'Select'
      }
    })

    expect(wrapper.vm.sortBy).toBe('name')
    expect(wrapper.vm.sortOrder).toBe('asc')
    expect(wrapper.vm.activeTags).toContain('box')
    expect(wrapper.vm.searchQuery).toBe('char')
  })

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('pv_selection_filters', 'invalid-json')

    const wrapper = mount(PokemonSelectionModal, {
      props: {
        isOpen: true,
        pokemons: [],
        title: 'Select'
      }
    })

    // Should use defaults
    expect(wrapper.vm.sortBy).toBe('recent')
    expect(wrapper.vm.sortOrder).toBe('desc')
    expect(wrapper.vm.activeTags).toEqual([])
  })
})
