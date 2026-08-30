import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MapStatusSummary from '@/components/map/MapStatusSummary.vue'
import { useEventStore } from '@/stores/events'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('MapStatusSummary.vue - Event Carousel & Dynamic Responsive Layout', () => {
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
    }
  ]

  const globalStubs = {
    PVTooltip: {
      template: '<div class="pv-tooltip-stub"><slot /></div>'
    }
  }

  it('renders multiple active event banners side-by-side on wide screens (>= 1400px) and emits the exact clicked event', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!]

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const vm = wrapper.vm as unknown as { containerWidth: number; visibleSlots: number; needsCarousel: boolean }
    vm.containerWidth = 1400
    await wrapper.vm.$nextTick()

    expect(vm.visibleSlots).toBeGreaterThanOrEqual(2)
    expect(vm.needsCarousel).toBe(false)

    const eventBanners = wrapper.findAll('.event-banner')
    expect(eventBanners.length).toBe(2)

    // Click first banner -> emits doble_exp
    await eventBanners[0]?.trigger('click')
    expect(wrapper.emitted('openEvent')).toBeTruthy()
    expect(wrapper.emitted('openEvent')?.[0]?.[0]).toEqual(mockEvents[0])

    // Click second banner -> emits gran_concurso_sabado
    await eventBanners[1]?.trigger('click')
    expect(wrapper.emitted('openEvent')?.[1]?.[0]).toEqual(mockEvents[1])
  })

  it('activates carousel with dots on narrow screens (e.g. 500px) when active events exceed visible slots', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!]

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
    vm.containerWidth = 500
    await wrapper.vm.$nextTick()

    expect(vm.visibleSlots).toBe(1)
    expect(vm.needsCarousel).toBe(true)

    // Dots should be visible when carousel is needed with 2 events
    const dots = wrapper.findAll('.carousel-dot')
    expect(dots.length).toBe(2)

    // Go to slide 1 (Gran Concurso)
    vm.goToSlide(1)
    await wrapper.vm.$nextTick()

    const slides = wrapper.findAll('.carousel-slide')
    expect(slides.length).toBeGreaterThanOrEqual(2)

    await slides[1]?.trigger('click')
    const emissions = wrapper.emitted('openEvent')
    expect(emissions).toBeTruthy()
    const lastEmission = emissions?.[emissions.length - 1]?.[0]
    expect(lastEmission).toEqual(mockEvents[1])
  })

  it('supports tablet 2-row stacked mode (e.g. 800px): renders 2 events in Row 1 without carousel when 2 events fit', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockEvents[0]!, mockEvents[1]!]

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const vm = wrapper.vm as unknown as { containerWidth: number; visibleSlots: number; needsCarousel: boolean }
    vm.containerWidth = 800
    await wrapper.vm.$nextTick()

    expect(vm.visibleSlots).toBe(2)
    expect(vm.needsCarousel).toBe(false)

    const eventBanners = wrapper.findAll('.event-banner')
    expect(eventBanners.length).toBe(2)
  })

  it('activates carousel in tablet 2-row mode when 3 events are active but only 2 slots fit (800px)', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [...mockEvents] // 3 events

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const vm = wrapper.vm as unknown as { containerWidth: number; visibleSlots: number; needsCarousel: boolean }
    vm.containerWidth = 800
    await wrapper.vm.$nextTick()

    expect(vm.visibleSlots).toBe(2)
    expect(vm.needsCarousel).toBe(true)

    const dots = wrapper.findAll('.carousel-dot')
    expect(dots.length).toBe(3)
  })

  it('renders static single banner with no carousel dots when only 1 event is active', async () => {
    const eventStore = useEventStore()
    eventStore.activeEvents = [mockEvents[0]!]

    const wrapper = mount(MapStatusSummary, {
      global: { stubs: globalStubs }
    })

    const dots = wrapper.findAll('.carousel-dot')
    expect(dots.length).toBe(0)

    const eventBanner = wrapper.find('.event-banner')
    expect(eventBanner.exists()).toBe(true)

    await eventBanner.trigger('click')
    expect(wrapper.emitted('openEvent')?.[0]?.[0]).toEqual(mockEvents[0])
  })
})
