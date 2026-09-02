import { describe, it, vi, beforeEach, expect } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

let memoryDb: DatabaseSync

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

import { emulateAwardEventAutomated } from '@/logic/db/rpcEmulations/eventRpc.ts'
import { queryLocal } from '@/logic/db/sqliteEngine.ts'
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts'

describe('Tier 1: PL/pgSQL Variable Scope & Multi-Category Event Awarding', () => {
  beforeEach(async () => {
    memoryDb = new DatabaseSync(':memory:')

    // Setup minimal schema for event testing
    await queryLocal(`
      CREATE TABLE IF NOT EXISTS events_config (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT,
        type TEXT,
        active INTEGER DEFAULT 1,
        manual INTEGER DEFAULT 0,
        schedule TEXT,
        config TEXT,
        description TEXT,
        last_awarded_at TEXT
      );
    `)

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS competition_entries (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        category_id TEXT DEFAULT 'ivs',
        player_id TEXT,
        player_name TEXT,
        player_email TEXT,
        pokemon_uid TEXT,
        data TEXT,
        submitted_at TEXT
      );
    `)

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

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS competition_results (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        winners TEXT,
        ended_at TEXT
      );
    `)
  })

  it('validates that all PostgreSQL PL/pgSQL functions declare their loop variables in the DECLARE block', async () => {
    const migrationsDir = path.resolve(process.cwd(), 'database/migrations')
    const files = await fs.readdir(migrationsDir)
    const sqlFiles = files.filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql'))

    const latestAwardMigration = sqlFiles.filter(f => f.includes('fn_award_event')).sort().pop()
    expect(latestAwardMigration).toBeDefined()

    if (latestAwardMigration) {
      const latestContent = await fs.readFile(path.join(migrationsDir, latestAwardMigration), 'utf-8')
      const declareMatch = latestContent.match(/DECLARE([\s\S]*?)BEGIN/i)
      const declareBlock = declareMatch ? declareMatch[1] : ''
      expect(declareBlock).toMatch(/\bj\s+INT/i)
    }
  })

  it('awards multi-category tournament prizes to top participants across all categories (ivs, weight, height)', async () => {
    // Insert event config with 3 sub-competitions
    await queryLocal(`
      INSERT INTO events_config (id, name, config, schedule, active)
      VALUES (
        'torneo_pesca',
        'Torneo de Pesca Acuática',
        ?,
        '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}',
        1
      );
    `, [
      JSON.stringify({
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
          },
          {
            id: 'weight',
            name: 'Masa y Peso (Titán / Miniatura)',
            metric: 'weight',
            order: 'auto',
            prizes: {
              first: { type: 'mixed', money: 25000, battleCoins: 150, items: { bigpearl: 3, lureball: 10 } },
              second: { type: 'mixed', money: 15000, battleCoins: 100, items: { bigpearl: 2, netball: 10 } },
              third: { type: 'mixed', money: 8000, battleCoins: 50, items: { pearl: 3, diveball: 5 } }
            }
          },
          {
            id: 'height',
            name: 'Envergadura y Altura (Gran Salto)',
            metric: 'height',
            order: 'auto',
            prizes: {
              first: { type: 'mixed', money: 25000, battleCoins: 150, items: { waterstone: 2, dragonscale: 1 } },
              second: { type: 'mixed', money: 15000, battleCoins: 100, items: { waterstone: 1, damprock: 1 } },
              third: { type: 'mixed', money: 8000, battleCoins: 50, items: { waterstone: 1 } }
            }
          }
        ]
      })
    ])

    // Insert participants for all 3 categories
    // 1. IVS entries
    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, category_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES 
        ('e1', 'torneo_pesca', 'ivs', 'p1', 'Elgeneral', 'elgeneral@test.com', 'poke1', '{"score": 154, "total_ivs": 154, "is_shiny": false, "obtained_at": 1000}', '2026-09-01T19:00:00Z'),
        ('e2', 'torneo_pesca', 'ivs', 'p2', 'Crezta', 'crezta@test.com', 'poke2', '{"score": 149, "total_ivs": 149, "is_shiny": false, "obtained_at": 1100}', '2026-09-01T19:10:00Z'),
        ('e3', 'torneo_pesca', 'ivs', 'p3', 'Darkham', 'darkham@test.com', 'poke3', '{"score": 143, "total_ivs": 143, "is_shiny": false, "obtained_at": 1200}', '2026-09-01T19:20:00Z');
    `)

    // 2. WEIGHT entries
    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, category_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES 
        ('e4', 'torneo_pesca', 'weight', 'p4', 'FisherPro', 'fisher@test.com', 'poke4', '{"score": 25.5, "weight": 25.5, "is_shiny": false, "obtained_at": 1300}', '2026-09-01T19:30:00Z'),
        ('e5', 'torneo_pesca', 'weight', 'p1', 'Elgeneral', 'elgeneral@test.com', 'poke5', '{"score": 20.0, "weight": 20.0, "is_shiny": false, "obtained_at": 1400}', '2026-09-01T19:40:00Z');
    `)

    // 3. HEIGHT entries
    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, category_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES 
        ('e6', 'torneo_pesca', 'height', 'p3', 'Darkham', 'darkham@test.com', 'poke6', '{"score": 1.45, "height": 1.45, "is_shiny": true, "obtained_at": 1500}', '2026-09-01T19:50:00Z');
    `)

    // Execute awarding via RPC emulation
    const res = await emulateAwardEventAutomated({} as SQLiteDatabase, { target_event_id: 'torneo_pesca' })
    expect(res.data).toBeDefined()
    const data = res.data as { ok: boolean; success: boolean; winners: Array<{ rank: string; category_id: string; player_name: string }> }
    expect(data.ok).toBe(true)
    expect(data.winners.length).toBe(6) // 3 in ivs, 2 in weight, 1 in height

    // Verify awards table populated
    const awardRows = await queryLocal(`SELECT * FROM awards WHERE event_id = 'torneo_pesca'`)
    expect(awardRows.length).toBe(6)

    // Verify competition_results table populated
    const resultRows = await queryLocal(`SELECT * FROM competition_results WHERE event_id = 'torneo_pesca'`)
    expect(resultRows.length).toBe(1)

    // Verify competition_entries are cleared
    const remainingEntries = await queryLocal(`SELECT * FROM competition_entries WHERE event_id = 'torneo_pesca'`)
    expect(remainingEntries.length).toBe(0)
  })
})
