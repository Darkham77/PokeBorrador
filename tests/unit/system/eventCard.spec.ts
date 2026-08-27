// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EventCard from '@/components/modals/EventCard.vue'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('EventCard.vue - Participating Pokemon Slot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const competitionEvent: GameEvent = {
    id: 'concurso_magikarp',
    name: 'Hora de Pesca del Magikarp',
    icon: '🎣',
    type: 'competition',
    active: true,
    manual: false,
    description: '¡Inscribe a tu mejor Magikarp!',
    schedule: '{}',
    config: JSON.stringify({
      species: 'magikarp',
      metric: 'total_ivs',
      hasCompetition: true
    })
  }

  const globalStubs = {
    PVSpriteFX: {
      template: '<div class="pv-sprite-fx-stub"><slot /></div>'
    }
  }

  it('renders standard participate button when no pokemon is registered', () => {
    const wrapper = mount(EventCard, {
      props: { event: competitionEvent },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('.slot-enrolled-body').exists()).toBe(false)
    const emptySlot = wrapper.find('.slot-empty-body')
    expect(emptySlot.exists()).toBe(true)
    const btn = emptySlot.find('.btn-slot-action.inscribe')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('INSCRIBIR')
  })

  it('renders participating pokemon and IVs metric breakdown when entry exists in store', () => {
    const eventStore = useEventStore()
    const gameStore = useGameStore()

    const magikarp = {
      uid: 'pk-magikarp-1',
      id: 'magikarp',
      name: 'Magikarp',
      nickname: 'Big Karp',
      level: 25,
      isShiny: false,
      ivs: { hp: 31, atk: 30, def: 25, spa: 10, spd: 15, spe: 31 }
    } as unknown as Pokemon

    gameStore.state.team = [magikarp]
    eventStore.userEntries[`${competitionEvent.id}:ivs`] = {
      event_id: competitionEvent.id,
      category_id: 'ivs',
      player_id: 'player-123',
      pokemon_uid: 'pk-magikarp-1'
    }

    const wrapper = mount(EventCard, {
      props: { event: competitionEvent },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('.slot-enrolled-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('Big Karp')
    expect(wrapper.text()).toContain('Nv. 25')
    expect(wrapper.text()).toContain('142 / 186')
    const changeBtn = wrapper.find('.btn-slot-action.change')
    expect(changeBtn.exists()).toBe(true)
    expect(changeBtn.text()).toContain('CAMBIAR')
  })

  it('renders size metric when event metric is size / weight', () => {
    const sizeEvent: GameEvent = {
      ...competitionEvent,
      id: 'concurso_tamanio',
      config: JSON.stringify({
        species: 'magikarp',
        hasCompetition: true,
        subCompetitions: [
          {
            id: 'weight',
            name: 'Masa y Peso',
            metric: 'weight',
            order: 'max'
          }
        ]
      })
    }

    const eventStore = useEventStore()
    const gameStore = useGameStore()

    const magikarp = {
      uid: 'pk-magikarp-2',
      id: 'magikarp',
      name: 'Magikarp',
      nickname: null,
      level: 15,
      isShiny: true,
      weight: 15.5
    } as unknown as Pokemon

    gameStore.state.team = [magikarp]
    eventStore.userEntries[`${sizeEvent.id}:weight`] = {
      event_id: sizeEvent.id,
      category_id: 'weight',
      player_id: 'player-123',
      pokemon_uid: 'pk-magikarp-2'
    }

    const wrapper = mount(EventCard, {
      props: { event: sizeEvent },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('.slot-enrolled-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('15.5 kg')
  })
})
