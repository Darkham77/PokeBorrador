// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useBackNavigation } from '@/composables/system/useBackNavigation'
import ModalHost from '@/components/common/ModalHost.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import HUD_Navigation from '@/components/ui/HUD_Navigation.vue'
import TrainerPanel from '@/components/profile/TrainerPanel.vue'
import InventoryPills from '@/components/inventory/InventoryPills.vue'

// Mock router for HUD
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock modal registry
vi.mock('@/logic/modals/registry', () => ({
  MODAL_REGISTRY: {
    TestModal: defineComponent({
      name: 'TestModal',
      template: '<div>Test</div>'
    }),
    TestA: { name: 'TestA' },
    TestB: { name: 'TestB' },
    DebugStackTest: { name: 'DebugStackTest' },
    Inventory: { name: 'Inventory' },
    Shop: { name: 'Shop' },
    Settings: { name: 'Settings' }
  }
}))

const BackNavTestComponent = defineComponent({
  setup() {
    useBackNavigation()
    return {}
  },
  template: '<div><input id="test-input" type="text" /><div id="test-div">Game</div></div>'
})

describe('System Navigation & Modals Suite', () => {
  describe('ModalStore Stacking (LIFO)', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should push modals onto the stack and maintain order', () => {
      const store = useModalStore()
      
      store.open('TestA', { val: 1 })
      store.open('TestB', { val: 2 })
      
      expect(store.stack.length).toBe(2)
      expect(store.stack[0]!.name).toBe('TestA')
      expect(store.stack[1]!.name).toBe('TestB')
    })

    it('should close the top-most modal (LIFO)', () => {
      vi.useFakeTimers()
      const store = useModalStore()
      
      store.open('TestA')
      store.open('TestB')
      
      store.closeTop()
      vi.advanceTimersByTime(600)
      
      expect(store.stack.length).toBe(1)
      expect(store.stack[0]!.name).toBe('TestA')
      vi.useRealTimers()
    })

    it('should close a specific modal by ID', () => {
      vi.useFakeTimers()
      const store = useModalStore()
      
      const idA = store.open('TestA')
      store.open('TestB')
      
      store.close(idA!)
      vi.advanceTimersByTime(600)
      
      expect(store.stack.length).toBe(1)
      expect(store.stack[0]!.name).toBe('TestB')
      vi.useRealTimers()
    })

    it('should close all modals', () => {
      const store = useModalStore()
      
      store.open('TestA')
      store.open('TestB')
      store.closeAll()
      
      expect(store.stack.length).toBe(0)
    })

    it('should correctly report isOpen status', () => {
      const store = useModalStore()
      
      store.open('TestA')
      expect(store.isOpen('TestA')).toBe(true)
      expect(store.isOpen('TestB')).toBe(false)
    })
  })

  describe('Modal Hierarchy & Performance Logic', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('Modal Store State Lifecycle', () => {
      it('should set opening state for 450ms when opening a modal', () => {
        const store = useModalStore()
        store.open('TestModal')
        
        expect(store.stack[0]!.opening).toBe(true)
        
        vi.advanceTimersByTime(449)
        expect(store.stack[0]!.opening).toBe(true)
        
        vi.advanceTimersByTime(1)
        expect(store.stack[0]!.opening).toBe(false)
      })
    })

    describe('ModalHost Hierarchical Logic', () => {
      it('should calculate isSimplified correctly during transitions', async () => {
        const modalStore = useModalStore()
        
        const wrapper = mount(ModalHost, {
          global: {
            stubs: {
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
        expect(providers[0]!.attributes('data-top')).toBe('true')
        expect(providers[0]!.attributes('data-simplified')).toBe('false')

        // 2. Open Modal B (A should be simplified IMMEDIATELY to avoid FX during animation)
        modalStore.open('TestModal')
        await wrapper.vm.$nextTick()
        
        providers = wrapper.findAll('.hierarchy-provider')
        expect(providers.length).toBe(2)
        expect(providers[0]!.attributes('data-simplified')).toBe('true')
        expect(providers[1]!.attributes('data-top')).toBe('true')

        // 3. Finish B's opening animation
        vi.advanceTimersByTime(500)
        modalStore.stack[1]!.opening = false
        await wrapper.vm.$nextTick()
        
        providers = wrapper.findAll('.hierarchy-provider')
        expect(providers[0]!.attributes('data-simplified')).toBe('true')

        // 4. Start closing B (A should restore effects immediately)
        const modalB = modalStore.stack[1]!
        modalStore.close(modalB.id)
        modalB.closing = true
        await wrapper.vm.$nextTick()
        
        providers = wrapper.findAll('.hierarchy-provider')
        expect(providers[0]!.attributes('data-simplified')).toBe('false')
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
              isModalPerformanceMode: perfMode
            }
          }
        })

        expect(wrapper.classes()).toContain('is-simplified')
        expect(wrapper.find('.pv-fx-shiny-overlay').exists()).toBe(false)

        perfMode.value = false
        uiStore.isSimplifiedModalsMode = true
        await wrapper.vm.$nextTick()
        expect(wrapper.classes()).toContain('is-simplified')
      })
    })
  })

  describe('HUD Navigation Components', () => {
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
        
        uiStore.activeTab = 'gyms'
        await wrapper.vm.$nextTick()
        expect(mapBtn.classes()).not.toContain('active')
      })

      it('opens modals for bag and market', async () => {
        const modalStore = useModalStore()
        const uiStore = useUIStore()
        const spy = vi.spyOn(modalStore, 'open')
        const wrapper = mount(HUD_Navigation)
        
        const bagBtn = wrapper.findAll('button').find(b => b.text().includes('MOCHILA'))
        await bagBtn!.trigger('click')
        expect(spy).toHaveBeenCalledWith('Inventory')

        uiStore.openHudGroup = 'MARKET'
        await wrapper.vm.$nextTick()

        const marketSubmenuBtn = wrapper.findAll('button').find(b => b.text().includes('LOCAL'))
        await marketSubmenuBtn!.trigger('click')
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

  describe('useBackNavigation Composable', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.restoreAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('debe establecer una trampa en el historial al montarse para evitar salir del juego', () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState')
      const wrapper = mount(BackNavTestComponent)

      expect(pushStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ pokevicioGuard: true }),
        '',
        expect.any(String)
      )

      wrapper.unmount()
    })

    it('debe bloquear los botones laterales de navegación del ratón (botón 3 y 4)', () => {
      const wrapper = mount(BackNavTestComponent)

      const mouseEventBack = new MouseEvent('mouseup', { button: 3, cancelable: true, bubbles: true })
      const preventDefaultSpyBack = vi.spyOn(mouseEventBack, 'preventDefault')
      window.dispatchEvent(mouseEventBack)
      expect(preventDefaultSpyBack).toHaveBeenCalled()

      const mouseEventForward = new MouseEvent('mouseup', { button: 4, cancelable: true, bubbles: true })
      const preventDefaultSpyForward = vi.spyOn(mouseEventForward, 'preventDefault')
      window.dispatchEvent(mouseEventForward)
      expect(preventDefaultSpyForward).toHaveBeenCalled()

      const auxClickEvent = new MouseEvent('auxclick', { button: 3, cancelable: true, bubbles: true })
      const preventDefaultAux = vi.spyOn(auxClickEvent, 'preventDefault')
      window.dispatchEvent(auxClickEvent)
      expect(preventDefaultAux).toHaveBeenCalled()

      const normalClick = new MouseEvent('mouseup', { button: 0, cancelable: true, bubbles: true })
      const preventDefaultNormal = vi.spyOn(normalClick, 'preventDefault')
      window.dispatchEvent(normalClick)
      expect(preventDefaultNormal).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('debe bloquear atajos de teclado de navegación de historial (Alt+Left, BrowserBack) y Backspace fuera de inputs', () => {
      const wrapper = mount(BackNavTestComponent)

      // Alt + ArrowLeft
      const altLeftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, cancelable: true, bubbles: true })
      const preventAltLeft = vi.spyOn(altLeftEvent, 'preventDefault')
      window.dispatchEvent(altLeftEvent)
      expect(preventAltLeft).toHaveBeenCalled()

      // BrowserBack
      const browserBackEvent = new KeyboardEvent('keydown', { key: 'BrowserBack', cancelable: true, bubbles: true })
      const preventBrowserBack = vi.spyOn(browserBackEvent, 'preventDefault')
      window.dispatchEvent(browserBackEvent)
      expect(preventBrowserBack).toHaveBeenCalled()

      // Backspace fuera de input (sobre un div genérico)
      const testDiv = wrapper.find('#test-div').element
      const backspaceDivEvent = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true, bubbles: true })
      Object.defineProperty(backspaceDivEvent, 'target', { value: testDiv })
      const preventBackspaceDiv = vi.spyOn(backspaceDivEvent, 'preventDefault')
      window.dispatchEvent(backspaceDivEvent)
      expect(preventBackspaceDiv).toHaveBeenCalled()

      // Backspace dentro de un input NO debe ser prevenido
      const inputEl = wrapper.find('#test-input').element
      const backspaceInputEvent = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true, bubbles: true })
      Object.defineProperty(backspaceInputEvent, 'target', { value: inputEl })
      const preventBackspaceInput = vi.spyOn(backspaceInputEvent, 'preventDefault')
      window.dispatchEvent(backspaceInputEvent)
      expect(preventBackspaceInput).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('debe re-inyectar la trampa de historial en popstate y cerrar modales activos si existen', () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState')
      const wrapper = mount(BackNavTestComponent)

      const modalStore = useModalStore()
      const uiStore = useUIStore()

      // Sin modales abiertos
      pushStateSpy.mockClear()
      window.dispatchEvent(new PopStateEvent('popstate'))
      expect(pushStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ pokevicioGuard: true }),
        '',
        expect.any(String)
      )

      // Con UI abierta (chat)
      uiStore.isChatOpen = true
      pushStateSpy.mockClear()
      window.dispatchEvent(new PopStateEvent('popstate'))
      expect(uiStore.isChatOpen).toBe(false)
      expect(pushStateSpy).toHaveBeenCalled()

      // Con modal en stack
      modalStore.open('Settings')
      expect(modalStore.isOpen('Settings')).toBe(true)
      window.dispatchEvent(new PopStateEvent('popstate'))
      expect(modalStore.isOpen('Settings')).toBe(false)

      wrapper.unmount()
    })
  })
})
