// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'

describe('BaseRefreshButton.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders standard circular button with vector svg', () => {
    const wrapper = mount(BaseRefreshButton, {
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
    expect(button.attributes('title')).toBe('Actualizar')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('supports size="md"', () => {
    const wrapper = mount(BaseRefreshButton, {
      props: {
        size: 'md'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.classes()).toContain('size-md')
  })

  it('supports variant="pill" with label and custom title', () => {
    const wrapper = mount(BaseRefreshButton, {
      props: {
        id: 'theater-refresh-btn',
        variant: 'pill',
        label: 'ACTUALIZAR',
        title: 'Actualizar Repeticiones'
      },
      global: {
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const button = wrapper.find('button')
    expect(button.attributes('id')).toBe('theater-refresh-btn')
    expect(button.attributes('title')).toBe('Actualizar Repeticiones')
    expect(button.classes()).toContain('btn-refresh-pill')
    expect(wrapper.find('.btn-label').text()).toBe('ACTUALIZAR')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseRefreshButton, {
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

  it('handles loading state with gsap rotation tween', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const setSpy = vi.spyOn(gsap, 'set')

    const wrapper = mount(BaseRefreshButton, {
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
    const wrapper = mount(BaseRefreshButton, {
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
