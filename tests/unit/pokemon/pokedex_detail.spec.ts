// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface CustomWindow extends Window {
  NATURE_DATA?: Record<string, { up: string | null; down: string | null; desc: string }>;
  ABILITY_DATA?: Record<string, { desc: string }>;
}

describe('Pokedex Detail UI Components', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Mock global bridge functions and data
    const cw = window as unknown as CustomWindow
    cw.NATURE_DATA = {
      'Serio': { up: null, down: null, desc: 'Naturaleza equilibrada.' }
    }
    cw.ABILITY_DATA = {
      'Presión': { desc: 'Aumenta el consumo de PP del rival.' }
    }
  })

  describe('PokemonStatBar', () => {
    it('renders in "full" mode by default (two tracks)', () => {
      const wrapper = mount(PokemonStatBar, {
        props: {
          label: 'HP',
          value: 100,
          max: 200,
          iv: 31,
          mode: 'full'
        }
      })
      
      expect(wrapper.find('.main-track').exists()).toBe(true)
      expect(wrapper.find('.iv-track').exists()).toBe(true)
      expect(wrapper.find('.iv-num').text()).toBe('31 IV')
    })

    it('renders only the main track in "stat" mode', () => {
      const wrapper = mount(PokemonStatBar, {
        props: {
          label: 'ATK',
          value: 50,
          max: 100,
          mode: 'stat'
        }
      })
      
      expect(wrapper.find('.main-track').exists()).toBe(true)
      expect(wrapper.find('.iv-track').exists()).toBe(false)
      expect(wrapper.find('.iv-num').exists()).toBe(false)
    })

    it('renders as IV bar in "iv" mode', () => {
      const wrapper = mount(PokemonStatBar, {
        props: {
          label: 'SPE',
          value: 31,
          max: 31,
          mode: 'iv'
        }
      })
      
      expect(wrapper.find('.main-track').exists()).toBe(true)
      const grade = wrapper.find('.grade')
      expect(grade.exists()).toBe(true)
      expect(grade.text()).toBe('S') // 31 IV should be S
    })
  })

  describe('PokemonStatusSection', () => {
    const mockPokemon = {
      hp: 10,
      maxHp: 20,
      level: 5,
      nature: 'serious',
      ability: 'pressure',
      vigor: 5,
      exp: 10,
      expNeeded: 100
    }

    it('displays HP and EXP bars', () => {
      const wrapper = mount(PokemonStatusSection, {
        props: { pokemon: mockPokemon as unknown as Pokemon, context: 'team' }
      })
      
      expect(wrapper.text()).toContain('10 / 20')
      expect(wrapper.text()).toContain('10 / 100')
    })

interface TooltipProps {
  description: string;
}

    it('contains Vigor description for breeding', () => {
      const wrapper = mount(PokemonStatusSection, {
        props: { pokemon: mockPokemon as unknown as Pokemon },
        global: { stubs: { PVTooltip: false } }
      })
      
      const vigorTooltip = wrapper.find('.vigor-card').getComponent(PVTooltip)
      expect((vigorTooltip.props() as unknown as TooltipProps).description).toContain('cuántas veces puede reproducirse')
      expect((vigorTooltip.props() as unknown as TooltipProps).description).toContain('NO se recupera')
    })

    it('renders nature and ability tooltips', () => {
      const wrapper = mount(PokemonStatusSection, {
        props: { pokemon: mockPokemon as unknown as Pokemon },
        global: { stubs: { PVTooltip: false } }
      })
      
      const natureTooltip = wrapper.find('.nature-card').getComponent(PVTooltip)
      const abilityTooltip = wrapper.find('.ability-card').getComponent(PVTooltip)
      
      expect((natureTooltip.props() as unknown as TooltipProps).description).toBe('Sin efecto en estadísticas.')
      expect((abilityTooltip.props() as unknown as TooltipProps).description).toBe('• Fuerza al rival a consumir el doble de PP por ataque.')
    })
  })
})
