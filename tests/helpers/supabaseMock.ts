import { vi } from 'vitest'

// Stable mock object for chain calls
export const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { is_banned: false } }),
  then: vi.fn().mockImplementation((onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled))
}

// Mock state variable for time offset
let mockTimeOffset = 0

export const mockSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn()
  },
  from: vi.fn(() => mockChain),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  })),
  getTimeOffset: vi.fn(() => mockTimeOffset),
  setTimeOffset: vi.fn((ms) => { mockTimeOffset = ms }),
  setMockTime: vi.fn((d) => { 
    const target = d.includes('Z') ? Temporal.Instant.from(d) : Temporal.PlainDateTime.from(d).toZonedDateTime('UTC').toInstant();
    mockTimeOffset = target.epochMilliseconds - Temporal.Now.instant().epochMilliseconds 
  }),
  resetTime: vi.fn(() => { mockTimeOffset = 0 }),
  rpc: vi.fn().mockResolvedValue({ data: { players_count: 10 }, error: null })
}
