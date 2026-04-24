// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MapCard from '@/components/map/MapCard.vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'

// Mock dependencies
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/logic/services/assetService', () => ({ 
  getAssetUrl: vi.fn((type, name) => `/assets/${type}/${name}`),
  ASSET_TYPES: { MAP: 'map', POKEMON: 'pokemon' }
}))
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id) => ({ id, name: id.toUpperCase() }))
  }
}))

// Global mock for ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MapCard Discovery Logic', () => {
  let uiStore, gameStore

  beforeEach(() => {
    setActivePinia(createPinia())
    uiStore = useUIStore()
    gameStore = useGameStore()
    
    // Setup basic state
    gameStore.state = {
      pokedex: [],
      seenPokedex: [],
      faction: 'power'
    }
  })

  const defaultProps = {
    map: { id: 'route-1', name: 'Route 1' },
    dominance: {
      guardian: { id: 'pidgey', captured: false },
      winner: 'neutral'
    },
    spawnPool: { generic: ['pidgey', 'rattata'], specific: [], rates: {} }
  }

  it('renders guardian as silhouette if not seen', () => {
    const wrapper = mount(MapCard, { props: defaultProps })
    const guardianImg = wrapper.find('.guardian-mini-sprite')
    
    expect(guardianImg.classes()).toContain('spawn-silhouette')
    expect(wrapper.vm.processedGuardian.name).toBe('???')
  })

  it('reveals guardian name and sprite if seen', async () => {
    gameStore.state.seenPokedex = ['pidgey']
    const wrapper = mount(MapCard, { props: defaultProps })
    const guardianImg = wrapper.find('.guardian-mini-sprite')
    
    expect(guardianImg.classes()).not.toContain('spawn-silhouette')
    expect(wrapper.vm.processedGuardian.name).toBe('PIDGEY')
  })

  it('reveals everything when debug mode is active', async () => {
    uiStore.debugPokedexMode = 'seen'
    const wrapper = mount(MapCard, { props: defaultProps })
    const guardianImg = wrapper.find('.guardian-mini-sprite')
    
    expect(guardianImg.classes()).not.toContain('spawn-silhouette')
    expect(wrapper.vm.processedGuardian.name).toBe('PIDGEY')
    
    // Check grid too
    const spawns = wrapper.vm.processedGrid.filter(s => s.id)
    expect(spawns.length).toBeGreaterThan(0)
    spawns.forEach(s => {
      expect(s.isSeen).toBe(true)
      expect(s.name).not.toBe('???')
    })
  })
})
