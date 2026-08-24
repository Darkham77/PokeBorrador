import { queryLocal } from '../sqliteEngine.ts';
import type { SQLiteDatabase } from '../sqliteEngine.ts';
import type { DBResponse } from '@/types/system/database';
import { MIN_TRAINER_NAME_LENGTH, MAX_TRAINER_NAME_LENGTH } from '@/logic/constants/gameplay.ts';
import { RENAME_COOLDOWN_DAYS } from '@/logic/player/identityCooldown.ts';

export async function emulateChangeUsername(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
  const { new_username } = params as { new_username: string };
  const { userId } = context;

  // 1. Length validation (3 to 15 characters)
  if (!new_username || new_username.trim().length < MIN_TRAINER_NAME_LENGTH || new_username.trim().length > MAX_TRAINER_NAME_LENGTH) {
    return { data: null, error: `El nombre de entrenador debe tener entre ${MIN_TRAINER_NAME_LENGTH} y ${MAX_TRAINER_NAME_LENGTH} caracteres.` };
  }

  // 2. Query current profile data for validations
  const current = await queryLocal("SELECT username, last_renamed_at FROM profiles WHERE id = ?", [userId]);
  
  if (current.length > 0) {
    // 3. Identical name validation
    if (current[0]!.username === new_username.trim()) {
      return { data: null, error: 'El nuevo nombre es idéntico al actual.' };
    }

    // 4. Cooldown validation (30 days)
    if (current[0]!.last_renamed_at) {
      const lastRename = Temporal.Instant.from(current[0]!.last_renamed_at as string);
      const thirtyDaysAgo = Temporal.Now.instant().subtract({ hours: 24 * RENAME_COOLDOWN_DAYS });
      if (Temporal.Instant.compare(lastRename, thirtyDaysAgo) > 0) {
        return { data: null, error: `Solo puedes cambiar tu nombre una vez cada ${RENAME_COOLDOWN_DAYS} días. Debes esperar al menos ${RENAME_COOLDOWN_DAYS} días.` };
      }
    }
  }
  
  await queryLocal("UPDATE profiles SET username = ?, last_renamed_at = ? WHERE id = ?", [new_username.trim(), Temporal.Now.instant().toString(), userId]);
  return { data: { success: true }, error: null };
}
