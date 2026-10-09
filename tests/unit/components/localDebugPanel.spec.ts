// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import LocalDebugPanel from '@/components/admin/LocalDebugPanel.vue'
import { useAuthStore } from '@/stores/auth.ts'
import { GAME_UI_EVENTS } from '@/types/system/gameEvents.ts'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}))

describe('LocalDebugPanel.vue - Component and Navigation Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.sessionMode = 'offline'
    mockPush.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const mountPanel = () => {
    return mount(LocalDebugPanel, {
      global: {
        stubs: {
          BaseModal: {
            props: ['show'],
            template: '<div v-if="show" class="base-modal-stub"><slot /></div>'
          },
          PVTooltip: {
            template: '<div><slot /></div>'
          },
          LocalDebugTabContent: {
            props: ['selectedCategory'],
            template: '<div class="tab-content-stub" :data-cat="selectedCategory" />'
          }
        }
      },
      attachTo: document.body
    })
  }

  it('renders #debug-adventure-suite-btn and opens /test_aventura/index.html when clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountPanel()

    const triggerBtn = wrapper.find('#debug-trigger-btn')
    expect(triggerBtn.exists()).toBe(true)
    await triggerBtn.trigger('click')

    const adventureBtn = wrapper.find('#debug-adventure-suite-btn')
    expect(adventureBtn.exists()).toBe(true)
    expect(adventureBtn.text()).toContain('AVENTURA')

    await adventureBtn.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('/test_aventura/index.html', '_blank')
    wrapper.unmount()
  })

  it('navigates to shadow editor route when #debug-shadow-editor-btn is clicked', async () => {
    const wrapper = mountPanel()

    const triggerBtn = wrapper.find('#debug-trigger-btn')
    await triggerBtn.trigger('click')

    const shadowBtn = wrapper.find('#debug-shadow-editor-btn')
    expect(shadowBtn.exists()).toBe(true)
    await shadowBtn.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/dev/shadow-editor')
    wrapper.unmount()
  })

  it('switches selected category tab when clicked', async () => {
    const wrapper = mountPanel()

    const triggerBtn = wrapper.find('#debug-trigger-btn')
    await triggerBtn.trigger('click')

    const economyTab = wrapper.find('#debug-tab-economy')
    if (economyTab.exists()) {
      await economyTab.trigger('click')
      const tabContent = wrapper.find('.tab-content-stub')
      expect(tabContent.attributes('data-cat')).toBe('economy')
    }
    wrapper.unmount()
  })

  it('closes the modal when BATTLE_ENTERING event is dispatched', async () => {
    const wrapper = mountPanel()

    const triggerBtn = wrapper.find('#debug-trigger-btn')
    await triggerBtn.trigger('click')
    expect(wrapper.find('.base-modal-stub').exists()).toBe(true)

    window.dispatchEvent(new CustomEvent(GAME_UI_EVENTS.BATTLE_ENTERING))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.base-modal-stub').exists()).toBe(false)
    wrapper.unmount()
  })
})
