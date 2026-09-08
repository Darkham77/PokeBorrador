// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HUD_NavSocialGroup from '@/components/ui/navigation/HUD_NavSocialGroup.vue'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { useSocialStore } from '@/stores/social/social'

describe('HUD_NavSocialGroup.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders social main button and toggles group menu', async () => {
    const uiStore = useUIStore()
    const wrapper = mount(HUD_NavSocialGroup, {
      global: {
        plugins: [pinia]
      }
    })

    const socialBtn = wrapper.find('#nav-social-btn')
    expect(socialBtn.exists()).toBe(true)
    expect(socialBtn.text()).toContain('SOCIAL')

    // Open SOCIAL group
    await socialBtn.trigger('click')
    expect(uiStore.openHudGroup).toBe('SOCIAL')
  })

  it('renders friends, arena, and dominance buttons, and strictly DOES NOT render events button', async () => {
    const uiStore = useUIStore()
    const modalStore = useModalStore()
    uiStore.openHudGroup = 'SOCIAL'

    const wrapper = mount(HUD_NavSocialGroup, {
      global: {
        plugins: [pinia]
      }
    })

    // Assert official options exist
    const friendsBtn = wrapper.find('#nav-social-friends-btn')
    expect(friendsBtn.exists()).toBe(true)
    expect(friendsBtn.text()).toContain('AMIGOS')

    const arenaBtn = wrapper.find('#nav-social-arena-btn')
    expect(arenaBtn.exists()).toBe(true)
    expect(arenaBtn.text()).toContain('COLISEO')

    const dominanceBtn = wrapper.find('#nav-social-dominance-btn')
    expect(dominanceBtn.exists()).toBe(true)
    expect(dominanceBtn.text()).toContain('DOMINANCIA')

    // Assert events button is completely removed (dead code eliminated)
    const eventsBtn = wrapper.find('#nav-social-events-btn')
    expect(eventsBtn.exists()).toBe(false)
    expect(wrapper.text()).not.toContain('EVENTOS')

    // Test clicking Dominance opens FactionWar modal
    const openSpy = vi.spyOn(modalStore, 'open')
    await dominanceBtn.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('FactionWar')
    expect(uiStore.openHudGroup).toBeNull()
  })

  it('displays notification badge on friends button when notifications are present', async () => {
    const uiStore = useUIStore()
    const socialStore = useSocialStore()
    uiStore.openHudGroup = 'SOCIAL'
    socialStore.notifications.chats = 2
    socialStore.notifications.friends = 1

    const wrapper = mount(HUD_NavSocialGroup, {
      global: {
        plugins: [pinia]
      }
    })

    const friendsBtn = wrapper.find('#nav-social-friends-btn')
    expect(friendsBtn.find('.hud-notification-badge').exists()).toBe(true)
    expect(friendsBtn.find('.hud-notification-badge').text()).toBe('3')
  })
})
