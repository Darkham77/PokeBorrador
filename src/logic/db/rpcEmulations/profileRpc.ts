import { queryLocal } from '../sqliteEngine.ts';
import type { SQLiteDatabase } from '../sqliteEngine.ts';
import type { DBResponse } from '@/types/system/database';

export async function emulateChangeUsername(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
  const { new_username } = params as { new_username: string };
  const { userId } = context;

  // 1. Length validation (3 to 15 characters)
  if (!new_username || new_username.trim().length < 3 || new_username.trim().length > 15) {
    return { data: null, error: 'El nombre de entrenador debe tener entre 3 y 15 caracteres.' };
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
      const thirtyDaysAgo = Temporal.Now.instant().subtract({ hours: 24 * 30 });
      if (Temporal.Instant.compare(lastRename, thirtyDaysAgo) > 0) {
        return { data: null, error: 'Solo puedes cambiar tu nombre una vez cada 30 días. Debes esperar al menos 30 días.' };
      }
    }
  }
  
  await queryLocal("UPDATE profiles SET username = ?, last_renamed_at = ? WHERE id = ?", [new_username.trim(), Temporal.Now.instant().toString(), userId]);
  return { data: { success: true }, error: null };
}
