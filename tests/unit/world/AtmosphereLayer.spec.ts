/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'

// Mock the logger
vi.mock('@/logic/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('AtmosphereLayer', () => {
  it('should render leaf elements when weather is wind and is visible', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'wind',
        isVisible: true,
        isPerformanceMode: false
      }
    })

    // Wait for ticks
    await nextTick()
    await nextTick()

    const leaves = wrapper.findAll('.leaf-element')
    expect(leaves.length).toBe(8)
  })

  it('should render half the leaf elements when low power mode is active', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'wind',
        isVisible: true,
        isPerformanceMode: false,
        isLowPower: true
      }
    })

    await nextTick()
    await nextTick()

    const leaves = wrapper.findAll('.leaf-element')
    expect(leaves.length).toBe(4)
  })

  it('should render 15 leaves when weather is storm', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'storm',
        isVisible: true,
        isPerformanceMode: false
      }
    })

    await nextTick()
    await nextTick()

    const leaves = wrapper.findAll('.leaf-element')
    expect(leaves.length).toBe(15)
  })

  it('should react to weather changes', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'clear',
        isVisible: true,
        isPerformanceMode: false
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.findAll('.leaf-element').length).toBe(0)

    // Set weather to wind
    await wrapper.setProps({ weather: 'wind' })

    // Wait for the watcher to trigger and nextTicks to settle
    await nextTick()
    await nextTick()
    await nextTick()
    await nextTick()

    expect(wrapper.findAll('.leaf-element').length).toBe(8)
  })

  it('should cleanup animations when weather is clear', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'wind',
        isVisible: true,
        isPerformanceMode: false
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.findAll('.leaf-element').length).toBe(8)

    // Set weather to clear
    await wrapper.setProps({ weather: 'clear' })

    await nextTick()
    await nextTick()
    await nextTick()
    await nextTick()

    expect(wrapper.findAll('.leaf-element').length).toBe(0)
  })
})
