import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import { discardAward } from '@/stores/events/eventAwardsActions'
import type { EventAwardsContext } from '@/stores/events/eventAwardsActions'
import type { PendingAward, PastEventHistoryItem } from '@/types/system/stores'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

describe('Event Awards Validation and Discard System', () => {
  const mockAllEvents: GameEvent[] = [
    {
      id: 'hora_magikarp',
      name: 'Hora de Pesca del Magikarp',
      icon: '🎣',
      type: 'competition',
      active: true,
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
              first: { type: 'mixed', money: 25000, battleCoins: 150, items: { goldbottlecap: 1, rarecandy: 5 } },
              second: { type: 'mixed', money: 15000, battleCoins: 100, items: { bottlecap: 2, rarecandy: 3 } },
              third: { type: 'mixed', money: 8000, battleCoins: 50, items: { bottlecap: 1, rarecandy: 1 } }
            }
          }
        ]
      },
      description: 'Concurso oficial de Magikarp'
    },
    {
      id: 'gran_concurso_sabado',
      name: 'Gran Concurso del Sábado',
      icon: '🏆',
      type: 'competition',
      active: true,
      manual: false,
      schedule: { type: 'weekly', days: [6], startHour: 10, endHour: 22 },
      config: {
        species: '*',
        hasCompetition: true,
        prizes: {
          first: { type: 'money', money: 50000 },
          second: { type: 'bc', battleCoins: 250 },
          third: { type: 'item', item: 'masterball', qty: 2 }
        }
      },
      description: 'Concurso oficial de IVs'
    }
  ]

  describe('isAwardClaimable (Validation)', () => {
    it('returns false for legacy/missing events not in allEvents', () => {
      const legacyAward: PendingAward = {
        id: 'award-legacy-1',
        winner_id: 'user-1',
        event_id: 'antiguo_evento_inexistente',
        prize: JSON.stringify({ type: 'pokemon', species: 'magikarp', shiny: true, level: 5 }),
        received_at: null
      }

      expect(isAwardClaimable(legacyAward, mockAllEvents)).toBe(false)
    })

    it('returns false for hora_magikarp awards with deprecated legacy structure (e.g. direct Shiny Magikarp)', () => {
      const legacyPokeAward: PendingAward = {
        id: 'award-legacy-poke',
        winner_id: 'user-1',
        event_id: 'hora_magikarp',
        prize: JSON.stringify({
          type: 'pokemon',
          species: 'magikarp',
          shiny: true,
          level: 5,
          nature: 'Firme',
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
        }),
        received_at: null
      }

      expect(isAwardClaimable(legacyPokeAward, mockAllEvents)).toBe(false)
    })

    it('returns false for hora_magikarp awards with deprecated arbitrary money (e.g. ₽1 or ₽23)', () => {
      const legacyMoneyAward1: PendingAward = {
        id: 'award-legacy-money-1',
        winner_id: 'user-1',
        event_id: 'hora_magikarp',
        prize: JSON.stringify({ type: 'money', amount: 1 }),
        received_at: null
      }

      const legacyMoneyAward23: PendingAward = {
        id: 'award-legacy-money-23',
        winner_id: 'user-1',
        event_id: 'hora_magikarp',
        prize: JSON.stringify({ type: 'money', amount: 23 }),
        received_at: null
      }

      expect(isAwardClaimable(legacyMoneyAward1, mockAllEvents)).toBe(false)
      expect(isAwardClaimable(legacyMoneyAward23, mockAllEvents)).toBe(false)
    })

    it('returns false for corrupted or empty prize payloads', () => {
      const corruptAward: PendingAward = {
        id: 'award-corrupt',
        winner_id: 'user-1',
        event_id: 'hora_magikarp',
        prize: 'invalid-json-string{',
        received_at: null
      }

      expect(isAwardClaimable(corruptAward, mockAllEvents)).toBe(false)
    })

    it('returns true for official hora_magikarp configured prizes (1st place package)', () => {
      const validFirstPlaceAward: PendingAward = {
        id: 'award-magikarp-1st',
        winner_id: 'user-1',
        event_id: 'hora_magikarp',
        prize: JSON.stringify({
          type: 'mixed',
          money: 25000,
          battleCoins: 150,
          items: { goldbottlecap: 1, rarecandy: 5 }
        }),
        received_at: null
      }

      expect(isAwardClaimable(validFirstPlaceAward, mockAllEvents)).toBe(true)
    })

    it('returns true for official hora_magikarp configured prizes (2nd place package)', () => {
      const validSecondPlaceAward: PendingAward = {
        id: 'award-magikarp-2nd',
        winner_id: 'user-1',
        event_id: 'hora_magikarp',
        prize: JSON.stringify({
          type: 'mixed',
          money: 15000,
          battleCoins: 100,
          items: { bottlecap: 2, rarecandy: 3 }
        }),
        received_at: null
      }

      expect(isAwardClaimable(validSecondPlaceAward, mockAllEvents)).toBe(true)
    })

    it('returns true for official event-level configured prizes in gran_concurso_sabado', () => {
      const validMoneyAward: PendingAward = {
        id: 'award-money',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        prize: JSON.stringify({ type: 'money', money: 50000 }),
        received_at: null
      }

      const validBcAward: PendingAward = {
        id: 'award-bc',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        prize: JSON.stringify({ type: 'bc', battleCoins: 250 }),
        received_at: null
      }

      const validItemAward: PendingAward = {
        id: 'award-item',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        prize: JSON.stringify({ type: 'item', item: 'masterball', qty: 2 }),
        received_at: null
      }

      expect(isAwardClaimable(validMoneyAward, mockAllEvents)).toBe(true)
      expect(isAwardClaimable(validBcAward, mockAllEvents)).toBe(true)
      expect(isAwardClaimable(validItemAward, mockAllEvents)).toBe(true)
    })
  })

  describe('discardAward (Action)', () => {
    let mockDeleteFn: ReturnType<typeof vi.fn>
    let mockEqFn: ReturnType<typeof vi.fn>
    let ctx: EventAwardsContext

    beforeEach(() => {
      mockEqFn = vi.fn().mockResolvedValue({ data: true, error: null })
      mockDeleteFn = vi.fn().mockReturnValue({ eq: mockEqFn })

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === 'awards') {
            return {
              delete: mockDeleteFn
            }
          }
          return {}
        })
      }

      const pendingAwards = ref<PendingAward[]>([
        {
          id: 'award-to-discard',
          winner_id: 'user-1',
          event_id: 'hora_magikarp',
          prize: JSON.stringify({ type: 'pokemon', species: 'magikarp' }),
          received_at: null
        },
        {
          id: 'award-keep',
          winner_id: 'user-1',
          event_id: 'gran_concurso_sabado',
          prize: JSON.stringify({ type: 'money', money: 50000 }),
          received_at: null
        }
      ])

      const pastEvents = ref<PastEventHistoryItem[]>([
        {
          id: 'res-1',
          event_id: 'hora_magikarp',
          event_name: 'Hora de Pesca del Magikarp',
          event_icon: '🎣',
          event_description: '',
          ended_at: '2026-04-10T12:00:00Z',
          winners: [],
          myAward: pendingAwards.value[0] || null,
          isWinner: true,
          hasUnclaimedAward: true,
          isClaimed: false
        }
      ])

      ctx = {
        gameStore: {
          db: mockDb
        } as unknown as EventAwardsContext['gameStore'],
        authStore: {
          user: { id: 'user-1' }
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

    it('successfully discards an award from DB and updates reactive state', async () => {
      const result = await discardAward(ctx, 'award-to-discard')

      expect(result).toBe(true)
      expect(mockDeleteFn).toHaveBeenCalled()
      expect(mockEqFn).toHaveBeenCalledWith('id', 'award-to-discard')
      expect(ctx.pendingAwards.value.map(a => a.id)).toEqual(['award-keep'])
      expect(ctx.pastEvents.value[0]?.myAward).toBeNull()
      expect(ctx.pastEvents.value[0]?.hasUnclaimedAward).toBe(false)
      expect(ctx.uiStore.notify).toHaveBeenCalledWith(
        'Recompensa descartada correctamente.',
        '🗑️'
      )
    })
  })
})
