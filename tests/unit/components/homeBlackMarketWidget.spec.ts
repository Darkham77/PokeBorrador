// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { getGMT3Date } from '@/logic/utils/timeUtils'
import HomeBlackMarketWidget from '@/components/home/HomeBlackMarketWidget.vue'
import BlackMarketModal from '@/components/modals/BlackMarketModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

describe('HomeBlackMarketWidget.vue and BlackMarketModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders 3 items in HomeBlackMarketWidget and opens BlackMarket modal on click', async () => {
    const gameStore = useGameStore()
    const modalStore = useModalStore()

    gameStore.state.playerClass = 'rocket'
    gameStore.state.classLevel = 10
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: {
        date: getGMT3Date().toPlainDate().toString(),
        items: ['ultraball', 'maxpotion', 'rarecandy'],
        purchased: ['ultraball']
      }
    }

    const wrapper = mount(HomeBlackMarketWidget, {
      global: {
        stubs: {
          HomeWidgetMinimizeBtn: true
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    // Check that items are rendered
    const cards = wrapper.findAll('.bm-mini-card')
    expect(cards.length).toBe(3)

    // Check that tooltips are attached to each item
    const tooltips = wrapper.findAllComponents(PVTooltip)
    expect(tooltips.length).toBe(3)
    expect(tooltips[0]!.props('title')).toBe('Ultra Ball')
    expect(tooltips[0]!.props('description')).toBeTruthy()

    // The first item is marked purchased ('ultraball')
    expect(cards[0]!.classes()).toContain('is-sold')
    expect(cards[0]!.text()).toContain('Vendido')

    // Click on widget opens modal
    await wrapper.trigger('click')
    expect(modalStore.isOpen('BlackMarket')).toBe(true)
  })

  it('renders restricted access inside BlackMarketModal when player is not level 10 Rocket', () => {
    const gameStore = useGameStore()
    gameStore.state.playerClass = 'rocket'
    gameStore.state.classLevel = 5 // below 10

    const wrapper = mount(BlackMarketModal, {
      props: {
        show: true
      },
      global: {
        stubs: {
          BaseModal: {
            template: '<div class="base-modal-stub"><slot name="header" /><slot /></div>'
          }
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    expect(wrapper.find('.bm-unauthorized-box').exists()).toBe(true)
    expect(wrapper.text()).toContain('ACCESO RESTRINGIDO')
    expect(wrapper.find('.bm-grid').exists()).toBe(false)
  })

  it('renders authorized 3-item grid in BlackMarketModal when player is level 10 Rocket', () => {
    const gameStore = useGameStore()
    gameStore.state.playerClass = 'rocket'
    gameStore.state.classLevel = 12
    gameStore.state.money = 50000
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: {
        date: '2026-09-11',
        items: ['ultraball', 'maxpotion', 'rarecandy'],
        purchased: []
      }
    }

    const wrapper = mount(BlackMarketModal, {
      props: {
        show: true
      },
      global: {
        stubs: {
          BaseModal: {
            template: '<div class="base-modal-stub"><slot name="header" /><slot /></div>'
          }
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    expect(wrapper.find('.bm-unauthorized-box').exists()).toBe(false)
    expect(wrapper.find('.bm-modal-header').exists()).toBe(true)
    expect(wrapper.find('.main-title').text()).toContain('MERCADO NEGRO')
    expect(wrapper.find('.rocket-badge').text()).toBe('EXCLUSIVO ROCKET')
    expect(wrapper.find('.sub-title').text()).toBe('STOCK EXCLUSIVO Y CONTRABANDO DIARIO')
    expect(wrapper.find('.header-stats .stat-node.money .value').text()).toContain('50.000')
    expect(wrapper.find('.header-stats .stat-node.level .value').text()).toContain('Nv. 12')

    const cards = wrapper.findAll('.bm-card')
    expect(cards.length).toBe(3)
    expect(wrapper.text()).toContain('OFERTA DIARIA DEL SINDICATO')
  })
})
