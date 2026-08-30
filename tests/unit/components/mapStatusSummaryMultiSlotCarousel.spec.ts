import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MapStatusSummary from '@/components/map/MapStatusSummary.vue'
import { useEventStore } from '@/stores/events'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('MapStatusSummary.vue - Multi-Slot Dynamic Event Carousel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockEvents: GameEvent[] = [
    {
      id: 'doble_exp',
      name: 'Fin de Semana de Doble EXP',
      icon: '⚡',
      type: 'passive_bonus',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [6, 0], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ expMult: 2.0, banner: 'doble_exp_full' }),
      description: '¡EXP x2 en todos los combates!'
    },
    {
      id: 'gran_concurso_sabado',
      name: 'Gran Concurso Abierto del Sábado',
      icon: '👑',
      type: 'competition',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [6], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ hasCompetition: true, banner: 'gran_concurso_sabado_full' }),
      description: '¡El gran campeonato de los sábados!'
    },
    {
      id: 'dia_pesca',
      name: 'Día del Océano y Pesca',
      icon: '🎣',
      type: 'passive_bonus',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [2], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ fishingMult: 2.0, banner: 'dia_pesca_full' }),
      description: '¡Mayor probabilidad de pesca!'
    },
    {
      id: 'torneo_especial',
      name: 'Torneo Especial de Maestros',
      icon: '🏆',
      type: 'competition',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [3], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ hasCompetition: true, banner: 'torneo_especial_full' }),
      description: '¡Torneo especial de maestros!'
    }
  ]

  const globalStubs = {
    PVTooltip: {
      template: '<div class="pv-tooltip-stub"><slot /></div>'
    }
  }

  it('renders a multi-slot carousel with 2 visible slots when 3 events are active and screen fits 2 slots (800px)', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!, mockEvents[2]!]

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const vm = wrapper.vm as unknown as {
      containerWidth: number
      visibleSlots: number
      needsCarousel: boolean
      carouselIndex: number
      goToSlide: (idx: number) => void
    }
    vm.containerWidth = 800
    await wrapper.vm.$nextTick()

    expect(vm.visibleSlots).toBe(2)
    expect(vm.needsCarousel).toBe(true)

    // Viewport should exist
    const viewport = wrapper.find('.event-carousel-viewport')
    expect(viewport.exists()).toBe(true)

    // Track should contain individual clickable slides with tooltips
    const slides = wrapper.findAll('.carousel-slide')
    expect(slides.length).toBeGreaterThanOrEqual(3)

    // Clicking slide 1 emits mockEvents[1]
    await slides[1]?.trigger('click')
    expect(wrapper.emitted('openEvent')).toBeTruthy()
    expect(wrapper.emitted('openEvent')?.[0]?.[0]).toEqual(mockEvents[1])

    // Clicking slide 2 emits mockEvents[2]
    await slides[2]?.trigger('click')
    expect(wrapper.emitted('openEvent')?.[1]?.[0]).toEqual(mockEvents[2])
  })

  it('calculates 3 visible slots and activates carousel when 4 events are active and screen is wide (1800px)', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [...mockEvents] // 4 events

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const vm = wrapper.vm as unknown as {
      containerWidth: number
      visibleSlots: number
      needsCarousel: boolean
    }
    vm.containerWidth = 1800
    await wrapper.vm.$nextTick()

    // 1800 - 360 - 16 = 1424px available for events. 1424 / 464 = 3 slots
    expect(vm.visibleSlots).toBe(3)
    expect(vm.needsCarousel).toBe(true)

    // 4 pagination dots for 4 total active events
    const dots = wrapper.findAll('.carousel-dot')
    expect(dots.length).toBe(4)
  })

  it('renders all events statically side-by-side when active count equals visible slots without carousel', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!, mockEvents[2]!] // 3 events

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const vm = wrapper.vm as unknown as {
      containerWidth: number
      visibleSlots: number
      needsCarousel: boolean
    }
    vm.containerWidth = 1800
    await wrapper.vm.$nextTick()

    expect(vm.visibleSlots).toBe(3)
    expect(vm.needsCarousel).toBe(false)

    const staticGrid = wrapper.find('.event-banners-grid')
    expect(staticGrid.exists()).toBe(true)
    const banners = wrapper.findAll('.single-event-banner')
    expect(banners.length).toBe(3)

    // Pokémon Center banner must also exist
    const pokecenter = wrapper.find('.pokecenter-banner')
    expect(pokecenter.exists()).toBe(true)
  })

  it('guarantees Pokemon Center is always rendered with 0, 1, 2, and 3 active events', async () => {
    const eventStore = useEventStore()
    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })
    const vm = wrapper.vm as unknown as { containerWidth: number }
    vm.containerWidth = 1800
    await wrapper.vm.$nextTick()

    // 0 events
    eventStore.activeEvents = []
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pokecenter-banner').exists()).toBe(true)

    // 1 event
    eventStore.activeEvents = [mockEvents[0]!]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pokecenter-banner').exists()).toBe(true)
    expect(wrapper.findAll('.event-banner').length).toBeGreaterThanOrEqual(1)

    // 2 events
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pokecenter-banner').exists()).toBe(true)
    expect(wrapper.findAll('.event-banner').length).toBeGreaterThanOrEqual(2)

    // 3 events
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!, mockEvents[2]!]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pokecenter-banner').exists()).toBe(true)
    expect(wrapper.findAll('.event-banner').length).toBeGreaterThanOrEqual(3)
  })
})
