import { describe, it, expect } from 'vitest'
import { generateMigrations } from '../../../scripts/database/generate_migrations'
import { restoreSupabaseDb } from '../../../scripts/database/restore_supabase_db'
import { updateSupabaseDb } from '../../../scripts/database/update_supabase_db'

describe('Utility Scripts Exports Coverage', () => {
  it('should export database utility functions', () => {
    expect(typeof generateMigrations).toBe('function')
    expect(typeof restoreSupabaseDb).toBe('function')
    expect(typeof updateSupabaseDb).toBe('function')
  })
})
