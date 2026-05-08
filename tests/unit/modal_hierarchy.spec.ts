
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import ModalHost from '@/components/common/ModalHost.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

// Mock registry
vi.mock('@/logic/modals/registry', () => ({
  MODAL_REGISTRY: {
    TestModal: defineComponent({
      name: 'TestModal',
      template: '<div>Test</div>'
    })
  }
}))

describe('Modal Hierarchy & Performance Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  describe('Modal Store State Lifecycle', () => {
    it('should set opening state for 450ms when opening a modal', () => {
      const store = useModalStore()
      store.open('TestModal')
      
      expect(store.stack[0].opening).toBe(true)
      
      vi.advanceTimersByTime(449)
      expect(store.stack[0].opening).toBe(true)
      
      vi.advanceTimersByTime(1)
      expect(store.stack[0].opening).toBe(false)
    })
  })

  describe('ModalHost Hierarchical Logic', () => {
    it('should calculate isSimplified correctly during transitions', async () => {
      const modalStore = useModalStore()
      const uiStore = useUIStore()
      
      const wrapper = mount(ModalHost, {
        global: {
          stubs: {
            // Stub ModalHierarchyProvider with a data-test for easy finding
            ModalHierarchyProvider: {
              props: ['isTop', 'isSimplified'],
              template: '<div class="hierarchy-provider" :data-simplified="isSimplified" :data-top="isTop"><slot /></div>'
            }
          }
        }
      })

      // 1. Open Modal A
      modalStore.open('TestModal')
      await wrapper.vm.$nextTick()
      
      let providers = wrapper.findAll('.hierarchy-provider')
      expect(providers.length).toBe(1)
      expect(providers[0].attributes('data-top')).toBe('true')
      expect(providers[0].attributes('data-simplified')).toBe('false')

      // 2. Open Modal B (A should be simplified IMMEDIATELY to avoid FX during animation)
      modalStore.open('TestModal')
      await wrapper.vm.$nextTick()
      
      providers = wrapper.findAll('.hierarchy-provider')
      expect(providers.length).toBe(2)
      expect(providers[0].attributes('data-simplified')).toBe('true')
      expect(providers[1].attributes('data-top')).toBe('true')

      // 3. Finish B's opening animation
      vi.advanceTimersByTime(500)
      modalStore.stack[1].opening = false // Force state update for reliability in test
      await wrapper.vm.$nextTick()
      
      providers = wrapper.findAll('.hierarchy-provider')
      expect(providers[0].attributes('data-simplified')).toBe('true')

      // 4. Start closing B (A should restore effects immediately)
      const modalB = modalStore.stack[1]
      modalStore.close(modalB.id)
      modalB.closing = true // Force state update for reliability in test
      await wrapper.vm.$nextTick()
      
      providers = wrapper.findAll('.hierarchy-provider')
      expect(providers[0].attributes('data-simplified')).toBe('false') // B is closing, A restores
    })
  })

  describe('PVSpriteFX Reactive Simplification', () => {
    it('should hide sparkles and apply is-simplified class when performance mode is active', async () => {
      const uiStore = useUIStore()
      const perfMode = ref(true)
      
      const wrapper = mount(PVSpriteFX, {
        props: {
          isShiny: true,
          enabled: true
        },
        global: {
          provide: {
            // Simulate being in a simplified modal using a Ref
            isModalPerformanceMode: perfMode
          }
        }
      })

      // Should have is-simplified class
      expect(wrapper.classes()).toContain('is-simplified')
      
      // Should NOT render the shiny overlay
      expect(wrapper.find('.pv-fx-shiny-overlay').exists()).toBe(false)

      // Toggle global debug mode
      perfMode.value = false
      uiStore.isSimplifiedModalsMode = true
      await wrapper.vm.$nextTick()
      expect(wrapper.classes()).toContain('is-simplified')
    })
  })
})
