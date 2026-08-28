import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EventCard from '@/components/modals/EventCard.vue'
import type { Event } from '@/logic/events/eventEngine'

describe('EventCard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const globalStubs = {
    PVSpriteFX: {
      template: '<div class="pv-sprite-fx-stub"><slot /></div>'
    }
  }

  it('renders species tabs and switches active species slots for multi-species events', async () => {
    const multiSpeciesEvent: Event = {
      id: 'torneo_pesca',
      name: 'Torneo de Pesca',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [2], startHour: 18, endHour: 22 }),
      config: JSON.stringify({
        species: 'shellder,horsea,staryu',
        hasCompetition: true,
        subCompetitions: [
          { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
          { id: 'weight', name: 'Masa y Peso', metric: 'weight', order: 'auto' },
          { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto' }
        ]
      }),
      description: 'Gran torneo de pesca multi-especie'
    }

    const wrapper = mount(EventCard, {
      props: { event: multiSpeciesEvent },
      global: { stubs: globalStubs }
    })

    // 1. Global IVs slot should be present
    expect(wrapper.text()).toContain('Mayor IVs Totales')

    // 2. Species tabs strip should be present with 3 tabs
    const tabsStrip = wrapper.find('.species-tabs-strip')
    expect(tabsStrip.exists()).toBe(true)
    const tabButtons = wrapper.findAll('.species-tab-btn')
    expect(tabButtons.length).toBe(3)

    // 3. First species tab is active by default (shellder)
    expect(tabButtons[0]?.classes()).toContain('active')
    expect(wrapper.text().toLowerCase()).toContain('sin shellder inscripto')

    // 4. Click second tab (horsea)
    await tabButtons[1]?.trigger('click')
    expect(tabButtons[1]?.classes()).toContain('active')
    expect(wrapper.text().toLowerCase()).toContain('sin horsea inscripto')
  })

  it('does NOT render species tabs for single-species events', () => {
    const singleSpeciesEvent: Event = {
      id: 'hora_magikarp',
      name: 'Hora de Magikarp',
      icon: '🐟',
      type: 'competition',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [2], startHour: 18, endHour: 19 }),
      config: JSON.stringify({
        species: 'magikarp',
        hasCompetition: true,
        subCompetitions: [
          { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
          { id: 'weight', name: 'Masa y Peso', metric: 'weight', order: 'auto' },
          { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto' }
        ]
      }),
      description: 'Hora dedicada a Magikarp'
    }

    const wrapper = mount(EventCard, {
      props: { event: singleSpeciesEvent },
      global: { stubs: globalStubs }
    })

    const tabsStrip = wrapper.find('.species-tabs-strip')
    expect(tabsStrip.exists()).toBe(false)
    expect(wrapper.text()).toContain('Mayor IVs Totales')
  })

  it('does NOT render species tabs for Saturday Open Championship (global scope)', () => {
    const saturdayEvent: Event = {
      id: 'gran_concurso_sabado',
      name: 'Gran Concurso del Sábado',
      icon: '🏆',
      type: 'competition',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [6], startHour: 0, endHour: 24 }),
      config: JSON.stringify({
        species: '*',
        competitionScope: 'global',
        hasCompetition: true,
        subCompetitions: [
          { id: 'ivs', name: 'Genética Suprema (IVs Totales)', metric: 'total_ivs', order: 'max' },
          { id: 'weight', name: 'Titanes y Miniaturas (Masa y Peso)', metric: 'weight', order: 'auto' },
          { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto' }
        ]
      }),
      description: 'Campeonato Abierto de Sábado'
    }

    const wrapper = mount(EventCard, {
      props: { event: saturdayEvent },
      global: { stubs: globalStubs }
    })

    const tabsBar = wrapper.find('.species-tabs-bar')
    expect(tabsBar.exists()).toBe(false)
    expect(wrapper.text()).toContain('Mayor IVs Totales')
  })

  it('opens PokedexDetail modal when clicking on a participant mini sprite', async () => {
    const { useModalStore } = await import('@/stores/modals')
    const modalStore = useModalStore()
    const openSpy = vi.spyOn(modalStore, 'open')

    const singleEvent: Event = {
      id: 'torneo_shellder',
      name: 'Torneo Shellder',
      icon: '🐚',
      type: 'competition',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [2], startHour: 18, endHour: 22 }),
      config: JSON.stringify({
        species: 'shellder',
        hasCompetition: true
      }),
      description: 'Torneo Shellder'
    }

    const wrapper = mount(EventCard, {
      props: { event: singleEvent },
      global: { stubs: globalStubs }
    })

    const miniSprite = wrapper.find('.card-mini-sprite')
    expect(miniSprite.exists()).toBe(true)

    await miniSprite.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('PokedexDetail', {
      speciesId: 'shellder',
      context: 'pokedex'
    })
  })

  it('renders dynamic remaining time countdown for active recurring events instead of Indefinido', () => {
    // Event scheduled for today covering current hour
    const todayJsDay = Temporal.Now.zonedDateTimeISO('America/Argentina/Buenos_Aires').dayOfWeek % 7
    const activeRecurringEvent: Event = {
      id: 'active_today_bonus',
      name: 'Bonus Activo Hoy',
      icon: '⚡',
      type: 'passive_bonus',
      active: true,
      manual: false,
      schedule: JSON.stringify({ type: 'weekly', days: [todayJsDay], startHour: 0, endHour: 23.99 }),
      config: JSON.stringify({ expMult: 2.0 }),
      description: 'Evento de prueba activo hoy'
    }

    const wrapper = mount(EventCard, {
      props: { event: activeRecurringEvent },
      global: { stubs: globalStubs }
    })

    const timerBox = wrapper.find('.timer-box')
    expect(timerBox.exists()).toBe(true)
    const timeText = timerBox.find('.value').text()
    expect(timeText).not.toBe('Indefinido')
    expect(timeText).toMatch(/\d+[mh]/)
  })
})
