// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EventCardCategoryPreview from '@/components/events/EventCardCategoryPreview.vue'
import { useEventStore } from '@/stores/events'
import type { Event as GameEvent, ResolvedSubCompetition } from '@/logic/events/eventEngine'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

describe('EventCardCategoryPreview.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockEvent: GameEvent = {
    id: 'torneo_pesca',
    name: 'Torneo de Pesca',
    icon: '🎣',
    type: 'competition',
    active: true,
    manual: false,
    description: 'Torneo de pesca multi-especie'
  }

  const mockResolvedSubComps: ResolvedSubCompetition[] = [
    {
      id: 'ivs',
      name: 'Mayor IVs',
      metric: 'total_ivs',
      speciesScope: 'global',
      order: 'max'
    },
    {
      id: 'weight_staryu',
      name: 'Mayor Peso (Staryu)',
      metric: 'weight',
      speciesScope: 'per_species',
      targetSpecies: 'staryu' as PokemonSpeciesId,
      order: 'max'
    },
    {
      id: 'min_weight_staryu',
      name: 'Menor Peso (Staryu)',
      metric: 'weight',
      speciesScope: 'per_species',
      targetSpecies: 'staryu' as PokemonSpeciesId,
      order: 'min'
    },
    {
      id: 'weight_magikarp',
      name: 'Mayor Peso (Magikarp)',
      metric: 'weight',
      speciesScope: 'per_species',
      targetSpecies: 'magikarp' as PokemonSpeciesId,
      order: 'max'
    }
  ]

  const mockSpeciesList: PokemonSpeciesId[] = ['staryu' as PokemonSpeciesId, 'magikarp' as PokemonSpeciesId]

  it('renders species tabs with sprite, name, and wrap container', async () => {
    const wrapper = mount(EventCardCategoryPreview, {
      props: {
        event: mockEvent,
        resolvedSubComps: mockResolvedSubComps,
        cardSpeciesList: mockSpeciesList
      }
    })

    // Tabs container must exist
    const tabsContainer = wrapper.find('.species-tabs-container')
    expect(tabsContainer.exists()).toBe(true)

    // Should have Global + Staryu + Magikarp = 3 tabs
    const tabs = wrapper.findAll('.species-tab-btn')
    expect(tabs.length).toBe(3)

    const tab0 = tabs[0]!
    const tab1 = tabs[1]!
    const tab2 = tabs[2]!

    // Check tab text contents
    expect(tab0.text()).toContain('Global')
    expect(tab1.text()).toContain('Staryu')
    expect(tab2.text()).toContain('Magikarp')

    // Sprites should exist for species tabs
    expect(tab1.find('img.tab-poke-sprite').exists()).toBe(true)
    expect(tab2.find('img.tab-poke-sprite').exists()).toBe(true)
  })

  it('filters active sub-competitions when switching tabs', async () => {
    const wrapper = mount(EventCardCategoryPreview, {
      props: {
        event: mockEvent,
        resolvedSubComps: mockResolvedSubComps,
        cardSpeciesList: mockSpeciesList
      }
    })

    const tabs = wrapper.findAll('.species-tab-btn')
    const tab1 = tabs[1]!

    // Click Staryu tab (index 1)
    await tab1.trigger('click')

    // Staryu tab should be active
    expect(tab1.classes()).toContain('active')

    // Only 2 slots for Staryu should be rendered (weight_staryu, min_weight_staryu)
    const chips = wrapper.findAll('.comp-slot-chip')
    expect(chips.length).toBe(2)
    expect(wrapper.text()).toContain('Mayor Peso')
    expect(wrapper.text()).toContain('Menor Peso')
  })

  it('shows green checkmark when species sub-competitions are completed', async () => {
    const eventStore = useEventStore()
    // Enroll both Staryu categories
    eventStore.userEntries['torneo_pesca:weight_staryu'] = {
      event_id: 'torneo_pesca',
      player_id: 'player-1',
      pokemon_uid: 'poke-1',
      category_id: 'weight_staryu',
      data: { species: 'staryu' as PokemonSpeciesId, weight: 15.5, displayValue: '15.5 kg', score: 15.5 }
    }
    eventStore.userEntries['torneo_pesca:min_weight_staryu'] = {
      event_id: 'torneo_pesca',
      player_id: 'player-1',
      pokemon_uid: 'poke-2',
      category_id: 'min_weight_staryu',
      data: { species: 'staryu' as PokemonSpeciesId, weight: 1.2, displayValue: '1.2 kg', score: 1.2 }
    }

    const wrapper = mount(EventCardCategoryPreview, {
      props: {
        event: mockEvent,
        resolvedSubComps: mockResolvedSubComps,
        cardSpeciesList: mockSpeciesList
      }
    })

    const tabs = wrapper.findAll('.species-tab-btn')
    const staryuTab = tabs[1]!

    // Staryu tab should have is-complete class and check pill
    expect(staryuTab.classes()).toContain('is-complete')
    expect(staryuTab.find('.tab-check-pill.complete').exists()).toBe(true)
    expect(staryuTab.find('.tab-check-pill.complete').text()).toContain('✓')

    // Magikarp tab is NOT complete
    const magikarpTab = tabs[2]!
    expect(magikarpTab.classes()).not.toContain('is-complete')
  })
})
