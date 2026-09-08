import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { ensureSchemaIntegrity } from '../../../src/logic/db/sqliteSchemaIntegrity.ts'
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts'

describe('sqliteSchemaIntegrity quote and comma parsing', () => {
  it('should not treat commas inside string literals as column separators (e.g. initial_seed in battle_replays)', async () => {
    using dbSync = new DatabaseSync(':memory:')
    
    // Create base tables from schema
    TABLES_SCHEMA.forEach(schema => {
      dbSync.exec(`CREATE TABLE IF NOT EXISTS ${schema}`)
    })

    const attemptedAlters: string[] = []

    const mockDb = {
      exec: (sql: string, params?: unknown[]) => {
        const stmt = dbSync.prepare(sql)
        const rows = stmt.all(...((params || []) as Array<string | number | bigint | Uint8Array | null>)) as Record<string, unknown>[]
        if (rows.length === 0) return []
        const columns = Object.keys(rows[0]!)
        const values = rows.map(r => columns.map(c => r[c]))
        return [{ columns, values }]
      },
      run: (sql: string, params?: unknown[]) => {
        if (sql.includes('ALTER TABLE')) {
          attemptedAlters.push(sql)
        }
        const stmt = dbSync.prepare(sql)
        stmt.run(...((params || []) as Array<string | number | bigint | Uint8Array | null>))
      }
    }

    await ensureSchemaIntegrity(mockDb as unknown as Parameters<typeof ensureSchemaIntegrity>[0])

    // Should NOT have attempted to add "0" or "0]'" as missing columns to battle_replays
    const invalidAlters = attemptedAlters.filter(sql => 
      sql.includes('battle_replays ADD COLUMN 0') || 
      sql.includes("battle_replays ADD COLUMN 0]'") ||
      sql.includes('battle_replays ADD COLUMN "0"')
    )

    assert.deepEqual(invalidAlters, [], `Auto-repair erroneously tried to alter battle_replays with split comma pieces: ${invalidAlters.join(', ')}`)
    assert.equal(attemptedAlters.length, 0, `Auto-repair should not run ALTER TABLE on a freshly initialized schema, but ran: ${attemptedAlters.join(', ')}`)
  })
})
