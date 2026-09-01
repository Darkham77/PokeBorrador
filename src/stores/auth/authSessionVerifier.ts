import { supabase } from '@/logic/db/supabase.ts'
import { logger } from '@/logic/utils/logger.ts'
import { requireGenderId, type GenderId } from '@/types/system/game.ts'
import { requireUserRole } from '@/types/auth/auth.ts'
import type { Session } from '@supabase/supabase-js'
import type { AuthUser } from '@/types/auth/auth'
import gsap from 'gsap'

const HTTP_STATUS_UNAUTHORIZED = 401
const AUTH_RETRY_DELAY_MS = 1500

export interface VerifiedProfileData {
  dbVersion: number
  userGender: GenderId
  userRole?: string
  isUserBanned: boolean
  banMsg: string
  sessionValid: boolean
}

export async function fetchOnlineSessionWithRetry(maxAttempts = 2): Promise<Session | null> {
  let attempt = 1
  while (attempt <= maxAttempts) {
    try {
      const timeoutSeconds = attempt === 1 ? 5 : 15
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => gsap.delayedCall(timeoutSeconds, () => reject(new Error('TIMEOUT'))))
      
      const response = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null } }
      return response.data.session
    } catch (e) {
      logger.warn('Auth', `Intento ${attempt}/${maxAttempts} de getSession falló o dio timeout: ${(e as Error).message}`)
      if (attempt < maxAttempts) {
        attempt++
        await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_DELAY_MS))
      } else {
        throw e
      }
    }
  }
  return null
}

export async function recordSessionIdInProfile(userId: string, currentSessionId: string): Promise<boolean> {
  try {
    const updatePromise = supabase.from('profiles').update({ current_session_id: currentSessionId }).eq('id', userId)
    const updateRes = await Promise.race([
      updatePromise,
      new Promise((_, reject) => gsap.delayedCall(10, () => reject(new Error('UPDATE_TIMEOUT'))))
    ]) as { error?: { message?: string; status?: number; code?: string } | null }

    const updateError = updateRes?.error
    if (updateError) {
      logger.error('Auth', `Session ID update failed: ${updateError.message} (${updateError.status})`)
      if (
        updateError.status === HTTP_STATUS_UNAUTHORIZED ||
        updateError.code === 'PGRST301' ||
        updateError.message?.toLowerCase().includes('jwt') ||
        updateError.message?.toLowerCase().includes('invalid')
      ) {
        return false
      }
    }
    return true
  } catch (e) {
    logger.warn('Auth', `Session ID update failed or timed out: ${(e as Error).message}`)
    return true
  }
}

export async function fetchProfileMetadata(userId: string): Promise<VerifiedProfileData> {
  const result: VerifiedProfileData = {
    dbVersion: 1,
    userGender: 'h',
    userRole: undefined,
    isUserBanned: false,
    banMsg: 'Uso indebido de la plataforma',
    sessionValid: true,
  }

  try {
    const profilePromise = supabase.from('profiles').select('db_version, is_banned, ban_reason, gender, role').eq('id', userId).single()
    const profileRes = await Promise.race([
      profilePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('FETCH_TIMEOUT')), 10000))
    ]) as {
      data: { db_version: number; is_banned: boolean; ban_reason: string | null; gender: GenderId; role?: string } | null
      error?: { message?: string; status?: number; code?: string } | null
    }

    const profile = profileRes.data
    const profileError = profileRes.error

    if (profileError) {
      logger.error('Auth', `Profile fetch failed: ${profileError.message} (${profileError.status})`)
      if (
        profileError.status === HTTP_STATUS_UNAUTHORIZED ||
        profileError.code === 'PGRST301' ||
        profileError.message?.toLowerCase().includes('jwt') ||
        profileError.message?.toLowerCase().includes('invalid')
      ) {
        result.sessionValid = false
      }
    } else if (profile) {
      result.dbVersion = profile.db_version || 1
      result.userGender = requireGenderId(profile.gender || 'h')
      result.userRole = profile.role
      if (profile.is_banned) {
        result.isUserBanned = true
        result.banMsg = profile.ban_reason || 'Uso indebido de la plataforma'
      }
    }
  } catch (e) {
    logger.warn('Auth', `Profile fetch failed or timed out: ${(e as Error).message}`)
  }

  return result
}

export function enrichAuthUser(rawUser: AuthUser, profile: VerifiedProfileData): AuthUser {
  rawUser.db_version = profile.dbVersion
  if (!rawUser.user_metadata) {
    rawUser.user_metadata = { username: rawUser.email || 'user' }
  }
  rawUser.user_metadata.gender = requireGenderId(profile.userGender)
  if (profile.userRole) {
    rawUser.role = requireUserRole(profile.userRole)
  }
  return rawUser
}
