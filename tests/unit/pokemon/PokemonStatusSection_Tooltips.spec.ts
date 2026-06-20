
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

// Mock PVTooltip to inspect props
vi.mock('@/components/common/PVTooltip.vue', () => ({
  default: {
    template: '<div class="pv-tooltip-mock"><slot /></div>',
    props: ['title', 'description', 'position']
  }
}))

describe('PokemonStatusSection - Tooltips', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockPokemon = {
    nature: 'bold',
    ability: 'poisonpoint',
    hp: 100,
    maxHp: 100,
    level: 50,
    exp: 0,
    expNeeded: 1000
  }

  it('should pass the correct nature description to the tooltip', () => {
    const wrapper = mount(PokemonStatusSection, {
      props: { pokemon: mockPokemon as unknown as Pokemon }
    })

    // Find the nature card tooltip
    const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
    const natureTooltip = tooltips.find(t => t.props('title') === 'NATURALEZA')
    
    expect(natureTooltip).toBeDefined()
    expect(natureTooltip!.props('description')).toContain('▲ +10% Defensa / ▼ -10% Ataque')
  })

  it('should pass the correct ability description to the tooltip', () => {
    const wrapper = mount(PokemonStatusSection, {
      props: { pokemon: mockPokemon as unknown as Pokemon }
    })

    const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
    const abilityTooltip = tooltips.find(t => t.props('title') === 'HABILIDAD')
    
    expect(abilityTooltip).toBeDefined()
    expect(abilityTooltip!.props('description')).toContain('• El contacto físico puede envenenar al rival (30%).')
  })

  it('should handle case-insensitive nature lookups', () => {
    const wrapper = mount(PokemonStatusSection, {
      props: { pokemon: { ...mockPokemon, nature: 'BOLD' } as unknown as Pokemon }
    })

    const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
    const natureTooltip = tooltips.find(t => t.props('title') === 'NATURALEZA')
    
    expect(natureTooltip).toBeDefined()
    expect(natureTooltip!.props('description')).toContain('▲ +10% Defensa / ▼ -10% Ataque')
  })

  it('should provide fallback description for unknown nature', () => {
    const wrapper = mount(PokemonStatusSection, {
      props: { pokemon: { ...mockPokemon, nature: 'Unknown' } as unknown as Pokemon }
    })

    const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
    const natureTooltip = tooltips.find(t => t.props('title') === 'NATURALEZA')
    
    expect(natureTooltip).toBeDefined()
    expect(natureTooltip!.props('description')).toBe('Naturaleza desconocida.')
  })
})
