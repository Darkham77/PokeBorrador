import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { claimAward, claimAllEventAwards } from '@/stores/events/eventAwardsActions'
import type { EventAwardsContext } from '@/stores/events/eventAwardsActions'
import type { PendingAward, PastEventHistoryItem } from '@/types/system/stores'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('Multi-Award Event Claim & Storage Capacity Validation', () => {
  const mockAllEvents: GameEvent[] = [
    {
      id: 'gran_concurso_sabado',
      name: 'Gran Concurso del Sábado',
      icon: '🏆',
      type: 'competition',
      active: true,
      manual: false,
      schedule: { type: 'weekly', days: [6], startHour: 10, endHour: 23 },
      config: {
        hasCompetition: true,
        subCompetitions: [
          {
            id: 'ivs',
            name: 'Mayor IVs',
            metric: 'total_ivs',
            order: 'max',
            prizes: {
              first: { type: 'money', amount: 50000 }
            }
          },
          {
            id: 'weight_min',
            name: 'Menor Peso',
            metric: 'weight',
            order: 'min',
            prizes: {
              first: { type: 'bc', amount: 200 },
              second: { type: 'pokemon', species: 'lapras' }
            }
          },
          {
            id: 'height_min',
            name: 'Menor Altura',
            metric: 'height',
            order: 'min',
            prizes: {
              first: { type: 'pokemon', species: 'snorlax', level: 30 }
            }
          }
        ]
      },
      description: 'Concurso semanal multimodatildad'
    } as unknown as GameEvent
  ]

  let ctx: EventAwardsContext
  let mockRpcFn: ReturnType<typeof vi.fn>
  let mockGameState: any

  beforeEach(() => {
    mockRpcFn = vi.fn().mockResolvedValue({
      data: { ok: true, success: true, prize: { type: 'money', amount: 50000 } },
      error: null
    })

    mockGameState = {
      money: 1000,
      battleCoins: 100,
      inventory: {},
      team: [{ uid: 'poke-1', id: 'pikachu', name: 'Pikachu' }],
      box: [{ uid: 'poke-2', id: 'rattata', name: 'Rattata' }],
      boxCount: 4
    }

    const award1: PendingAward = {
      id: 'award-ivs',
      event_id: 'gran_concurso_sabado',
      category_id: 'ivs',
      winner_id: 'user-franco',
      prize: JSON.stringify({ type: 'money', amount: 50000 }),
      received_at: null
    }

    const award2: PendingAward = {
      id: 'award-weight',
      event_id: 'gran_concurso_sabado',
      category_id: 'weight_min',
      winner_id: 'user-franco',
      prize: JSON.stringify({ type: 'bc', amount: 200 }),
      received_at: null
    }

    const award3: PendingAward = {
      id: 'award-height',
      event_id: 'gran_concurso_sabado',
      category_id: 'height_min',
      winner_id: 'user-franco',
      prize: JSON.stringify({ type: 'pokemon', species: 'snorlax', level: 30 }),
      received_at: null
    }

    const pastEvents = ref<PastEventHistoryItem[]>([
      {
        id: 'history-1',
        event_id: 'gran_concurso_sabado',
        event_name: 'Gran Concurso del Sábado',
        event_icon: '🏆',
        event_description: '',
        ended_at: '2026-09-05T23:00:00Z',
        winners: [],
        myAward: award1,
        myAwards: [award1, award2, award3],
        isWinner: true,
        hasUnclaimedAward: true,
        isClaimed: false
      }
    ])

    const pendingAwards = ref<PendingAward[]>([award1, award2, award3])

    ctx = {
      gameStore: {
        state: mockGameState,
        db: {
          rpc: mockRpcFn,
          from: vi.fn()
        },
        save: vi.fn().mockResolvedValue(true)
      } as unknown as EventAwardsContext['gameStore'],
      authStore: {
        user: { id: 'user-franco' }
      } as unknown as EventAwardsContext['authStore'],
      uiStore: {
        notify: vi.fn()
      } as unknown as EventAwardsContext['uiStore'],
      allEvents: ref(mockAllEvents),
      pastEvents,
      pendingAwards,
      userEntries: ref({})
    }
  })

  it('keeps hasUnclaimedAward=true and isClaimed=false when claiming only 1 of 3 awards', async () => {
    const result = await claimAward(ctx, 'award-ivs')
    expect(result).toBeTruthy()

    const pe = ctx.pastEvents.value[0]
    expect(pe?.hasUnclaimedAward).toBe(true)
    expect(pe?.isClaimed).toBe(false)

    // award-ivs should now have received_at set
    const claimedAward = pe?.myAwards?.find(a => a.id === 'award-ivs')
    expect(claimedAward?.received_at).not.toBeNull()

    // award-weight and award-height should still be pending
    const remaining = pe?.myAwards?.filter(a => a.received_at === null)
    expect(remaining?.length).toBe(2)
  })

  it('sets hasUnclaimedAward=false and isClaimed=true only when all 3 awards are claimed', async () => {
    await claimAward(ctx, 'award-ivs')
    await claimAward(ctx, 'award-weight')

    let pe = ctx.pastEvents.value[0]
    expect(pe?.hasUnclaimedAward).toBe(true)
    expect(pe?.isClaimed).toBe(false)

    await claimAward(ctx, 'award-height')

    pe = ctx.pastEvents.value[0]
    expect(pe?.hasUnclaimedAward).toBe(false)
    expect(pe?.isClaimed).toBe(true)
  })

  it('blocks claiming a Pokémon reward if team and boxes are full', async () => {
    // Fill team to 6 and box to capacity (4 boxes * 50 = 200)
    mockGameState.team = new Array(6).fill({ id: 'pikachu' })
    mockGameState.box = new Array(200).fill({ id: 'rattata' })

    const result = await claimAward(ctx, 'award-height')
    expect(result).toBeNull()
    expect(mockRpcFn).not.toHaveBeenCalled()
    expect(ctx.uiStore.notify).toHaveBeenCalledWith(
      expect.stringContaining('No tienes suficiente espacio en tu equipo o cajas'),
      '⚠️'
    )

    // Ensure award remains pending
    const pe = ctx.pastEvents.value[0]
    const heightAward = pe?.myAwards?.find(a => a.id === 'award-height')
    expect(heightAward?.received_at).toBeNull()
  })

  it('claimAllEventAwards aborts pre-flight if multiple pokemon awards exceed available space', async () => {
    // Free only 1 slot (team full 6, box has 199/200)
    mockGameState.team = new Array(6).fill({ id: 'pikachu' })
    mockGameState.box = new Array(199).fill({ id: 'rattata' }) // 1 slot free

    // Award 2 and Award 3 both offer a Pokemon
    ctx.pastEvents.value[0]!.myAwards![1]!.prize = JSON.stringify({ type: 'pokemon', species: 'lapras' })
    ctx.pastEvents.value[0]!.myAwards![2]!.prize = JSON.stringify({ type: 'pokemon', species: 'snorlax' })

    const res = await claimAllEventAwards(ctx, 'gran_concurso_sabado')
    expect(res.success).toBe(false)
    expect(res.claimedCount).toBe(0)
    expect(mockRpcFn).not.toHaveBeenCalled()
    expect(ctx.uiStore.notify).toHaveBeenCalledWith(
      expect.stringContaining('Espacio insuficiente: estas recompensas otorgan 2 Pokémon, pero solo tienes espacio para 1.'),
      '⚠️'
    )
  })

  it('claimAllEventAwards claims all awards when storage is sufficient', async () => {
    // Free space is abundant
    mockGameState.team = [{ id: 'pikachu' }]
    mockGameState.box = []

    const res = await claimAllEventAwards(ctx, 'gran_concurso_sabado')
    expect(res.success).toBe(true)
    expect(res.claimedCount).toBe(3)

    const pe = ctx.pastEvents.value[0]
    expect(pe?.hasUnclaimedAward).toBe(false)
    expect(pe?.isClaimed).toBe(true)
    expect(ctx.pendingAwards.value.length).toBe(0)
  })
})
