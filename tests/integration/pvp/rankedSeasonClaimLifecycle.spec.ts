/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { emulateClaimAward } from '@/logic/db/rpcEmulations/eventRpc.ts'
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts'

let memoryDb: DatabaseSync

// Mock sqliteEngine for node testing of claim_award
import { vi } from 'vitest'
vi.mock('@/logic/db/sqliteEngine.ts', () => ({
  queryLocal: vi.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim()
    const isSelect = trimmed.toUpperCase().startsWith('SELECT')
    const stmt = memoryDb.prepare(sql)
    if (isSelect) {
      return stmt.all(...(params as (string | number | bigint | null)[])) as Record<string, unknown>[]
    }
    stmt.run(...(params as (string | number | bigint | null)[]))
    return []
  }),
  persistSQLite: vi.fn(async () => {})
}))

import { queryLocal } from '@/logic/db/sqliteEngine.ts'

describe('Ranked Season Awards Claim Lifecycle Integration', () => {
  beforeEach(async () => {
    memoryDb = new DatabaseSync(':memory:')

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS awards (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        winner_id TEXT,
        winner_name TEXT,
        winner_email TEXT,
        prize TEXT,
        awarded_at TEXT,
        claimed INTEGER DEFAULT 0,
        received_at TEXT
      );
    `)

    // Seed awards from ranked season end
    await queryLocal(`
      INSERT INTO awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
      VALUES (
        'award_ranked_season_1_medal',
        'ranked_season_Temporada 1',
        'usr_champion',
        'ChampionAsh',
        'ash@poke.com',
        '{"type": "ranked_medal", "tier": "maestro", "season": "Temporada 1", "rank": 1, "elo": 3500}',
        '2026-09-01T00:00:00Z',
        0,
        NULL
      )
    `)

    await queryLocal(`
      INSERT INTO awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
      VALUES (
        'award_ranked_season_1_pokemon',
        'ranked_season_Temporada 1',
        'usr_champion',
        'ChampionAsh',
        'ash@poke.com',
        '{"type": "pokemon", "species": "eevee", "level": 50, "shiny": true, "ivs": {"hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 31}}',
        '2026-09-01T00:00:00Z',
        0,
        NULL
      )
    `)

    await queryLocal(`
      INSERT INTO awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
      VALUES (
        'award_ranked_season_1_bc',
        'ranked_season_Temporada 1',
        'usr_champion',
        'ChampionAsh',
        'ash@poke.com',
        '{"type": "bc", "amount": 500, "battleCoins": 500}',
        '2026-09-01T00:00:00Z',
        0,
        NULL
      )
    `)
  })

  it('successfully claims an unclaimed seasonal award and returns the prize payload', async () => {
    const res = await emulateClaimAward({} as SQLiteDatabase, { p_award_id: 'award_ranked_season_1_pokemon' })

    expect(res.error).toBeNull()
    expect(res.data).toBeDefined()

    const data = res.data as { ok: boolean; success: boolean; prize: Record<string, unknown> }
    expect(data.ok).toBe(true)
    expect(data.prize.type).toBe('pokemon')
    expect(data.prize.species).toBe('eevee')
    expect(data.prize.shiny).toBe(true)

    // Verify award is now marked as claimed in database
    const rows = (await queryLocal(`SELECT claimed, received_at FROM awards WHERE id = 'award_ranked_season_1_pokemon'`)) as Array<{
      claimed: number;
      received_at: string | null;
    }>
    expect(rows[0]!.claimed).toBe(1)
    expect(rows[0]!.received_at).not.toBeNull()
  })

  it('rejects duplicate claims with clear error message', async () => {
    // First claim: success
    const firstRes = await emulateClaimAward({} as SQLiteDatabase, { p_award_id: 'award_ranked_season_1_bc' })
    expect((firstRes.data as { ok: boolean }).ok).toBe(true)

    // Second claim: rejected
    const secondRes = await emulateClaimAward({} as SQLiteDatabase, { p_award_id: 'award_ranked_season_1_bc' })
    expect(secondRes.data).toEqual({ ok: false, error: 'Recompensa ya reclamada' })
  })

  it('returns error when award ID does not exist', async () => {
    const res = await emulateClaimAward({} as SQLiteDatabase, { p_award_id: 'award_non_existent' })
    expect(res.data).toEqual({ ok: false, error: 'Recompensa no encontrada' })
  })
})
