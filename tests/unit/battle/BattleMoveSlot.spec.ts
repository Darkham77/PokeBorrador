/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

vi.mock('@/stores/battle/battle', () => ({
  useBattleStore: vi.fn(() => ({
    state: { weather: { type: 'clear' } }
  }))
}))

vi.mock('@/composables/battle/useMoveSlotData', () => ({
  useMoveSlotData: vi.fn(() => ({
    moveData: { value: { type: 'flying', cat: 'physical', power: 90, acc: 95 } },
    finalPower: { value: 90 },
    finalAccuracy: { value: 95 },
    moveModifier: { value: null },
    effectivenessMultiplier: { value: 1.0 }
  }))
}))

describe('BattleMoveSlot.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should disable non-locked moves when player has twoturnmove active', async () => {
    const moveFly = { id: 'fly', name: 'Vuelo', pp: 15, maxPP: 15 } as Move
    const moveTackle = { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 } as Move

    const playerInfo = {
      uid: 'p1',
      name: 'Dragonite',
      volatileCounters: {
        twoturnmove: 1
      },
      lastMove: moveFly
    } as unknown as Pokemon

    // Mount slot for Vuelo (the locked move)
    const wrapperFly = mount(BattleMoveSlot, {
      props: {
        move: moveFly,
        index: 0,
        playerInfo
      }
    })

    // Mount slot for Tackle (the disabled move)
    const wrapperTackle = mount(BattleMoveSlot, {
      props: {
        move: moveTackle,
        index: 1,
        playerInfo
      }
    })

    // Vuelo should NOT be disabled
    const buttonFly = wrapperFly.find('button.move-card-vicio')
    expect(buttonFly.attributes('disabled')).toBeUndefined()
    expect(wrapperFly.find('.move-slot-wrapper').classes()).not.toContain('is-disabled')

    // Tackle SHOULD be disabled
    const buttonTackle = wrapperTackle.find('button.move-card-vicio')
    expect(buttonTackle.attributes('disabled')).toBeDefined()
    expect(wrapperTackle.find('.move-slot-wrapper').classes()).toContain('is-disabled')
  })

  it('should reactively disable moves when twoturnmove is dynamically set', async () => {
    const { ref } = await import('vue')
    const moveFly = { id: 'fly', name: 'Vuelo', pp: 15, maxPP: 15 } as Move
    const moveTackle = { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 } as Move

    const playerInfo = ref({
      uid: 'p1',
      name: 'Dragonite',
      volatileCounters: {}
    } as unknown as Pokemon)

    const wrapper = mount(BattleMoveSlot, {
      props: {
        move: moveTackle,
        index: 1,
        playerInfo: playerInfo.value
      }
    })

    interface TestVMInstance {
      isDisabled: boolean
      $nextTick: () => Promise<void>
    }
    const vmInstance = wrapper.vm as unknown as TestVMInstance

    expect(vmInstance.isDisabled).toBe(false)

    playerInfo.value.volatileCounters = { twoturnmove: 1 }
    playerInfo.value.lastMove = moveFly

    await vmInstance.$nextTick()

    expect(vmInstance.isDisabled).toBe(true)
  })
})
