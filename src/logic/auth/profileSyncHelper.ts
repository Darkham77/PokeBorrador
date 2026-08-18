/**
 * src/logic/auth/profileSyncHelper.ts
 *
 * Synchronizes user profile fields in the database upon save.
 */

import type { DBRouter } from '@/logic/db/dbRouter';
import type { AuthUser } from '@/types/auth/auth';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { validateUserProfile } from '@/logic/validation/schemas';
import { logger } from '@/logic/utils/logger';

const ELO_RATING_DEFAULT_SCORE = 1000;

export async function syncUserProfileData(db: DBRouter, user: AuthUser, saveData: SaveDataDto): Promise<void> {
  try {
    const { data: existingProf } = await db.from('profiles').select('id').eq('id', user.id).maybeSingle();
    const finalUsername = saveData.trainer || user.user_metadata?.username || 'Entrenador';

    const profileValidation = validateUserProfile({
      id: user.id,
      username: finalUsername,
      level: saveData.trainerLevel,
      is_banned: false,
      coins: saveData.money
    });

    if (!profileValidation.success) {
      logger.warn('SAVE', 'Sincronización de perfil abortada por validación de esquema fallida:', profileValidation.issues);
      throw new Error('Datos del perfil inválidos: ' + (profileValidation.issues[0]?.message || 'Esquema incorrecto'));
    }

    const shinyCount = ((saveData.team || []).filter(p => p?.isShiny).length) + ((saveData.box || []).filter(p => p?.isShiny).length);
    const statsRecord = (saveData.stats || {}) as Record<string, unknown>; // open-record
    const maxDamage = Number(statsRecord.maxDamage) || 0;
    const totalBattles = Number(statsRecord.totalBattles) || 0;
    const tradeVolume = Number(statsRecord.tradeVolume) || 0;
    const captureAttempts = Number(statsRecord.captureAttempts) || 0;
    const captureSuccesses = Number(statsRecord.captureSuccesses) || 0;

    if (existingProf) {
      await db.from('profiles').update({
        username: finalUsername,
        trainer_level: saveData.trainerLevel,
        player_class: saveData.playerClass,
        faction: saveData.faction,
        avatar_style: saveData.avatar_style,
        nick_style: saveData.nick_style,
        badges: saveData.badges || 0,
        gender: saveData.gender || 'h',
        playtime: saveData.playtime || 0,
        last_played_at: Temporal.Now.instant().toString(),
        ranked_max_elo: saveData.rankedMaxElo || ELO_RATING_DEFAULT_SCORE,
        class_level: saveData.classLevel || 1,
        box_count: (saveData.box || []).length,
        pvp_draws: saveData.pvpStats?.draws || 0,
        longest_streak: saveData.classData?.longestStreak || 0,
        shiny_count: shinyCount,
        max_damage: maxDamage,
        total_battles: totalBattles,
        trade_volume: tradeVolume,
        capture_attempts: captureAttempts,
        captureSuccesses: captureSuccesses
      }).eq('id', user.id);
    } else {
      await db.from('profiles').insert({
        id: user.id,
        username: finalUsername,
        email: user.email || `${user.id}@local`,
        trainer_level: saveData.trainerLevel || 1,
        player_class: saveData.playerClass || 'entrenador',
        faction: saveData.faction || null,
        avatar_style: saveData.avatar_style || '',
        nick_style: saveData.nick_style || '',
        badges: saveData.badges || 0,
        role: 'user',
        gender: saveData.gender || 'h',
        playtime: saveData.playtime || 0,
        created_at: Temporal.Now.instant().toString(),
        last_played_at: Temporal.Now.instant().toString(),
        ranked_max_elo: saveData.rankedMaxElo || ELO_RATING_DEFAULT_SCORE,
        class_level: saveData.classLevel || 1,
        box_count: (saveData.box || []).length,
        pvp_draws: saveData.pvpStats?.draws || 0,
        longest_streak: saveData.classData?.longestStreak || 0,
        shiny_count: shinyCount,
        max_damage: maxDamage,
        total_battles: totalBattles,
        trade_volume: tradeVolume,
        capture_attempts: captureAttempts,
        capture_successes: captureSuccesses,
        db_version: 3
      });
    }
    user.db_version = 3;
    logger.success('SAVE', 'Campos de perfil sincronizados en la base de datos.');
  } catch (e) {
    logger.warn('SAVE', `Error al sincronizar campos del perfil: ${(e as Error).message}`);
  }
}
