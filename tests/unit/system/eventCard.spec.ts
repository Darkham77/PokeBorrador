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
      hasCompetition: true,
      subCompetitions: [
        { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' }
      ]
    })
  }

  const globalStubs = {
    PVSpriteFX: {
      template: '<div class="pv-sprite-fx-stub"><slot /></div>'
    }
  }

  it('renders standard category chip with + when no pokemon is registered', () => {
    const wrapper = mount(EventCard, {
      props: { event: competitionEvent },
      global: { stubs: globalStubs }
    })

    const chips = wrapper.findAll('.comp-slot-chip')
    expect(chips.length).toBeGreaterThanOrEqual(1)
    const chip = chips[0]!
    expect(chip.classes()).not.toContain('enrolled')
    expect(chip.find('.chip-status-pill').text()).toBe('+')
  })

  it('renders enrolled category chip with checkmark when entry exists in store', () => {
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
      id: 'entry-1',
      event_id: competitionEvent.id,
      category_id: 'ivs',
      player_id: 'player-123',
      player_name: 'Trainer',
      player_email: 'test@example.com',
      pokemon_uid: 'pk-magikarp-1',
      submitted_at: '2026-08-31T00:00:00Z',
      data: {
        species: 'magikarp',
        name: 'Magikarp',
        level: 25,
        total_ivs: 142
      }
    }

    const wrapper = mount(EventCard, {
      props: { event: competitionEvent },
      global: { stubs: globalStubs }
    })

    const chips = wrapper.findAll('.comp-slot-chip')
    expect(chips.length).toBeGreaterThanOrEqual(1)
    const chip = chips[0]!
    expect(chip.classes()).toContain('enrolled')
    expect(chip.find('.chip-status-pill').text()).toBe('✓')
  })

  it('renders size metric chip when event metric is size / weight', () => {
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
    eventStore.userEntries[`${sizeEvent.id}:weight_magikarp`] = {
      id: 'entry-2',
      event_id: sizeEvent.id,
      category_id: 'weight_magikarp',
      player_id: 'player-123',
      player_name: 'Trainer',
      player_email: 'test@example.com',
      pokemon_uid: 'pk-magikarp-2',
      submitted_at: '2026-08-31T00:00:00Z',
      data: {
        species: 'magikarp',
        name: 'Magikarp',
        level: 15,
        weight: 15.5
      }
    }

    const wrapper = mount(EventCard, {
      props: { event: sizeEvent },
      global: { stubs: globalStubs }
    })

    const chips = wrapper.findAll('.comp-slot-chip')
    expect(chips.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('Peso')
  })

  it('rejects submitting the same pokemon into a second sub-competition of the same event', async () => {
    const multiEvent: GameEvent = {
      ...competitionEvent,
      id: 'concurso_multi',
      config: JSON.stringify({
        species: 'magikarp',
        hasCompetition: true,
        subCompetitions: [
          { id: 'ivs', name: 'IVs', metric: 'total_ivs', order: 'max' },
          { id: 'weight', name: 'Peso', metric: 'weight', order: 'max' }
        ]
      })
    }

    const eventStore = useEventStore()
    const gameStore = useGameStore()
    const authStore = (await import('@/stores/auth')).useAuthStore()
    const uiStore = (await import('@/stores/ui')).useUIStore()

    authStore.user = { id: 'player-123', email: 'test@example.com' } as import('@/types/auth/auth').AuthUser
    gameStore.db = {
      from: () => ({
        upsert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'entry-1' }, error: null })
          })
        })
      })
    } as unknown as typeof gameStore.db

    const magikarp = {
      uid: 'pk-magikarp-shared',
      id: 'magikarp',
      name: 'Magikarp',
      nickname: null,
      level: 20,
      isShiny: false,
      obtainedAt: Temporal.Now.instant().epochMilliseconds,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      weight: 12.0
    } as unknown as Pokemon

    gameStore.state.team = [magikarp]
    // Already registered in 'ivs'
    eventStore.userEntries[`${multiEvent.id}:ivs`] = {
      id: 'entry-shared',
      event_id: multiEvent.id,
      category_id: 'ivs',
      player_id: 'player-123',
      player_name: 'Trainer',
      player_email: 'test@example.com',
      pokemon_uid: 'pk-magikarp-shared',
      submitted_at: '2026-08-31T00:00:00Z',
      data: {
        species: 'magikarp',
        name: 'Magikarp',
        level: 20
      }
    }

    let notifyMsg = ''
    uiStore.notify = (msg: string) => {
      notifyMsg = msg
    }

    // Try to register the same pokemon in 'weight' category
    await eventStore.submitCompetitionEntry(multiEvent.id, 'weight', 'pk-magikarp-shared')

    expect(notifyMsg).toContain('Este Pokémon ya está participando en otra categoría de este evento')
    expect(eventStore.userEntries[`${multiEvent.id}:weight`]).toBeUndefined()
  })
})
