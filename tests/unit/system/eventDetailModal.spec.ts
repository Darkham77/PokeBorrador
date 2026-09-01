import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EventDetailModal from '@/components/modals/EventDetailModal.vue'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('EventDetailModal.vue', () => {
  const defaultEvent = {
    id: 'doble_exp',
    name: 'Fin de Semana de Doble EXP',
    icon: '⚡',
    type: 'passive_bonus',
    active: true,
    manual: false,
    description: '¡EXP x2 en todos los combates durante el fin de semana!',
    schedule: '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}',
    config: '{"expMult": 2}'
  }

  const globalStubs = {
    BaseModal: {
      template: '<div><slot /></div>'
    }
  }

  it('does NOT display sub-competitions if hasCompetition is absent or false', () => {
    const wrapper = mount(EventDetailModal, {
      props: {
        show: true,
        event: defaultEvent as unknown as GameEvent
      },
      global: {
        stubs: globalStubs
      }
    })

    const text = wrapper.text()
    expect(text).not.toContain('SUB-COMPETENCIAS Y PREMIOS')
    expect(text).not.toContain('Mayor cantidad de IVs totales')
  })

  it('displays sub-competitions, criteria and prizes if hasCompetition is true', () => {
    const competitionEvent = {
      ...defaultEvent,
      config: JSON.stringify({
        species: 'magikarp',
        hasCompetition: true,
        subCompetitions: [
          {
            id: 'ivs',
            name: 'Genética Superior (IVs)',
            metric: 'total_ivs',
            order: 'max',
            prizes: {
              first: { type: 'mixed', money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } },
              second: { type: 'mixed', money: 15000, battleCoins: 100, items: { bottlecap: 2, rarecandy: 3 } },
              third: { type: 'mixed', money: 8000, battleCoins: 50, items: { bottlecap: 1, rarecandy: 1 } }
            }
          }
        ]
      })
    }

    const wrapper = mount(EventDetailModal, {
      props: {
        show: true,
        event: competitionEvent as unknown as GameEvent
      },
      global: {
        stubs: globalStubs
      }
    })

    const text = wrapper.text()
    expect(text).toContain('SUB-COMPETENCIAS Y PREMIOS')
    expect(text).toContain('Mayor cantidad de IVs totales (0 a 186)')
    expect(text).toContain('150 BC')
    expect(text).toContain('Chapa Dorada')
    expect(text).toContain('Caramelo Raro')
  })

  it('renders weekly rotation banner, rotation title, and participant sprites for rotating tournaments', () => {
    const rotatingEvent = {
      id: 'torneo_pesca',
      name: 'Torneo de Pesca Acuática',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: false,
      description: '¡Competencia semanal de pesca!',
      schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
      config: JSON.stringify({
        hasCompetition: true,
        requireCaughtDuringEvent: true,
        rotationTheme: 'weekly_4',
        speciesShinyMult: 3.0,
        speciesRateMult: 2.0,
        weeklyRotations: {
          '1': { species: 'magikarp,gyarados', banner: 'hora_magikarp_full', title: 'Torneo Magikarp & Gyarados' },
          '4': { species: 'dratini,dragonair,lapras', banner: 'pesca_mistica_full', title: 'Torneo de Pesca Mística' }
        },
        subCompetitions: [
          {
            id: 'ivs',
            name: 'Genética Superior (IVs)',
            metric: 'total_ivs',
            order: 'max',
            prizes: {
              first: { type: 'mixed', money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } }
            }
          }
        ]
      })
    }

    const wrapper = mount(EventDetailModal, {
      props: {
        show: true,
        event: rotatingEvent as unknown as GameEvent
      },
      global: {
        stubs: globalStubs
      }
    })

    const text = wrapper.text()
    expect(text).toContain('POKÉMON PARTICIPANTES')

    // Verifies banner is present
    const bannerImg = wrapper.find('.event-banner-img')
    expect(bannerImg.exists()).toBe(true)

    // Verifies participant pills are rendered with sprites
    const participantPills = wrapper.findAll('.participant-pill')
    expect(participantPills.length).toBeGreaterThanOrEqual(2)

    const spriteImages = wrapper.findAll('.participant-sprite')
    expect(spriteImages.length).toBeGreaterThanOrEqual(2)
  })

  it('opens PokedexDetail modal when clicking on a participant sprite pill', async () => {
    const { createPinia, setActivePinia } = await import('pinia')
    const { useModalStore } = await import('@/stores/modals')
    setActivePinia(createPinia())
    const modalStore = useModalStore()
    const openSpy = vi.spyOn(modalStore, 'open')

    const rotatingEvent = {
      id: 'torneo_pesca',
      name: 'Torneo de Pesca Acuática',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: false,
      description: '¡Competencia semanal de pesca!',
      schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
      config: JSON.stringify({
        hasCompetition: true,
        species: 'dratini,dragonair,lapras'
      })
    }

    const wrapper = mount(EventDetailModal, {
      props: {
        show: true,
        event: rotatingEvent as unknown as GameEvent
      },
      global: {
        stubs: globalStubs
      }
    })

    const pills = wrapper.findAll('.participant-pill')
    expect(pills.length).toBe(3)

    // Click on the first pill (dratini)
    await pills[0]?.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('PokedexDetail', {
      speciesId: 'dratini',
      context: 'pokedex'
    })

    // Click on the third pill (lapras)
    await pills[2]?.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('PokedexDetail', {
      speciesId: 'lapras',
      context: 'pokedex'
    })
  })

  it('resolves rotation title, banner, and species based on occurrence date', () => {
    const rotatingEvent = {
      id: 'torneo_pesca',
      name: 'Torneo de Pesca Acuática',
      icon: '🎣',
      type: 'competition',
      active: true,
      manual: false,
      description: '¡Competencia semanal de pesca!',
      schedule: '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
      config: JSON.stringify({
        hasCompetition: true,
        rotationTheme: 'weekly_4',
        weeklyRotations: {
          '1': { species: 'magikarp,gyarados', banner: 'hora_magikarp_full', title: 'Torneo Magikarp & Gyarados' },
          '4': { species: 'dratini,dragonair,lapras', banner: 'pesca_mistica_full', title: 'Torneo de Pesca Mística' }
        }
      })
    }

    // Occurrence on September 1st, 2026 (Week 1 of month)
    const week1Occurrence = {
      event: rotatingEvent as unknown as GameEvent,
      startInstant: Temporal.Instant.from('2026-09-01T21:00:00Z'),
      endInstant: Temporal.Instant.from('2026-09-02T01:00:00Z'),
      dateLabel: 'Mañana',
      dayName: 'Martes',
      timeLabel: '18:00 - 22:00 hs',
      startsInLabel: 'En 22h',
      isActiveNow: false
    }

    const wrapper = mount(EventDetailModal, {
      props: {
        show: true,
        event: rotatingEvent as unknown as GameEvent,
        occurrence: week1Occurrence
      },
      global: {
        stubs: globalStubs
      }
    })

    const text = wrapper.text()
    expect(text).toContain('Torneo Magikarp & Gyarados')
    expect(text).toContain('MAGIKARP')
    expect(text).toContain('GYARADOS')
    expect(text).not.toContain('DRATINI')
  })
})


