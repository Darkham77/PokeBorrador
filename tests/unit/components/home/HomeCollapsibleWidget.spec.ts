// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeCollapsibleWidget from '@/components/home/HomeCollapsibleWidget.vue'

const mockIsCollapsed = vi.fn()
const mockToggleCollapse = vi.fn()
const mockGetWidgetBadge = vi.fn()

vi.mock('@/composables/home/useHomeWidgetsCollapse', () => ({
  useHomeWidgetsCollapse: () => ({
    isCollapsed: mockIsCollapsed,
    toggleCollapse: mockToggleCollapse
  })
}))

vi.mock('@/composables/home/useHomeWidgetBadges', () => ({
  useHomeWidgetBadges: () => ({
    getWidgetBadge: mockGetWidgetBadge
  })
}))

describe('HomeCollapsibleWidget.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders default slot when widget is expanded', () => {
    mockIsCollapsed.mockReturnValue(false)

    const wrapper = mount(HomeCollapsibleWidget, {
      props: {
        widgetId: 'events',
        title: 'EVENTOS MUNDIALES',
        icon: '🏆'
      },
      slots: {
        default: '<div class="test-content">Contenido de Eventos</div>'
      }
    })

    expect(wrapper.find('.home-collapsible-expanded').exists()).toBe(true)
    expect(wrapper.find('.test-content').text()).toBe('Contenido de Eventos')
    expect(wrapper.find('.accordion-panel').exists()).toBe(false)
  })

  it('renders notification pill badge when widget is collapsed and has a badge', () => {
    mockIsCollapsed.mockReturnValue(true)
    mockGetWidgetBadge.mockReturnValue(3)

    const wrapper = mount(HomeCollapsibleWidget, {
      props: {
        widgetId: 'buffs',
        title: 'POTENCIADORES & AURAS',
        icon: '⚡'
      }
    })

    expect(wrapper.find('.home-collapsible-panel').exists()).toBe(true)
    expect(wrapper.find('.collapse-title').text()).toBe('POTENCIADORES & AURAS')

    const pill = wrapper.find('.collapse-pill-badge')
    expect(pill.exists()).toBe(true)
    expect(pill.classes()).toContain('hud-notification-badge')
    expect(pill.text()).toBe('3')
    // Asserts that no parentheses are rendered around the badge
    expect(pill.text()).not.toContain('(')
    expect(pill.text()).not.toContain(')')
  })

  it('prefers explicit badge prop over composable getWidgetBadge', () => {
    mockIsCollapsed.mockReturnValue(true)
    mockGetWidgetBadge.mockReturnValue(99)

    const wrapper = mount(HomeCollapsibleWidget, {
      props: {
        widgetId: 'pending_rewards',
        title: 'RECOMPENSAS PENDIENTES',
        icon: '🎁',
        badge: 10
      }
    })

    const pill = wrapper.find('.collapse-pill-badge')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toBe('10')
  })

  it('triggers toggleCollapse when clicking the collapsed accordion bar', async () => {
    mockIsCollapsed.mockReturnValue(true)

    const wrapper = mount(HomeCollapsibleWidget, {
      props: {
        widgetId: 'missions',
        title: 'MISIONES DIARIAS',
        icon: '📜'
      }
    })

    await wrapper.find('.accordion-toggle').trigger('click')
    expect(mockToggleCollapse).toHaveBeenCalledWith('missions')
  })
})
