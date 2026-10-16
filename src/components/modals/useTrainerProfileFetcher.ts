import { ref, onMounted, watch, type ComputedRef } from 'vue';
import { useGameStore } from '@/stores/game';
import { logger } from '@/logic/utils/logger';
import {
  mapReplayRows,
  parseAwardMedalCounts,
  calculateDistinctEventCount,
  extractRankedMedals,
  type ProfileRow,
  type SaveStateData
} from './trainerProfileResolver.ts';
import type { RankedSeasonMedal, BattleReplayRecord } from '@/types/battle/pvp.ts';

const PROFILE_COLUMNS =
  'id, username, email, faction, player_class, trainer_level, avatar_style, nick_style, pvp_wins, pvp_losses, elo_rating, created_at, gender, playtime, last_played_at, ranked_max_elo, class_level, class_xp, box_count, pvp_draws, longest_streak, shiny_count, max_damage, total_battles, trade_volume, capture_attempts';
const REPLAY_COLUMNS =
  'id, battle_code, season_id, theme_id, p1_data, p2_data, turns_count, winner_side, choice_stream, initial_seed, is_top10_archived, views_count, created_at';
const AWARDS_QUERY_LIMIT = 100;
const ENTRIES_QUERY_LIMIT = 500;

export function useTrainerProfileFetcher(
  userId: ComputedRef<string | null | undefined>,
  isOwnProfile: ComputedRef<boolean>
) {
  const gameStore = useGameStore();

  const loading = ref(!isOwnProfile.value);
  const profile = ref<ProfileRow | null>(null);
  const saveState = ref<SaveStateData | null>(null);
  const error = ref<string | null>(null);
  const eventParticipationsDb = ref(0);
  const eventMedalsFirstDb = ref(0);
  const eventMedalsSecondDb = ref(0);
  const eventMedalsThirdDb = ref(0);
  const rankedMedals = ref<RankedSeasonMedal[]>([]);
  const pinnedReplays = ref<BattleReplayRecord[]>([]);

  const fetchOwnProfileStats = async (id: string, db: NonNullable<typeof gameStore.db>) => {
    const [profRes, awardsRes, compEntryRes, replaysRes] = await Promise.all([
      db.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle(),
      db.from('awards').select('prize, event_id').eq('winner_id', id).limit(AWARDS_QUERY_LIMIT),
      db
        .from('competition_entries')
        .select('event_id')
        .eq('player_id', id)
        .limit(ENTRIES_QUERY_LIMIT),
      db
        .from('battle_replays')
        .select(REPLAY_COLUMNS)
        .or(`p1_user_id.eq.${id},p2_user_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (profRes.data) {
      profile.value = profRes.data as ProfileRow;
    }
    if (replaysRes?.data) {
      pinnedReplays.value = mapReplayRows(replaysRes.data);
    }
    if (awardsRes.data) {
      rankedMedals.value = extractRankedMedals(awardsRes.data, gameStore.state.rankedMedals);
      const medalCounts = parseAwardMedalCounts(awardsRes.data);
      eventMedalsFirstDb.value = medalCounts.first;
      eventMedalsSecondDb.value = medalCounts.second;
      eventMedalsThirdDb.value = medalCounts.third;
    }
    if (compEntryRes.data) {
      eventParticipationsDb.value = calculateDistinctEventCount(compEntryRes.data);
    }
  };

  const fetchOtherProfileStats = async (id: string, db: NonNullable<typeof gameStore.db>) => {
    const { data: prof, error: pErr } = await db
      .from('trainer_public_profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (pErr) throw pErr;
    profile.value = (prof as ProfileRow) || null;

    if (!profile.value) {
      error.value = 'Perfil de entrenador no encontrado';
      return;
    }

    try {
      const [awardsRes, compEntryRes] = await Promise.all([
        db.from('awards').select('prize, event_id').eq('winner_id', id).limit(AWARDS_QUERY_LIMIT),
        db
          .from('competition_entries')
          .select('event_id')
          .eq('player_id', id)
          .limit(ENTRIES_QUERY_LIMIT)
      ]);
      if (awardsRes.data) {
        rankedMedals.value = extractRankedMedals(awardsRes.data, saveState.value?.rankedMedals);
        const medalCounts = parseAwardMedalCounts(awardsRes.data);
        eventMedalsFirstDb.value = medalCounts.first;
        eventMedalsSecondDb.value = medalCounts.second;
        eventMedalsThirdDb.value = medalCounts.third;
      }
      if (compEntryRes.data) {
        eventParticipationsDb.value = calculateDistinctEventCount(compEntryRes.data);
      }
    } catch (err) {
      logger.warn('[useTrainerProfile] Error en fetch de participaciones de eventos:', err);
    }
  };

  const fetchData = async () => {
    const id = userId.value;
    if (!id) {
      error.value = 'ID de usuario no proporcionado';
      loading.value = false;
      return;
    }

    const db = gameStore.db;
    if (!db) {
      if (!isOwnProfile.value) error.value = 'Base de datos no disponible';
      loading.value = false;
      return;
    }

    if (isOwnProfile.value) {
      loading.value = false;
      error.value = null;
      try {
        await fetchOwnProfileStats(id, db);
      } catch (err) {
        logger.warn(
          '[useTrainerProfile] Error en background fetch de estadísticas de eventos:',
          err
        );
      }
      return;
    }

    loading.value = true;
    error.value = null;
    profile.value = null;
    saveState.value = null;
    eventParticipationsDb.value = 0;
    eventMedalsFirstDb.value = 0;
    eventMedalsSecondDb.value = 0;
    eventMedalsThirdDb.value = 0;
    rankedMedals.value = [];

    try {
      await fetchOtherProfileStats(id, db);
    } catch (e: unknown) {
      const err = e as Error;
      error.value = `Error: ${err.message || 'No se pudieron recuperar los datos'}`;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    void fetchData();
  });

  watch(userId, () => {
    void fetchData();
  });

  return {
    loading,
    profile,
    saveState,
    error,
    eventParticipationsDb,
    eventMedalsFirstDb,
    eventMedalsSecondDb,
    eventMedalsThirdDb,
    rankedMedals,
    pinnedReplays,
    fetchData
  };
}
