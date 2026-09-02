import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeEventsSection from '@/components/home/HomeEventsSection.vue'
import { useEventStore } from '@/stores/events'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { PendingAward } from '@/types/system/stores'

describe('HomeEventsSection.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders pending awards box and active events with clean header', async () => {
    const eventStore = useEventStore()
    const mockAward: PendingAward = {
      id: 'award-1',
      winner_id: 'user-1',
      event_id: 'fiebre_oro',
      prize: JSON.stringify({ money: 1000 }),
      received_at: null
    }
    const mockEvent: GameEvent = {
      id: 'fiebre_oro',
      name: 'Fiebre del Oro',
      description: 'Doble ganancia de monedas en combates.',
      icon: '💰',
      active: true
    }

    eventStore.pendingAwards = [mockAward]
    eventStore.activeEvents = [mockEvent]

    const wrapper = mount(HomeEventsSection, {
      global: {
        stubs: {
          EventCard: { template: '<div class="stub-event-card">EventCard: Fiebre del Oro</div>' },
          RewardPillsGroup: { template: '<div class="stub-reward-pills">$1,000</div>' },
          WorldEventsUpcomingSchedule: { template: '<div>Upcoming</div>' },
          PastEventsList: { template: '<div>Past</div>' },
          PVTooltip: { template: '<div><slot /></div>' }
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    expect(wrapper.text()).toContain('EVENTOS MUNDIALES')
    expect(wrapper.text()).toContain('RECOMPENSAS PENDIENTES')
    expect(wrapper.find('.stub-event-card').exists()).toBe(true)

    // Verify refresh button is present in header
    const refreshBtn = wrapper.find('#home-events-refresh-btn')
    expect(refreshBtn.exists()).toBe(true)
    expect(refreshBtn.text()).toContain('REFRESCAR')

    // Test clicking refresh button
    const fetchSpy = vi.spyOn(eventStore, 'fetchEvents').mockResolvedValue()
    await refreshBtn.trigger('click')
    expect(fetchSpy).toHaveBeenCalled()
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
          PastEventsList: true,
          PVTooltip: { template: '<div><slot /></div>' }
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    expect(wrapper.text()).toContain('No hay eventos especiales activos en este momento.')
  })

  it('renders bottom carousel pagination bar and navigates when multiple active events exceed visible slots', async () => {
    const eventStore = useEventStore()
    const mockEvents: GameEvent[] = [
      { id: 'ev-1', name: 'Evento 1', description: 'Desc 1', active: true },
      { id: 'ev-2', name: 'Evento 2', description: 'Desc 2', active: true },
      { id: 'ev-3', name: 'Evento 3', description: 'Desc 3', active: true },
      { id: 'ev-4', name: 'Evento 4', description: 'Desc 4', active: true },
      { id: 'ev-5', name: 'Evento 5', description: 'Desc 5', active: true },
      { id: 'ev-6', name: 'Evento 6', description: 'Desc 6', active: true }
    ]
    eventStore.activeEvents = mockEvents

    const wrapper = mount(HomeEventsSection, {
      global: {
        stubs: {
          EventCard: { template: '<div class="stub-event-card"><slot /></div>' },
          EventPendingAwardsBanner: true,
          WorldEventsUpcomingSchedule: true,
          PastEventsList: true,
          PVTooltip: { template: '<div><slot /></div>' }
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    // Carousel pagination bar should exist below the cards
    const paginationBar = wrapper.find('.carousel-pagination-bar')
    expect(paginationBar.exists()).toBe(true)

    // Dots should be rendered for each page
    const dots = wrapper.findAll('.carousel-dot')
    expect(dots.length).toBeGreaterThan(1)
    expect(dots[0]?.classes()).toContain('active')

    // Click on the second dot
    expect(dots[1]).toBeDefined()
    await dots[1]!.trigger('click')
    expect(dots[1]?.classes()).toContain('active')

    // Click on previous arrow button
    const prevBtn = paginationBar.find('button[aria-label="Página anterior"]')
    expect(prevBtn.exists()).toBe(true)
    await prevBtn.trigger('click')
    expect(dots[0]?.classes()).toContain('active')

    // Click on next arrow button
    const nextBtn = paginationBar.find('button[aria-label="Página siguiente"]')
    expect(nextBtn.exists()).toBe(true)
    await nextBtn.trigger('click')
    expect(dots[1]?.classes()).toContain('active')
  })

  it('supports drag and swipe gestures on the active events wrapper', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [
      { id: 'ev-1', name: 'Evento 1', description: 'Desc 1', active: true },
      { id: 'ev-2', name: 'Evento 2', description: 'Desc 2', active: true },
      { id: 'ev-3', name: 'Evento 3', description: 'Desc 3', active: true },
      { id: 'ev-4', name: 'Evento 4', description: 'Desc 4', active: true },
      { id: 'ev-5', name: 'Evento 5', description: 'Desc 5', active: true },
      { id: 'ev-6', name: 'Evento 6', description: 'Desc 6', active: true }
    ]

    const wrapper = mount(HomeEventsSection, {
      global: {
        stubs: {
          EventCard: { template: '<div class="stub-event-card"><slot /></div>' },
          EventPendingAwardsBanner: true,
          WorldEventsUpcomingSchedule: true,
          PastEventsList: true,
          PVTooltip: { template: '<div><slot /></div>' }
        },
        directives: {
          'gsap-hover': {}
        }
      }
    })

    const swipeContainer = wrapper.find('.active-events-wrapper')
    expect(swipeContainer.exists()).toBe(true)

    // Simulate drag swipe left (next page)
    await swipeContainer.trigger('pointerdown', { clientX: 300, clientY: 100, pointerId: 1, button: 0 })
    await swipeContainer.trigger('pointermove', { clientX: 200, clientY: 100, pointerId: 1 })
    await swipeContainer.trigger('pointerup', { clientX: 200, clientY: 100, pointerId: 1 })

    const dots = wrapper.findAll('.carousel-dot')
    expect(dots[1]?.classes()).toContain('active')

    // Simulate drag swipe right (prev page)
    await swipeContainer.trigger('pointerdown', { clientX: 200, clientY: 100, pointerId: 1, button: 0 })
    await swipeContainer.trigger('pointermove', { clientX: 300, clientY: 100, pointerId: 1 })
    await swipeContainer.trigger('pointerup', { clientX: 300, clientY: 100, pointerId: 1 })

    expect(dots[0]?.classes()).toContain('active')
  })
})
