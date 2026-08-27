// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
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
})
