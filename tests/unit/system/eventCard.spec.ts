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

    expect(wrapper.find('.participating-poke-box').exists()).toBe(false)
    const btn = wrapper.find('.retro-btn.action')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('PARTICIPAR')
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
    eventStore.userEntries[competitionEvent.id] = {
      event_id: competitionEvent.id,
      player_id: 'player-123',
      pokemon_uid: 'pk-magikarp-1'
    }

    const wrapper = mount(EventCard, {
      props: { event: competitionEvent },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('.participating-poke-box').exists()).toBe(true)
    expect(wrapper.text()).toContain('POKÉMON INSCRIPTO')
    expect(wrapper.text()).toContain('Big Karp')
    expect(wrapper.text()).toContain('Nv. 25')
    expect(wrapper.text()).toContain('IVs TOTALES')
    expect(wrapper.text()).toContain('142 / 186')
    expect(wrapper.find('.ivs-detail-grid').exists()).toBe(true)
    expect(wrapper.find('.retro-btn.action').text()).toBe('CAMBIAR')
  })

  it('renders size metric when event metric is size', () => {
    const sizeEvent: GameEvent = {
      ...competitionEvent,
      id: 'concurso_tamanio',
      config: JSON.stringify({
        species: 'magikarp',
        metric: 'size',
        hasCompetition: true
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
      size: '1.25m'
    } as unknown as Pokemon

    gameStore.state.team = [magikarp]
    eventStore.userEntries[sizeEvent.id] = {
      event_id: sizeEvent.id,
      player_id: 'player-123',
      pokemon_uid: 'pk-magikarp-2'
    }

    const wrapper = mount(EventCard, {
      props: { event: sizeEvent },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('.participating-poke-box').exists()).toBe(true)
    expect(wrapper.text()).toContain('TAMAÑO')
    expect(wrapper.text()).toContain('1.25m')
    expect(wrapper.find('.ivs-detail-grid').exists()).toBe(false)
  })
})
