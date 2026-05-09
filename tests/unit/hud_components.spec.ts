
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HUD_Navigation from '@/components/HUD_Navigation.vue'
import TrainerPanel from '@/components/TrainerPanel.vue'
import InventoryPills from '@/components/InventoryPills.vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useMapStore } from '@/stores/map'

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('HUD Components', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('HUD_Navigation', () => {
    it('applies the correct position class', () => {
      const wrapperTop = mount(HUD_Navigation, { props: { position: 'top' } })
      expect(wrapperTop.find('.hud-nav').classes()).toContain('pos-top')

      const wrapperBottom = mount(HUD_Navigation, { props: { position: 'bottom' } })
      expect(wrapperBottom.find('.hud-nav').classes()).toContain('pos-bottom')
    })

    it('syncs active tab with uiStore', async () => {
      const uiStore = useUIStore()
      uiStore.activeTab = 'map'
      const wrapper = mount(HUD_Navigation)
      
      const mapBtn = wrapper.find('.map-btn')
      expect(mapBtn.classes()).toContain('active')
      
      // Change store value
      uiStore.activeTab = 'gyms'
      await wrapper.vm.$nextTick()
      expect(mapBtn.classes()).not.toContain('active')
    })

    it('opens modals for bag and market', async () => {
      const modalStore = useModalStore()
      const spy = vi.spyOn(modalStore, 'open')
      const wrapper = mount(HUD_Navigation)
      
      // Click Mochila
      const buttons = wrapper.findAll('.hud-nav-btn')
      const bagBtn = buttons.find(b => b.text().includes('MOCHILA'))
      await bagBtn.trigger('click')
      expect(spy).toHaveBeenCalledWith('Inventory')

      // Click Market Submenu Item
      // Market is a group, we need to find the local market button
      const marketSubmenuBtn = buttons.find(b => b.text().includes('LOCAL'))
      await marketSubmenuBtn.trigger('click')
      expect(spy).toHaveBeenCalledWith('Shop')
    })
  })

  describe('TrainerPanel', () => {
    it('displays trainer name and level', () => {
      const gameStore = useGameStore()
      gameStore.state.trainer = 'TestRed'
      gameStore.state.trainerLevel = 10
      
      const wrapper = mount(TrainerPanel)
      expect(wrapper.text()).toContain('TestRed')
      expect(wrapper.text()).toContain('10')
    })

    it('toggles profile on click', async () => {
      const uiStore = useUIStore()
      const spy = vi.spyOn(uiStore, 'toggleProfile')
      const wrapper = mount(TrainerPanel)
      
      await wrapper.trigger('click')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('InventoryPills', () => {
    it('displays money and battle coins', () => {
      const gameStore = useGameStore()
      gameStore.state.money = 1234
      gameStore.state.battleCoins = 56
      
      const wrapper = mount(InventoryPills)
      expect(wrapper.text()).toContain('1.234')
      expect(wrapper.text()).toContain('56')
    })

  })
})
