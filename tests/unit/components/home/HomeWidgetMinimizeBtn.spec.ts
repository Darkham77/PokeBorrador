// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeWidgetMinimizeBtn from '@/components/home/HomeWidgetMinimizeBtn.vue'

const mockToggleCollapse = vi.fn()

vi.mock('@/composables/home/useHomeWidgetsCollapse', () => ({
  useHomeWidgetsCollapse: () => ({
    toggleCollapse: mockToggleCollapse
  })
}))

describe('HomeWidgetMinimizeBtn.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with standard minimize-widget-btn class and fontawesome icon', () => {
    const wrapper = mount(HomeWidgetMinimizeBtn, {
      props: {
        widgetId: 'events'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('id')).toBe('home-minimize-events-btn')
    expect(button.classes()).toContain('minimize-widget-btn')
    expect(button.classes()).not.toContain('card-action-btn')

    const icon = wrapper.find('i.fa-chevron-up')
    expect(icon.exists()).toBe(true)
    expect(button.attributes('title')).toBe('Minimizar widget')
  })

  it('triggers toggleCollapse when clicked', async () => {
    const wrapper = mount(HomeWidgetMinimizeBtn, {
      props: {
        widgetId: 'missions'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    await wrapper.find('button').trigger('click')
    expect(mockToggleCollapse).toHaveBeenCalledWith('missions')
  })
})
