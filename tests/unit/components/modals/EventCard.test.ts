// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EventCard from '@/components/modals/EventCard.vue'
import { useModalStore } from '@/stores/modals'
import type { Event as GameEvent, UpcomingEventOccurrence } from '@/logic/events/eventEngine'

describe('EventCard.vue', () => {
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

  const mockOccurrence: UpcomingEventOccurrence = {
    event: {
      id: 'torneo_pesca',
      name: 'Torneo de Pesca Acuática',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: false,
      description: '¡Competencia semanal de pesca!',
      config: JSON.stringify({ banner: 'pesca_exotica_full' })
    },
    startInstant: Temporal.Now.instant().add({ hours: 20 }),
    endInstant: Temporal.Now.instant().add({ hours: 24 }),
    timeLabel: '18:00 - 22:00 hs',
    dateLabel: 'Mañana',
    dayName: 'Martes',
    isActiveNow: false,
    startsInLabel: 'En 20h'
  }

  it('renders active event correctly with ACTIVO badge', () => {
    const wrapper = mount(EventCard, {
      props: { event: mockActiveEvent },
      global: { plugins: [pinia] }
    })

    expect(wrapper.text()).toContain('Fiebre del Oro y Rivales')
    expect(wrapper.text()).toContain('ACTIVO')
    expect(wrapper.text()).toContain('FINALIZA EN:')
    expect(wrapper.find('.is-upcoming-card').exists()).toBe(false)
  })

  it('renders upcoming event correctly with monochrome banner and single bottom PROXIMO badge', () => {
    const wrapper = mount(EventCard, {
      props: {
        event: mockOccurrence.event,
        occurrence: mockOccurrence
      },
      global: { plugins: [pinia] }
    })

    expect(wrapper.text()).toContain('Torneo de Pesca Acuática')
    expect(wrapper.text()).toContain('INICIA EN:')
    expect(wrapper.text()).toContain('En 20h')
    expect(wrapper.text()).toContain('Mañana · 18:00 - 22:00 hs')
    expect(wrapper.find('.is-upcoming-card').exists()).toBe(true)
    expect(wrapper.find('.is-upcoming-banner').exists()).toBe(true)
    expect(wrapper.find('.upcoming-badge').text()).toContain('PRÓXIMO')
  })

  it('opens EventDetail modal on click', async () => {
    const modalStore = useModalStore()
    const wrapper = mount(EventCard, {
      props: { event: mockActiveEvent },
      global: { plugins: [pinia] }
    })

    await wrapper.trigger('click')
    expect(modalStore.isOpen('EventDetail')).toBe(true)
  })
})
