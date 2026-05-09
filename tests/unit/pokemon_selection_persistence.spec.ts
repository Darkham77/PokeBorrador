// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PokemonSelectionModal from '@/components/modals/PokemonSelectionModal.vue'
import type { Pokemon } from '@/types/pokemon'

interface SelectionModalInstance {
  sortBy: string;
  sortOrder: string;
  activeTags: string[];
  searchQuery: string;
  availablePokemon: Array<{ pokemon: { name: string; nickname: string } }>;
}

// Mock dependencies
// Dynamic mock for gameStore
const mockGameStore = {
  state: { team: [] as Pokemon[], box: [] as Pokemon[], pokedex: [] as string[] }
}
vi.mock('@/stores/game', () => ({
  useGameStore: () => mockGameStore
}))

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store = {} as Record<string, string>
  global.localStorage = {
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null,
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key: string) => { delete store[key] }
  }
}

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

    const vm = wrapper.vm as unknown as SelectionModalInstance

    // Simulate changes
    vm.sortBy = 'level'
    vm.sortOrder = 'desc'
    vm.activeTags = ['team']
    vm.searchQuery = 'pikachu'

    // Watchers are async, wait for the next tick/timeout
    await new Promise(resolve => setTimeout(resolve, 50))

    const saved = JSON.parse(localStorage.getItem('pv_selection_filters') || '{}')
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

    const vm = wrapper.vm as unknown as SelectionModalInstance

    expect(vm.sortBy).toBe('name')
    expect(vm.sortOrder).toBe('asc')
    expect(vm.activeTags).toContain('box')
    expect(vm.searchQuery).toBe('char')
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

    const vm = wrapper.vm as unknown as SelectionModalInstance

    // Should use defaults
    expect(vm.sortBy).toBe('recent')
    expect(vm.sortOrder).toBe('desc')
    expect(vm.activeTags).toEqual([])
  })

  it('filters available pokemon by nickname', async () => {
    // Update dynamic mock
    mockGameStore.state = {
      team: [
        { uid: 'u1', id: 'pikachu', name: 'Pikachu', nickname: 'Sparky', level: 10 },
        { uid: 'u2', id: 'bulbasaur', name: 'Bulbasaur', nickname: 'Leafy 🌿', level: 5 }
      ] as unknown as Pokemon[],
      box: [] as Pokemon[],
      pokedex: [] as string[]
    }

    const wrapper = mount(PokemonSelectionModal, {
      global: {
        stubs: {
          BaseModal: true,
          PVTooltip: true
        }
      }
    })

    const vm = wrapper.vm as unknown as SelectionModalInstance

    // Filter by nickname
    vm.searchQuery = 'spark'
    expect(vm.availablePokemon).toHaveLength(1)
    expect(vm.availablePokemon[0]!.pokemon.nickname).toBe('Sparky')

    // Filter by emoji
    vm.searchQuery = '🌿'
    expect(vm.availablePokemon).toHaveLength(1)
    expect(vm.availablePokemon[0]!.pokemon.nickname).toBe('Leafy 🌿')

    // Filter by species name
    vm.searchQuery = 'bulba'
    expect(vm.availablePokemon).toHaveLength(1)
    expect(vm.availablePokemon[0]!.pokemon.name).toBe('Bulbasaur')
  })
})
