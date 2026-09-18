/**
 * src/components/modals/renameHelpers.ts
 * 
 * Helper functions for RenameModal: validation, local storage synchronization,
 * and remote username update.
 */
import { validateTrainerName } from '@/logic/validation/schemas'
import type { GenderId } from '@/types/system/game'
import type { useGameStore } from '@/stores/game'

export interface RenameValidationError {
  message: string
  icon: string
}

export function validateRenameRequest(
  targetName: string,
  genderChanged: boolean,
  nameChanged: boolean,
  canRename: boolean,
  daysUntilRename: number
): RenameValidationError | null {
  const validation = validateTrainerName(targetName)
  if (!validation.success) {
    return {
      message: validation.issues[0]?.message || 'El nombre debe tener entre 3 y 15 caracteres.',
      icon: '⚠️'
    }
  }
  if (!nameChanged && !genderChanged) {
    return { message: 'No se detectaron cambios.', icon: '⚠️' }
  }
  if (!canRename) {
    return { message: `Faltan ${daysUntilRename} días para poder cambiar de identidad.`, icon: '⏳' }
  }
  return null
}

export async function syncRemoteUsernameChange(
  gameStore: ReturnType<typeof useGameStore>,
  targetName: string
): Promise<{ success: boolean; error?: string }> {
  const res = await gameStore.db.rpc('change_username', { new_username: targetName })
  if (res.error) {
    const errorMsg = typeof res.error === 'string'
      ? res.error
      : ((res.error as { message: string } | null)?.message || 'Error al cambiar el nombre')
    return { success: false, error: errorMsg }
  }
  return { success: true }
}

export function updateLocalUserStorage(
  userId: string,
  email: string | undefined,
  targetName: string,
  gender: GenderId,
  nowStr: string,
  nameChanged: boolean
): void {
  const localUserStr = localStorage.getItem('pokevicio_local_user')
  if (localUserStr) {
    interface LocalUser {
      user_metadata?: {
        username?: string
        gender?: string
        last_renamed_at?: string
        [key: string]: unknown
      }
      [key: string]: unknown
    }
    const lu = JSON.parse(localUserStr) as LocalUser
    if (!lu.user_metadata) lu.user_metadata = {}
    if (nameChanged) lu.user_metadata.username = targetName
    lu.user_metadata.gender = gender
    lu.user_metadata.last_renamed_at = nowStr
    localStorage.setItem('pokevicio_local_user', JSON.stringify(lu))
  } else {
    localStorage.setItem(
      'pokevicio_local_user',
      JSON.stringify({
        id: userId,
        email: email || 'entrenador@local',
        user_metadata: {
          username: targetName,
          gender,
          last_renamed_at: nowStr
        }
      })
    )
  }
}
