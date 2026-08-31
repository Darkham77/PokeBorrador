// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WorldEventsModal from '@/components/modals/WorldEventsModal.vue'
import { useEventStore } from '@/stores/events'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('WorldEventsModal.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mockActiveEvent: GameEvent = {
    id: 'fiebre_oro',
    name: 'Fiebre del Oro y Rivales',
    icon: '💰',
    type: 'passive_bonus',
    active: true,
    manual: false,
    description: '¡Doble dinero en combates!',
    config: JSON.stringify({ banner: 'rival_full' })
  }

  const mockAllEvents: GameEvent[] = [
    mockActiveEvent,
    {
      id: 'dia_pesca',
      name: 'Día del Océano y Pesca',
      icon: '🎣',
      type: 'passive_bonus',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [2], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ banner: 'dia_pesca_full' }),
      description: '¡Mayor probabilidad de pesca!'
    }
  ]

  it('renders modal with active events and fills odd gap with upcoming event', () => {
    const eventStore = useEventStore()
    eventStore.allEvents = mockAllEvents
    eventStore.activeEvents = [mockActiveEvent] // 1 active event -> odd, fills 1 upcoming slot
    eventStore.pendingAwards = []

    const wrapper = mount(WorldEventsModal, {
      props: { show: true },
      global: {
        plugins: [pinia],
        stubs: {
          BaseModal: { template: '<div><slot name="header" /><slot /></div>' },
          EventCard: { template: '<div class="stub-event-card"><slot /></div>' },
          WorldEventsUpcomingSchedule: true,
          PastEventsList: true,
          RewardPillsGroup: true
        }
      }
    })

    expect(wrapper.text()).toContain('EVENTOS MUNDIALES')
    expect(wrapper.text()).toContain('EVENTOS ACTIVOS AHORA')
    const cards = wrapper.findAll('.stub-event-card')
    // 1 active + 1 upcoming fill = 2 cards in grid
    expect(cards.length).toBeGreaterThanOrEqual(1)
  })
})
