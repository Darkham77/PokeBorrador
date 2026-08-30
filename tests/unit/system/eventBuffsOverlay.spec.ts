// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BuffsOverlay from '@/components/overlays/BuffsOverlay.vue'
import { useBuffsStore } from '@/stores/battle/buffs'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('BuffsOverlay.vue & useBuffsStore - Global Event Countdown Badges', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mockMiningEvent: GameEvent = {
    id: 'evento_mineria',
    name: 'Fiebre Minera',
    icon: '⛏️',
    type: 'boost',
    active: true,
    manual: false,
    description: '¡Mayor eficiencia en excavación y arqueología!',
    start_at: Temporal.Now.instant().subtract({ minutes: 10 }).toString(),
    end_at: Temporal.Now.instant().add({ minutes: 19, seconds: 48 }).toString(),
    config: '{}'
  }

  const globalStubs = {
    PVTooltip: {
      template: '<div class="pv-tooltip-stub"><slot /></div>'
    }
  }

  it('includes active global events in activeBuffs with emoji, remaining time, and isEvent flag', () => {
    const eventStore = useEventStore()
    const buffsStore = useBuffsStore()

    eventStore.activeEvents = [mockMiningEvent]

    const eventBuff = buffsStore.activeBuffs.find(b => b.id === 'event_evento_mineria')
    expect(eventBuff).toBeDefined()
    expect(eventBuff?.isEvent).toBe(true)
    expect(eventBuff?.isEmoji).toBe(true)
    expect(eventBuff?.icon).toBe('⛏️')
    expect(eventBuff?.name).toBe('Fiebre Minera')
    expect(eventBuff?.secs).toBeGreaterThan(1100)
    expect(eventBuff?.secs).toBeLessThanOrEqual(1200)
  })

  it('renders emoji and countdown time in BuffsOverlay.vue', () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockMiningEvent]

    const wrapper = mount(BuffsOverlay, {
      global: { stubs: globalStubs }
    })

    const badge = wrapper.find('#buff-badge-event_evento_mineria')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('is-event-badge')

    const emojiSpan = badge.find('.buff-emoji')
    expect(emojiSpan.exists()).toBe(true)
    expect(emojiSpan.text()).toBe('⛏️')

    const timeSpan = badge.find('.buff-time')
    expect(timeSpan.exists()).toBe(true)
    expect(timeSpan.text()).toMatch(/19:4\d|19:5\d/)
  })

  it('opens EventDetail modal when clicking an event badge', async () => {
    const eventStore = useEventStore()
    const modalStore = useModalStore()

    eventStore.activeEvents = [mockMiningEvent]

    const wrapper = mount(BuffsOverlay, {
      global: { stubs: globalStubs }
    })

    const badge = wrapper.find('#buff-badge-event_evento_mineria')
    expect(badge.exists()).toBe(true)

    await badge.trigger('click')

    expect(modalStore.isOpen('EventDetail')).toBe(true)
  })

  it('renders multiple badges when multiple global events are active', () => {
    const eventStore = useEventStore()
    const mockFishingEvent: GameEvent = {
      id: 'evento_pesca',
      name: 'Gran Torneo de Pesca',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: true,
      description: '¡Captura ejemplares récord!',
      config: '{}'
    }

    eventStore.activeEvents = [mockMiningEvent, mockFishingEvent]

    const wrapper = mount(BuffsOverlay, {
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('#buff-badge-event_evento_mineria').exists()).toBe(true)
    expect(wrapper.find('#buff-badge-event_evento_pesca').exists()).toBe(true)
    expect(wrapper.text()).toContain('⛏️')
    expect(wrapper.text()).toContain('🎣')
  })

  it('is visible only when activeTab is "map" and hidden in other tabs (e.g. "box", "pokedex", "bag", "gyms")', async () => {
    const uiStore = useUIStore(pinia)
    const eventStore = useEventStore(pinia)
    eventStore.activeEvents = [mockMiningEvent]

    uiStore.activeTab = 'map'
    const wrapper = mount(BuffsOverlay, {
      global: { plugins: [pinia], stubs: globalStubs }
    })

    expect(wrapper.find('.buffs-overlay').exists()).toBe(true)

    uiStore.activeTab = 'box'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

    uiStore.activeTab = 'pokedex'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

    uiStore.activeTab = 'bag'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

    uiStore.activeTab = 'gyms'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.buffs-overlay').exists()).toBe(false)

    uiStore.activeTab = 'map'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.buffs-overlay').exists()).toBe(true)
  })
})
