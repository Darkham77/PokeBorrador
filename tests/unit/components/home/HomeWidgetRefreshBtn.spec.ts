// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import HomeWidgetRefreshBtn from '@/components/home/HomeWidgetRefreshBtn.vue'

describe('HomeWidgetRefreshBtn.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders standard circular refresh button with vector svg', () => {
    const wrapper = mount(HomeWidgetRefreshBtn, {
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('btn-refresh-header')
    expect(button.classes()).toContain('size-sm')

    const svgIcon = wrapper.find('svg.refresh-icon')
    expect(svgIcon.exists()).toBe(true)
    expect(svgIcon.find('path').exists()).toBe(true)

    expect(wrapper.find('.btn-label').exists()).toBe(false)
    expect(button.attributes('title')).toBe('Refrescar contenido')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('supports custom id, variant, label, and title', () => {
    const wrapper = mount(HomeWidgetRefreshBtn, {
      props: {
        id: 'custom-refresh-btn',
        variant: 'pill',
        label: 'ACTUALIZAR',
        title: 'Actualizar lista'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.attributes('id')).toBe('custom-refresh-btn')
    expect(button.attributes('title')).toBe('Actualizar lista')
    expect(button.classes()).toContain('btn-refresh-pill')
    expect(wrapper.find('.btn-label').text()).toBe('ACTUALIZAR')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(HomeWidgetRefreshBtn, {
      props: {
        disabled: true
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('handles loading state and triggers gsap animation', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const setSpy = vi.spyOn(gsap, 'set')

    const wrapper = mount(HomeWidgetRefreshBtn, {
      props: {
        loading: false
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.classes()).not.toContain('is-loading')
    expect(button.attributes('disabled')).toBeUndefined()

    await wrapper.setProps({ loading: true })

    expect(button.classes()).toContain('is-loading')
    expect(button.attributes('disabled')).toBeDefined()
    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotation: '+=360',
        duration: 1,
        repeat: -1,
        ease: 'none'
      })
    )

    await wrapper.setProps({ loading: false })
    expect(button.classes()).not.toContain('is-loading')
    expect(setSpy).toHaveBeenCalledWith(expect.anything(), { rotation: 0 })
  })

  it('emits click event on button click', async () => {
    const wrapper = mount(HomeWidgetRefreshBtn, {
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
