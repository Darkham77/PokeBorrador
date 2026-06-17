/**
 * tests/unit/username_rename.spec.ts
 * Verifies that the username rename constraints and cooldown limits are enforced in the database router.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts'

describe('Trainer Rename Cooldown and Validation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestDB()
  })

  it('should enforce name length rules (3 to 15 characters)', async () => {
    const db = await createTestDBRouter()
    
    // Too short (2 chars)
    let res = await db.rpc('change_username', { new_username: 'Ab' })
    expect(res.error).toBe('El nombre de entrenador debe tener entre 3 y 15 caracteres.')

    // Too long (16 chars)
    res = await db.rpc('change_username', { new_username: 'VeryLongTrainerName' })
    expect(res.error).toBe('El nombre de entrenador debe tener entre 3 y 15 caracteres.')

    // Valid length
    res = await db.rpc('change_username', { new_username: 'ValidTrainer' })
    expect(res.error).toBeNull()
  })

  it('should prevent changing name if it is identical to the current name', async () => {
    const db = await createTestDBRouter()
    
    // Initial rename
    await db.rpc('change_username', { new_username: 'TrainerRed' })

    // Try identical rename
    const res = await db.rpc('change_username', { new_username: 'TrainerRed' })
    expect(res.error).toBe('El nuevo nombre es idéntico al actual.')
  })

  it('should enforce the 30-day cooldown limit', async () => {
    const db = await createTestDBRouter()

    // First rename - should succeed
    let res = await db.rpc('change_username', { new_username: 'TrainerBlue' })
    expect(res.error).toBeNull()

    // Second rename immediately - should fail due to cooldown
    res = await db.rpc('change_username', { new_username: 'TrainerYellow' })
    expect(res.error).toContain('Debes esperar al menos 30 días')
  })
})
