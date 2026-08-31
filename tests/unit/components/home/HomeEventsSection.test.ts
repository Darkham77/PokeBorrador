import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeEventsSection from '@/components/home/HomeEventsSection.vue'
import { useEventStore } from '@/stores/events'

describe('HomeEventsSection.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders pending awards box and active events', () => {
    const eventStore = useEventStore()
    eventStore.pendingAwards = [
      {
        id: 'award-1',
        event_id: 'fiebre_oro',
        prize: JSON.stringify({ money: 1000 })
      } as any
    ]
    eventStore.activeEvents = [
      {
        id: 'fiebre_oro',
        name: 'Fiebre del Oro',
        description: 'Doble ganancia de monedas en combates.',
        icon: '💰'
      } as any
    ]

    const wrapper = mount(HomeEventsSection, {
      global: {
        stubs: {
          EventCard: { template: '<div class="stub-event-card">EventCard: Fiebre del Oro</div>' },
          RewardPillsGroup: { template: '<div class="stub-reward-pills">$1,000</div>' },
          WorldEventsUpcomingSchedule: { template: '<div>Upcoming</div>' },
          PastEventsList: { template: '<div>Past</div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('EVENTOS MUNDIALES')
    expect(wrapper.text()).toContain('RECOMPENSAS PENDIENTES')
    expect(wrapper.find('.stub-event-card').exists()).toBe(true)
  })

  it('renders empty state when there are no active events or upcoming occurrences', () => {
    const eventStore = useEventStore()
    eventStore.pendingAwards = []
    eventStore.activeEvents = []
    eventStore.allEvents = []

    const wrapper = mount(HomeEventsSection, {
      global: {
        stubs: {
          EventCard: true,
          RewardPillsGroup: true,
          WorldEventsUpcomingSchedule: true,
          PastEventsList: true
        }
      }
    })

    expect(wrapper.text()).toContain('No hay eventos especiales activos en este momento.')
  })
})
