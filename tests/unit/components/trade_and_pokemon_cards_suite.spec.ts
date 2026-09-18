// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TradeSidePanel from '@/components/social/TradeSidePanel.vue'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { requireItemId } from '@/data/inventory/items'

function createMockPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'mock-uid-1',
    id: requirePokemonSpeciesId('pikachu'),
    name: 'Pikachu',
    level: 50,
    hp: 100,
    maxHp: 100,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    type: 'electric',
    moves: [],
    status: '',
    sleepTurns: 0,
    friendship: 100,
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'hardy',
    ability: 'static',
    isShiny: false,
    exp: 0,
    expNeeded: 100,
    ...overrides,
  }
}

describe('Trade & Pokemon Display Cards UI Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('TradeSidePanel.vue', () => {
    const globalStubs = {
      PokemonDisplayCard: { template: '<div class="pokemon-display-card-stub" />' },
      InventoryItemCard: { template: '<div class="inventory-item-card-stub" />' },
    }

    it('renders title and open-selector button when no pokemon is selected', async () => {
      const wrapper = mount(TradeSidePanel, {
        props: {
          title: 'Tu Oferta',
          isFriendSide: false,
        },
        global: { stubs: globalStubs },
      })

      expect(wrapper.text()).toContain('Tu Oferta')
      expect(wrapper.text()).toContain('OFRECER POKÉMON')

      const selectorBtn = wrapper.find('.btn-open-selector')
      expect(selectorBtn.exists()).toBe(true)
      await selectorBtn.trigger('click')
      expect(wrapper.emitted('open-selector')).toBeTruthy()
    })

    it('renders gift overlay when isGift and isFriendSide are true', () => {
      const wrapper = mount(TradeSidePanel, {
        props: {
          title: 'Oferta Amigo',
          isGift: true,
          isFriendSide: true,
        },
        global: { stubs: globalStubs },
      })

      expect(wrapper.find('.gift-overlay').exists()).toBe(true)
      expect(wrapper.text()).toContain('ESTÁS ENVIANDO UN REGALO')
      expect(wrapper.find('.selected-poke-display').exists()).toBe(false)
    })

    it('emits update:money on input event', async () => {
      const wrapper = mount(TradeSidePanel, {
        props: {
          title: 'Tu Oferta',
          money: 100,
          maxMoney: 5000,
        },
        global: { stubs: globalStubs },
      })

      const input = wrapper.find('.money-input')
      expect(input.exists()).toBe(true)
      await input.setValue('250')
      expect(wrapper.emitted('update:money')?.[0]).toEqual([250])
    })

    it('renders mapped items and handles item toggle and quantity buttons', async () => {
      const pId = requireItemId('antidote')
      const wrapper = mount(TradeSidePanel, {
        props: {
          title: 'Tu Oferta',
          inventory: { [pId]: 5 },
          selectedItems: { [pId]: 2 },
        },
        global: { stubs: globalStubs },
      })

      expect(wrapper.find('.item-selection-grid').exists()).toBe(true)
      expect(wrapper.find('.qty-control-overlay').exists()).toBe(true)
      expect(wrapper.find('.qty-val').text()).toBe('2')

      const incBtn = wrapper.find('.qty-btn.inc')
      await incBtn.trigger('click')
      expect(wrapper.emitted('update-item-qty')?.[0]).toEqual(['antidote', 3])

      const decBtn = wrapper.find('.qty-btn.dec')
      await decBtn.trigger('click')
      expect(wrapper.emitted('update-item-qty')?.[1]).toEqual(['antidote', 1])
    })
  })

  describe('PokemonDisplayCard.vue', () => {
    const globalStubs = {
      PVSpriteFX: { template: '<div class="pv-sprite-fx-stub"><slot /></div>' },
      PVTooltip: { template: '<div class="pv-tooltip-stub"><slot /></div>' },
      PVGenderBadge: { template: '<div class="pv-gender-badge-stub" />' },
      UnifiedBadgePill: { template: '<div class="unified-badge-pill-stub" />' },
      FriendshipSealBadge: { template: '<div class="friendship-seal-badge-stub" />' },
      PokemonTypePills: { template: '<div class="pokemon-type-pills-stub" />' },
    }

    it('mounts and renders pokemon name, level and hp', () => {
      const pokemon = createMockPokemon({ name: 'Pikachu', level: 45, hp: 80, maxHp: 100 })
      const wrapper = mount(PokemonDisplayCard, {
        props: { pokemon, index: 0 },
        global: { stubs: globalStubs },
      })

      expect(wrapper.text()).toContain('Pikachu')
      expect(wrapper.text()).toContain('Nv. 45')
      expect(wrapper.text()).toContain('80 / 100 HP')
    })

    it('emits openDetail when card is clicked', async () => {
      const pokemon = createMockPokemon()
      const wrapper = mount(PokemonDisplayCard, {
        props: { pokemon, index: 2 },
        global: { stubs: globalStubs },
      })

      await wrapper.find('.pokemon-display-card').trigger('click')
      expect(wrapper.emitted('openDetail')).toBeTruthy()
      expect(wrapper.emitted('openDetail')?.[0]).toEqual([2])
    })

    it('renders action buttons and emits openItem, data, sendToBox', async () => {
      const pokemon = createMockPokemon()
      const wrapper = mount(PokemonDisplayCard, {
        props: { pokemon, index: 1, actions: ['item', 'details', 'box'] },
        global: { stubs: globalStubs },
      })

      const itemBtn = wrapper.find('.item-btn')
      expect(itemBtn.exists()).toBe(true)
      await itemBtn.trigger('click')
      expect(wrapper.emitted('openItem')?.[0]).toEqual([1])

      const dataBtn = wrapper.find('.data-btn')
      expect(dataBtn.exists()).toBe(true)
      await dataBtn.trigger('click')
      expect(wrapper.emitted('openDetail')?.[0]).toEqual([1])

      const boxBtn = wrapper.find('.box-btn')
      expect(boxBtn.exists()).toBe(true)
      await boxBtn.trigger('click')
      expect(wrapper.emitted('sendToBox')?.[0]).toEqual([1])
    })

    it('renders rule violation cartel when isRuleViolated is true', () => {
      const pokemon = createMockPokemon()
      const wrapper = mount(PokemonDisplayCard, {
        props: {
          pokemon,
          isRuleViolated: true,
          ruleViolationReason: 'Nivel superior al permitido',
        },
        global: { stubs: globalStubs },
      })

      expect(wrapper.find('.rule-violation-cartel').exists()).toBe(true)
      expect(wrapper.text()).toContain('Nivel superior al permitido')
    })
  })
})
