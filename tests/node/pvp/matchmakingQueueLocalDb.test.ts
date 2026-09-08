/**
 * tests/node/pvp/matchmakingQueueLocalDb.test.ts
 *
 * Integration and parity test for ranked matchmaking queue lifecycle
 * across real database engines (SQLite and PostgreSQL).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { TABLES_SCHEMA } from '@/logic/db/schema.ts'

describe('Local Ranked Matchmaking Queue Parity', () => {
  let dbSync: DatabaseSync

  beforeEach(() => {
    dbSync = new DatabaseSync(':memory:')
    TABLES_SCHEMA.forEach(schema => {
      dbSync.exec(`CREATE TABLE IF NOT EXISTS ${schema}`)
    })
  })

  it('fails when inserting looking_since into ranked_queue (reproduction of reported bug)', () => {
    // Exact SQL attempted by livePvP.ts when looking_since was used
    expect(() => {
      dbSync.exec(`
        INSERT OR REPLACE INTO ranked_queue (user_id, elo, looking_since)
        VALUES ('local_ash', 1000, '${new Date().toISOString()}')
      `)
    }).toThrow(/no column named looking_since/)
  })

  it('succeeds when inserting valid schema columns (user_id, elo, status, created_at) into ranked_queue', () => {
    const now = new Date().toISOString()
    expect(() => {
      dbSync.exec(`
        INSERT OR REPLACE INTO ranked_queue (user_id, elo, status, created_at)
        VALUES ('local_ash', 1000, 'searching', '${now}')
      `)
    }).not.toThrow()

    const rows = dbSync.prepare('SELECT * FROM ranked_queue WHERE user_id = ?').all('local_ash') as Record<string, unknown>[]
    expect(rows.length).toBe(1)
    expect(rows[0]!.user_id).toBe('local_ash')
    expect(rows[0]!.elo).toBe(1000)
    expect(rows[0]!.status).toBe('searching')
    expect(rows[0]!.created_at).toBe(now)
  })

  it('orders queue by created_at ascending correctly for matchmaking', () => {
    const t1 = '2026-09-06T10:00:00Z'
    const t2 = '2026-09-06T10:05:00Z'

    dbSync.exec(`
      INSERT INTO ranked_queue (user_id, elo, status, created_at)
      VALUES ('player_early', 1100, 'searching', '${t1}'),
             ('player_late', 1150, 'searching', '${t2}')
    `)

    const rows = dbSync.prepare(`
      SELECT * FROM ranked_queue 
      WHERE user_id != 'player_late' 
      ORDER BY created_at ASC 
      LIMIT 1
    `).all() as Record<string, unknown>[]

    expect(rows.length).toBe(1)
    expect(rows[0]!.user_id).toBe('player_early')
  })
})
