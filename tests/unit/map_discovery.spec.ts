
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MapCard from '@/components/map/MapCard.vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

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

interface MapCardInstance {
  processedGuardian: {
    name: string;
    isSeen: boolean;
    isCaught: boolean;
    typeInfo: string;
  };
  processedGrid: Array<{
    id: string;
    isSeen: boolean;
    isCaught: boolean;
    name: string;
  }>;
}

describe('MapCard Discovery Logic', () => {
  let uiStore: ReturnType<typeof useUIStore>
  let gameStore: ReturnType<typeof useGameStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    uiStore = useUIStore()
    gameStore = useGameStore()
    
    // Setup basic state
    gameStore.state = {
      pokedex: [] as string[],
      seenPokedex: [] as string[],
      faction: 'power'
    } as unknown as typeof gameStore.state
  })

  const defaultProps = {
    map: { id: 'route-1', name: 'Route 1', lv: 1 },
    dominance: {
      guardian: { id: 'pidgey', captured: false },
      winner: 'neutral'
    },
    spawnPool: { generic: ['pidgey', 'rattata'], specific: [] as string[], rates: {} as Record<string, number> }
  }

  it('renders guardian as silhouette if not seen', () => {
    const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] })
    const guardianImg = wrapper.find('.guardian-mini-sprite')
    const vm = wrapper.vm as unknown as MapCardInstance
    
    expect(guardianImg.classes()).toContain('spawn-silhouette')
    expect(vm.processedGuardian.name).toBe('Desconocido')
  })

  it('reveals guardian name and sprite if seen in combat (but not caught)', async () => {
    // Only in seenPokedex
    const guardianId = defaultProps.dominance.guardian.id // 'pidgey'
    gameStore.state.seenPokedex = [guardianId]
    gameStore.state.pokedex = []
    
    // Update mock to include type for this test
    vi.mocked(pokemonDataProvider.getPokemonData).mockReturnValue({ 
      id: guardianId, 
      name: guardianId.toUpperCase(),
      type: 'normal' 
    } as unknown as ReturnType<typeof pokemonDataProvider.getPokemonData>)
    
    const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] })
    const vm = wrapper.vm as unknown as MapCardInstance
    
    expect(vm.processedGuardian.isSeen).toBe(true)
    expect(vm.processedGuardian.name).toBe(guardianId.toUpperCase())
    expect(vm.processedGuardian.typeInfo).toContain('NORMAL')
  })

  it('shows ??? if never seen', async () => {
    gameStore.state.seenPokedex = []
    gameStore.state.pokedex = []
    
    const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] })
    const vm = wrapper.vm as unknown as MapCardInstance
    
    expect(vm.processedGuardian.isSeen).toBe(false)
    expect(vm.processedGuardian.name).toBe('Desconocido')
  })

  it('reveals info but keeps silhouettes in "seen" debug mode', async () => {
    uiStore.debugPokedexMode = 'seen'
    const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] })
    const guardianImg = wrapper.find('.guardian-mini-sprite')
    const vm = wrapper.vm as unknown as MapCardInstance
    
    // Silhouette stays but name is revealed
    expect(guardianImg.classes()).toContain('spawn-silhouette')
    expect(vm.processedGuardian.name).toBe('PIDGEY')
    
    // Check grid spawns
    const spawns = vm.processedGrid.filter((s: { id: string }) => s.id)
    expect(spawns[0]!.isSeen).toBe(true)
    expect(spawns[0]!.isCaught).toBe(false)
    expect(spawns[0]!.name).not.toBe('Desconocido')
  })

  it('removes silhouettes and adds badges in "caught" debug mode', async () => {
    uiStore.debugPokedexMode = 'caught'
    const wrapper = mount(MapCard, { props: defaultProps as unknown as InstanceType<typeof MapCard>['$props'] })
    const guardianImg = wrapper.find('.guardian-mini-sprite')
    const vm = wrapper.vm as unknown as MapCardInstance
    
    expect(guardianImg.classes()).not.toContain('spawn-silhouette')
    expect(vm.processedGuardian.isCaught).toBe(true)
    
    const spawns = vm.processedGrid.filter((s: { id: string }) => s.id)
    expect(spawns[0]!.isCaught).toBe(true)
  })
})
