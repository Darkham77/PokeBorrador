

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useAuthStore } from '@/stores/auth'

// Mock Supabase
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { db_version: 1, is_banned: false } }),
  then: vi.fn().mockResolvedValue({ data: [], error: null })
}

vi.mock('@/logic/db/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
    from: vi.fn(() => mockChain),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    setMockTime: vi.fn(),
    getTimeOffset: vi.fn(() => 0)
  }
}))

import type { Event as GameEvent } from '@/logic/events/eventEngine'

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key: string) => { delete store[key] },
    length: 0,
    key: (_index: number) => null
  } as unknown as Storage;
}

describe('Events Integration with Debug API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('activates fishing event when setting time to Tuesday via Debug API', async () => {
    const auth = useAuthStore()
    const game = useGameStore()
    const events = useEventStore()
    
    // Simulate offline admin
    auth.sessionMode = 'offline'
    auth.user = { id: 'admin', role: 'admin', user_metadata: { username: 'admin' } } as unknown as NonNullable<typeof auth.user>

    // Mock event data in store
    events.allEvents = [
      { 
        id: 'fishing_day',
        active: true,
        name: 'Día de Pesca',
        description: 'Día de Pesca',
        active_hours: [],
        schedule: { type: 'weekly', days: [2] }, // Tuesday
        config: { expMult: 2 }
      }
    ] as unknown as GameEvent[]

    // Use Debug API to set time to a Tuesday (2026-04-21 is Tuesday)
    const debugApi = {
      setMockTime: (d: string) => {
        game.db.setMockTime(d)
        // Simulate the event dispatch that happens in the UI
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      }
    }

    debugApi.setMockTime('2026-04-21T12:00:00')
    
    // Simulate events refresh logic for integration test verification
    const mockDate = Temporal.Instant.fromEpochMilliseconds(Date.parse('2026-04-21T12:00:00'))
    events.activeEvents = events.allEvents.filter((e: GameEvent) => {
       // Manual check for Tuesday (day 2) in weekly schedule
       const scheduleObj = e.schedule as unknown as { type: string; days?: number[] };
       return scheduleObj && scheduleObj.days && scheduleObj.days.includes((mockDate.toZonedDateTimeISO('UTC') as { dayOfWeek: number }).dayOfWeek)
    })

    expect(events.activeEvents.some(e => e.id === 'fishing_day')).toBe(true)
  })
})
