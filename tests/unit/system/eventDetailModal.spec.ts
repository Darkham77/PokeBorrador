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

  it('does NOT display victory criteria if hasCompetition is absent or false', () => {
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
    expect(text).not.toContain('CRITERIO DE VICTORIA')
    expect(text).not.toContain('Mayor cantidad de IVs totales')
  })

  it('displays victory criteria if hasCompetition is true', () => {
    const competitionEvent = {
      ...defaultEvent,
      config: '{"species": "magikarp", "metric": "total_ivs", "hasCompetition": true}'
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
    expect(text).toContain('CRITERIO DE VICTORIA')
    expect(text).toContain('Mayor cantidad de IVs totales')
  })
})
