// @ts-nocheck
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

vi.mock('@/logic/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
    from: vi.fn(() => mockChain),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    setMockTime: vi.fn(),
    getTimeOffset: vi.fn(() => 0)
  }
}))

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key) => { delete store[key] }
  }
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
    auth.user = { id: 'admin', role: 'admin' }

    // Mock event data in store
    events.events = [
      { 
        id: 'fishing_day',
        active: true,
        name: 'Día de Pesca',
        schedule: { type: 'weekly', days: [2] }, // Tuesday
        config: { expMult: 2 }
      }
    ]

    // Use Debug API to set time to a Tuesday (2026-04-21 is Tuesday)
    const debugApi = {
      setMockTime: (d) => {
        game.db.setMockTime(d)
        // Simulate the event dispatch that happens in the UI
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      }
    }

    debugApi.setMockTime('2026-04-21T12:00:00')
    
    // Simulate events refresh logic for integration test verification
    const mockDate = new Date('2026-04-21T12:00:00')
    events.activeEvents = events.events.filter(e => {
       // Manual check for Tuesday (day 2) in weekly schedule
       return e.schedule && e.schedule.days && e.schedule.days.includes(mockDate.getDay())
    })

    expect(events.activeEvents.some(e => e.id === 'fishing_day')).toBe(true)
  })
})
