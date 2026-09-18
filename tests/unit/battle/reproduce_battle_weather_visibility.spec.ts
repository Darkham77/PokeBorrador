/**
 * tests/unit/battle/reproduce_battle_weather_visibility.spec.ts
 * Deterministic reproduction test (RED -> GREEN) verifying that:
 * 1. uiStore.isFastMode does NOT activate solely because a battle is active (foreground combat is NOT a background modal).
 * 2. AtmosphereLayer renders the weather overlay and rain/storm layers when combat is active.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'

describe('Reproduce Battle Weather Visibility & Fast Mode (RED -> GREEN)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uiStore.isFastMode should be false when battle is active without any modal open', () => {
    const uiStore = useUIStore()
    const modalStore = useModalStore()

    expect(modalStore.stack.length).toBe(0)
    expect(uiStore.isFastMode).toBe(false)

    // Activating battle should NOT put the foreground UI into fast mode
    uiStore.setBattleActive(true)

    // FAILS IN RED: Currently uiStore.isFastMode returns true because isAnyBlockingModalOpen checks isBattleActive
    expect(uiStore.isFastMode).toBe(false)
  })

  it('AtmosphereLayer must render storm weather elements when visible and not in fast mode', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'storm',
        isVisible: true,
        isFastMode: false,
        isPerformanceMode: false,
        isLowPower: false,
        animSeed: 0.5
      }
    })

    await nextTick()
    await nextTick()

    // 1. The overlay container must be rendered and visible
    const overlay = wrapper.find('.weather-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.isVisible()).toBe(true)

    // 2. Both rain precipitation layers must exist and be visible
    const rainLayers = wrapper.findAll('.rain-layer')
    expect(rainLayers.length).toBe(2)

    // 3. Lightning elements must exist for storm
    const lightning = wrapper.find('.lightning-bolt')
    expect(lightning.exists()).toBe(true)

    const flash = wrapper.find('.lightning-flash-overlay')
    expect(flash.exists()).toBe(true)
  })

  it('AtmosphereLayer in battle context should stay visible when battle is active', async () => {
    const uiStore = useUIStore()
    uiStore.setBattleActive(true)

    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'storm',
        isVisible: true,
        isFastMode: uiStore.isFastMode,
        isPerformanceMode: uiStore.isFastMode,
        isLowPower: false,
        animSeed: 0.5
      }
    })

    await nextTick()
    await nextTick()

    // FAILS IN RED: If uiStore.isFastMode is true during battle, shouldRenderAtmosphere is false and overlay is hidden
    const overlay = wrapper.find('.weather-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.isVisible()).toBe(true)
    expect(wrapper.findAll('.rain-layer').length).toBe(2)
  })
})
