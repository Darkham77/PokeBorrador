// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PastEventsList from '@/components/modals/PastEventsList.vue'
import { useEventStore } from '@/stores/events'
import type { PastEventHistoryItem } from '@/types/system/stores'

describe('PastEventsList.vue - Past Events and Rewards Claiming', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const eventStore = useEventStore()
    eventStore.allEvents = [
      {
        id: 'hora_magikarp',
        name: 'Hora de Pesca del Magikarp',
        icon: '🎣',
        type: 'competition',
        active: false,
        manual: false,
        schedule: { type: 'weekly', days: [2, 4], startHour: 18, endHour: 22 },
        config: {
          species: 'magikarp',
          hasCompetition: true,
          subCompetitions: [
            {
              id: 'ivs',
              name: 'Genética Superior (IVs)',
              metric: 'total_ivs',
              order: 'max',
              prizes: {
                first: { type: 'item', item: 'masterball', qty: 1 }
              }
            }
          ]
        },
        description: '¡Capturá el Magikarp con mejores IVs!'
      },
      {
        id: 'torneo_eevee',
        name: 'Torneo Eevee',
        icon: '🦊',
        type: 'competition',
        active: false,
        manual: false,
        schedule: { type: 'weekly', days: [6], startHour: 10, endHour: 22 },
        config: {
          species: 'eevee',
          hasCompetition: true,
          prizes: {
            first: { type: 'money', money: 50000 }
          }
        },
        description: 'Torneo de criadores'
      }
    ] as unknown as typeof eventStore.allEvents
  })

  const mockPastEvents: PastEventHistoryItem[] = [
    {
      id: 'res-1',
      event_id: 'hora_magikarp',
      event_name: 'Hora de Pesca del Magikarp',
      event_icon: '🎣',
      event_description: '¡Capturá el Magikarp con mejores IVs!',
      ended_at: '2026-08-24T20:00:00Z',
      winners: [
        {
          rank: 'first',
          player_id: 'player-1',
          player_name: 'AshKetchum',
          score: 182,
          entry_data: { name: 'Magikarp', nickname: 'Titan', total_ivs: 182 }
        },
        {
          rank: 'second',
          player_id: 'player-2',
          player_name: 'Misty',
          score: 175,
          entry_data: { name: 'Magikarp', total_ivs: 175 }
        },
        {
          rank: 'third',
          player_id: 'player-3',
          player_name: 'Brock',
          score: 160,
          entry_data: { name: 'Magikarp', total_ivs: 160 }
        }
      ],
      myAward: {
        id: 'award-101',
        event_id: 'hora_magikarp',
        winner_id: 'player-1',
        prize: JSON.stringify({ type: 'item', item: 'masterball', qty: 1 }),
        received_at: null,
        prize_summary: 'Master Ball x1'
      },
      isWinner: true,
      hasUnclaimedAward: true,
      isClaimed: false
    },
    {
      id: 'res-2',
      event_id: 'torneo_eevee',
      event_name: 'Torneo Eevee',
      event_icon: '🦊',
      event_description: 'Torneo de criadores',
      ended_at: '2026-08-20T18:00:00Z',
      winners: [
        {
          rank: 'first',
          player_id: 'player-9',
          player_name: 'GaryOak',
          score: 186,
          entry_data: { name: 'Eevee', total_ivs: 186 }
        }
      ],
      myAward: {
        id: 'award-102',
        event_id: 'torneo_eevee',
        winner_id: 'player-1',
        prize: '{"money": 50000}',
        received_at: '2026-08-20T19:00:00Z',
        prize_summary: '$50,000'
      },
      isWinner: true,
      hasUnclaimedAward: false,
      isClaimed: true
    }
  ]

  it('renders empty message when no past events exist', () => {
    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [], isLoading: false }
    })

    expect(wrapper.text()).toContain('No hay concursos concluidos recientemente.')
  })

  it('renders loading state when isLoading is true', () => {
    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [], isLoading: true }
    })

    expect(wrapper.text()).toContain('Cargando historial de eventos...')
  })

  it('renders past events list with names, icons and podium', () => {
    const wrapper = mount(PastEventsList, {
      props: { pastEvents: mockPastEvents, isLoading: false }
    })

    expect(wrapper.text()).toContain('Hora de Pesca del Magikarp')
    expect(wrapper.text()).toContain('Torneo Eevee')
    expect(wrapper.text()).toContain('AshKetchum')
    expect(wrapper.text()).toContain('182 / 186 IVs')
    expect(wrapper.text()).toContain('Titan')
    expect(wrapper.text()).toContain('Misty')
    expect(wrapper.text()).toContain('Brock')
  })

  it('renders claim button when user has an unclaimed award', async () => {
    const eventStore = useEventStore()
    const claimSpy = vi.spyOn(eventStore, 'claimAward').mockResolvedValue('Master Ball x1')

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: mockPastEvents, isLoading: false }
    })

    const claimBtn = wrapper.find('.retro-btn.claim-btn')
    expect(claimBtn.exists()).toBe(true)
    expect(claimBtn.text()).toContain('RECLAMAR PREMIO')

    await claimBtn.trigger('click')
    expect(claimSpy).toHaveBeenCalledWith('award-101')
  })

  it('renders claimed badge when user already claimed the award', () => {
    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [mockPastEvents[1]!], isLoading: false }
    })

    const claimedBadge = wrapper.find('.claimed-badge')
    expect(claimedBadge.exists()).toBe(true)
    expect(claimedBadge.text()).toContain('✓ RECLAMADA')
  })

  it('triggers a toast notification on login when there are pending awards', async () => {
    const eventStore = useEventStore()
    const { useAuthStore } = await import('@/stores/auth')
    const { useGameStore } = await import('@/stores/game')
    const { useUIStore } = await import('@/stores/ui')
    
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    const uiStore = useUIStore()

    const notifySpy = vi.spyOn(uiStore, 'notify')
    authStore.user = { id: 'player-1', email: 'ash@pokemon.com' } as import('@/types/auth/auth').AuthUser
    
    // Mock DB select for pending awards
    gameStore.db = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [mockPastEvents[0]!.myAward],
              error: null
            })
          })
        })
      })
    } as unknown as typeof gameStore.db

    await eventStore.checkPendingAwards(true)

    expect(notifySpy).toHaveBeenCalledWith(
      '¡Tienes 1 recompensa de evento pendiente por reclamar!',
      '🎁'
    )
    expect(eventStore.pendingAwards.length).toBe(1)
  })

  it('displays the event schedule window (inicio y fin) in PastEventCard header', () => {
    const eventWithWeeklySchedule: PastEventHistoryItem = {
      ...mockPastEvents[0]!,
      event_schedule: { type: 'weekly', days: [2, 4], startHour: 18, endHour: 20 },
      ended_at: '2026-08-27T20:00:00Z'
    }

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [eventWithWeeklySchedule], isLoading: false }
    })

    expect(wrapper.text()).toContain('27/08/2026 · De 18:00 a 20:00 hs')
  })

  it('displays start and end date/time when start_at and end_at are provided', () => {
    const eventWithAbsoluteDates: PastEventHistoryItem = {
      ...mockPastEvents[0]!,
      start_at: '2026-08-20T13:00:00Z', // 10:00 hs in GMT-3
      end_at: '2026-08-20T21:00:00Z',   // 18:00 hs in GMT-3
      ended_at: '2026-08-20T21:00:00Z'
    }

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [eventWithAbsoluteDates], isLoading: false }
    })

    expect(wrapper.text()).toContain('20/08/2026 · De 10:00 a 18:00 hs')
  })

  it('displays multi-day start and end dates when start_at and end_at span across different days', () => {
    const multiDayEvent: PastEventHistoryItem = {
      ...mockPastEvents[0]!,
      start_at: '2026-08-20T13:00:00Z', // 20/08/2026 10:00 hs in GMT-3
      end_at: '2026-08-25T21:00:00Z',   // 25/08/2026 18:00 hs in GMT-3
      ended_at: '2026-08-25T21:00:00Z'
    }

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [multiDayEvent], isLoading: false }
    })

    expect(wrapper.text()).toContain('Del 20/08/2026 10:00 hs al 25/08/2026 18:00 hs')
  })

  it('notifies individual toasts for each item, money and battle coins won on claim', async () => {
    const eventStore = useEventStore()
    const { useUIStore } = await import('@/stores/ui')
    const { useGameStore } = await import('@/stores/game')
    const uiStore = useUIStore()
    const gameStore = useGameStore()
    const notifySpy = vi.spyOn(uiStore, 'notify')

    eventStore.pendingAwards = [
      {
        id: 'award-101',
        event_id: 'hora_magikarp',
        winner_id: 'player-1',
        prize: JSON.stringify({ type: 'mixed', money: 10000, battleCoins: 50, item: 'waterstone', qty: 2 }),
        received_at: null
      }
    ]
    eventStore.allEvents = [
      {
        id: 'hora_magikarp',
        name: 'Hora de Pesca del Magikarp',
        icon: '🎣',
        type: 'competition',
        active: false,
        manual: false,
        schedule: { type: 'weekly', days: [2, 4], startHour: 18, endHour: 22 },
        config: {
          subCompetitions: [
            {
              id: 'ivs',
              name: 'Genética Superior (IVs)',
              metric: 'total_ivs',
              order: 'max',
              prizes: {
                first: { type: 'mixed', money: 10000, battleCoins: 50, item: 'waterstone', qty: 2 }
              }
            }
          ]
        }
      }
    ] as unknown as typeof eventStore.allEvents

    gameStore.state = {
      money: 1000,
      battleCoins: 10,
      inventory: {}
    } as unknown as typeof gameStore.state

    gameStore.db = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          ok: true,
          prize: { money: 10000, battleCoins: 50, item: 'waterstone', qty: 2 }
        },
        error: null
      })
    } as unknown as typeof gameStore.db

    await eventStore.claimAward('award-101')

    expect(notifySpy).toHaveBeenCalledWith(expect.stringMatching(/¡Ganaste ₽10[.,]000!/), '💰')
    expect(notifySpy).toHaveBeenCalledWith('¡Ganaste 50 Battle Coins!', '🪙')
    expect(notifySpy).toHaveBeenCalledWith('¡Obtuviste Piedra Agua x2!', '🎒')
  })

  it('renders "Evento desconocido" when event_id or event_name starts with custom_ or is missing', () => {
    const customEvent: PastEventHistoryItem = {
      id: 'res-custom-1',
      event_id: 'custom_1774821389985',
      event_name: 'custom_1774821389985',
      event_icon: '🏆',
      event_description: '',
      ended_at: '2026-03-29T22:06:00Z',
      winners: [],
      myAward: null,
      isWinner: false,
      hasUnclaimedAward: false,
      isClaimed: false
    }

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [customEvent], isLoading: false }
    })

    expect(wrapper.text()).toContain('Evento desconocido')
    expect(wrapper.text()).not.toContain('custom_1774821389985')
  })

  it('displays the full date with day, month, year and time in PastEventCard header', () => {
    const customEvent: PastEventHistoryItem = {
      id: 'res-custom-2',
      event_id: 'custom_1774821389985',
      event_name: 'custom_1774821389985',
      event_icon: '🏆',
      event_description: '',
      ended_at: '2026-03-29T22:06:00Z', // In GMT-3, this is 29/03/2026 · 19:06 hs
      winners: [],
      myAward: null,
      isWinner: false,
      hasUnclaimedAward: false,
      isClaimed: false
    }

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [customEvent], isLoading: false }
    })

    expect(wrapper.text()).toContain('29/03/2026 · 19:06 hs')
  })

  it('disables the info button for archived/unknown events not in the database', () => {
    const customEvent: PastEventHistoryItem = {
      id: 'res-custom-3',
      event_id: 'custom_1774821389985',
      event_name: 'custom_1774821389985',
      event_icon: '🏆',
      event_description: '',
      ended_at: '2026-03-29T22:06:00Z',
      winners: [],
      myAward: null,
      isWinner: false,
      hasUnclaimedAward: false,
      isClaimed: false
    }

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [customEvent], isLoading: false }
    })

    const infoBtn = wrapper.find('.event-info-btn')
    expect(infoBtn.exists()).toBe(true)
    expect(infoBtn.attributes('disabled')).toBeDefined()
  })

  it('enables the info button and opens EventDetail modal when event exists in database', async () => {
    const { useModalStore } = await import('@/stores/modals')
    const modalStore = useModalStore()
    const openSpy = vi.spyOn(modalStore, 'open')

    const eventStore = useEventStore()
    const knownGameEvent = {
      id: 'hora_magikarp',
      name: 'Hora de Pesca del Magikarp',
      description: 'Pesca Magikarp gigantes',
      active: false
    }
    eventStore.allEvents = [knownGameEvent as unknown as import('@/logic/events/eventEngine').Event]

    const wrapper = mount(PastEventsList, {
      props: { pastEvents: [mockPastEvents[0]!], isLoading: false }
    })

    const infoBtn = wrapper.find('.event-info-btn')
    expect(infoBtn.exists()).toBe(true)
    expect(infoBtn.attributes('disabled')).toBeUndefined()

    await infoBtn.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('EventDetail', {
      event: expect.objectContaining({ id: 'hora_magikarp' })
    })
  })
})
