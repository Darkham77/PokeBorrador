import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useBackNavigation } from '@/composables/system/useBackNavigation'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'

const TestComponent = defineComponent({
  setup() {
    useBackNavigation()
    return {}
  },
  template: '<div><input id="test-input" type="text" /><div id="test-div">Game</div></div>'
})

describe('useBackNavigation Unit Test Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('debe establecer una trampa en el historial al montarse para evitar salir del juego', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState')
    const wrapper = mount(TestComponent)

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ pokevicioGuard: true }),
      '',
      expect.any(String)
    )

    wrapper.unmount()
  })

  it('debe bloquear los botones laterales de navegación del ratón (botón 3 y 4)', () => {
    const wrapper = mount(TestComponent)

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

    // Botones normales (0: izquierdo, 2: derecho) no deben ser prevenidos
    const normalClick = new MouseEvent('mouseup', { button: 0, cancelable: true, bubbles: true })
    const preventDefaultNormal = vi.spyOn(normalClick, 'preventDefault')
    window.dispatchEvent(normalClick)
    expect(preventDefaultNormal).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('debe bloquear atajos de teclado de navegación de historial (Alt+Left, BrowserBack) y Backspace fuera de inputs', () => {
    const wrapper = mount(TestComponent)

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
    const wrapper = mount(TestComponent)

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
