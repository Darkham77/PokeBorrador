import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { ensureSchemaIntegrity } from '../../../src/logic/db/sqliteSchemaIntegrity.ts'
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts'

describe('sqliteSchemaIntegrity legacy chat migration', () => {
  it('should not throw an error when global_chat_messages does not contain legacy sender_id or sender_name columns', async () => {
    using dbSync = new DatabaseSync(':memory:')
    
    // Create base tables from schema
    TABLES_SCHEMA.forEach(schema => {
      dbSync.exec(`CREATE TABLE IF NOT EXISTS ${schema}`)
    })

    // Mock SQLiteDatabase wrapper interface expected by ensureSchemaIntegrity
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
        const stmt = dbSync.prepare(sql)
        stmt.run(...((params || []) as Array<string | number | bigint | Uint8Array | null>))
      }
    }

    // Should resolve without throwing "no such column: sender_id"
    await assert.doesNotReject(async () => {
      await ensureSchemaIntegrity(mockDb as unknown as Parameters<typeof ensureSchemaIntegrity>[0])
    })
  })
})
