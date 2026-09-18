import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAndFormatDefenseReports } from '@/logic/pvp/pvpDefenseReportsHelper'
import { generateRoomCode, isValidRoomCode, formatRoomCode } from '@/logic/pvp/pvpRoomCodeHelper'
import type { DBRouter } from '@/logic/db/dbRouter'

describe('PvP Helpers Domain Suite', () => {
  describe('pvpDefenseReportsHelper', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
      if (typeof localStorage !== 'undefined') {
        localStorage.clear()
      }
    })

    it('returns empty array when no reports found', async () => {
      const mockDb = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
      } as unknown as DBRouter

      const res = await fetchAndFormatDefenseReports(mockDb, 'user-123')
      expect(res).toEqual([])
    })

    it('formats reports, enriches opponent profiles, and notifies unseen reports', async () => {
      const rawReports = [
        {
          id: 5,
          user_id: 'user-123',
          opponent_id: 'opp-456',
          result: 'victory',
          report_data: JSON.stringify({ replay_id: 'rep-1' }),
          created_at: '2026-09-15T12:00:00Z',
        },
      ]

      const rawProfiles = [
        {
          id: 'opp-456',
          username: 'Red',
          player_class: 'veterano',
          trainer_level: 50,
          avatar_style: 'red_classic',
          nick_style: 'gold',
          faction: 'kanto',
          elo_rating: 1500,
        },
      ]

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === 'passive_battle_reports') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: rawReports }),
            }
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({ data: rawProfiles }),
            }
          }
          return {}
        }),
      } as unknown as DBRouter

      const notifyFn = vi.fn()
      const res = await fetchAndFormatDefenseReports(mockDb, 'user-123', notifyFn)

      expect(res).toHaveLength(1)
      expect(res[0]?.id).toBe('5')
      expect(res[0]?.opponent_profile?.username).toBe('Red')
      expect(res[0]?.report_data).toEqual({ replay_id: 'rep-1' })
      expect(notifyFn).toHaveBeenCalledWith(expect.stringContaining('Defensa Pasiva'), '🛡️')
    })
  })

  describe('pvpRoomCodeHelper', () => {
    describe('generateRoomCode', () => {
      it('generates a 4-character uppercase alphanumeric code', () => {
        const code = generateRoomCode()
        expect(code).toHaveLength(4)
        expect(isValidRoomCode(code)).toBe(true)
      })

      it('never contains ambiguous characters like 0, O, 1, I', () => {
        const codes = Array.from({ length: 100 }, () => generateRoomCode())
        for (const code of codes) {
          expect(code).not.toMatch(/[0O1I]/)
          expect(isValidRoomCode(code)).toBe(true)
        }
      })
    })

    describe('isValidRoomCode', () => {
      it('accepts valid 4-character codes', () => {
        expect(isValidRoomCode('7ABC')).toBe(true)
        expect(isValidRoomCode('W9KZ')).toBe(true)
      })

      it('rejects invalid lengths or characters', () => {
        expect(isValidRoomCode('')).toBe(false)
        expect(isValidRoomCode('ABC')).toBe(false)
        expect(isValidRoomCode('ABCDE')).toBe(false)
        expect(isValidRoomCode('AB1C')).toBe(false)
        expect(isValidRoomCode('AB0C')).toBe(false)
        expect(isValidRoomCode('ABIC')).toBe(false)
        expect(isValidRoomCode('ABOC')).toBe(false)
        expect(isValidRoomCode('AB-C')).toBe(false)
      })
    })

    describe('formatRoomCode', () => {
      it('normalizes input by trimming and uppercasing', () => {
        expect(formatRoomCode(' 7abc ')).toBe('7ABC')
      })
    })
  })
})
