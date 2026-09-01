import { describe, it, expect } from 'vitest'
import { enrichAuthUser, type VerifiedProfileData } from '@/stores/auth/authSessionVerifier'
import type { AuthUser } from '@/types/auth/auth'

describe('authSessionVerifier', () => {
  it('enriches auth user with verified profile metadata, gender and role', () => {
    const rawUser = {
      id: 'test-user-123',
      email: 'ash@kanto.com',
      user_metadata: {},
    } as unknown as AuthUser

    const profileData: VerifiedProfileData = {
      dbVersion: 42,
      userGender: 'm',
      userRole: 'admin',
      isUserBanned: false,
      banMsg: '',
      sessionValid: true,
    }

    const enriched = enrichAuthUser(rawUser, profileData)

    expect(enriched.db_version).toBe(42)
    expect(enriched.user_metadata?.gender).toBe('m')
    expect(enriched.role).toBe('admin')
  })
})
