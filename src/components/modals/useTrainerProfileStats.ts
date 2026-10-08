import { computed, type ComputedRef, type Ref } from 'vue';
import { useGameStore } from '@/stores/game';
import type { GameStatKey } from '@/types/system/game';
import type { GymId } from '@/data/world/gyms';
import {
  resolveStatField,
  computeShiniesCount,
  computeEventTrophyCounts,
  type ProfileRow,
  type SaveStateData
} from './trainerProfileResolver.ts';

const DEFAULT_ELO_RATING_BASE = 1000;
const SECONDS_PER_HOUR_FACTOR = 3600;

export function useTrainerProfileStats(
  isOwnProfile: ComputedRef<boolean>,
  profile: Ref<ProfileRow | null>,
  saveState: Ref<SaveStateData | null>,
  eventParticipationsDb: Ref<number>,
  eventMedalsFirstDb: Ref<number>,
  eventMedalsSecondDb: Ref<number>,
  eventMedalsThirdDb: Ref<number>
) {
  const gameStore = useGameStore();

  const badgesCount = computed(() => {
    if (isOwnProfile.value) return gameStore.state.badges ?? gameStore.state.defeatedGyms?.length ?? 0;
    return saveState.value?.badges ?? saveState.value?.defeatedGyms?.length ?? 0;
  });

  const pokedexCaught = computed(() => {
    if (isOwnProfile.value) return gameStore.state.pokedex?.length ?? 0;
    return saveState.value?.pokedex?.length ?? 0;
  });

  const pokedexSeen = computed(() => {
    if (isOwnProfile.value) return gameStore.state.seenPokedex?.length ?? 0;
    return saveState.value?.seenPokedex?.length ?? 0;
  });

  const trainersDefeated = computed(() => {
    if (isOwnProfile.value) return gameStore.state.stats?.trainersDefeated ?? 0;
    return saveState.value?.stats?.trainersDefeated ?? 0;
  });

  const wildWins = computed(() => {
    if (isOwnProfile.value) return gameStore.state.stats?.wins ?? 0;
    return saveState.value?.stats?.wins ?? 0;
  });

  const pvpWins = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.wins, profile.value?.pvp_wins, saveState.value?.pvpStats?.wins, 0)
  );

  const pvpLosses = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.losses, profile.value?.pvp_losses, saveState.value?.pvpStats?.losses, 0)
  );

  const eloRating = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.eloRating, profile.value?.elo_rating, saveState.value?.eloRating, DEFAULT_ELO_RATING_BASE)
  );

  const warCoins = computed(() => (isOwnProfile.value ? gameStore.state.warCoins ?? 0 : saveState.value?.warCoins ?? 0));

  const criminality = computed(() => {
    if (isOwnProfile.value) return (gameStore.state.classData as { criminality?: number } | undefined)?.criminality ?? 0;
    return saveState.value?.classData?.criminality ?? 0;
  });

  const reputation = computed(() => {
    if (isOwnProfile.value) return (gameStore.state.classData as { reputation?: number } | undefined)?.reputation ?? 0;
    return saveState.value?.classData?.reputation ?? 0;
  });

  const captureStreak = computed(() => {
    if (isOwnProfile.value) return (gameStore.state.classData as { longestStreak?: number } | undefined)?.longestStreak ?? 0;
    return saveState.value?.classData?.longestStreak ?? 0;
  });

  const totalWarPoints = computed<number>(() => {
    const warMap = isOwnProfile.value ? gameStore.state.warMyPtsLocal : saveState.value?.warMyPtsLocal;
    if (!warMap) return 0;
    const points = Object.values(warMap) as number[];
    return points.reduce((a: number, b: number) => Number(a) + Number(b), 0);
  });

  const isGymDefeated = (gymId: GymId) => {
    const list = isOwnProfile.value ? (gameStore.state.defeatedGyms || []) : (saveState.value?.defeatedGyms || []);
    return list.includes(gymId);
  };

  const playtimeHours = computed(() => {
    const secs = isOwnProfile.value ? (gameStore.state.playtime ?? 0) : (profile.value?.playtime ?? saveState.value?.playtime ?? 0);
    return Math.floor(secs / SECONDS_PER_HOUR_FACTOR);
  });

  const rankedMaxElo = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.rankedMaxElo, profile.value?.ranked_max_elo, saveState.value?.rankedMaxElo, DEFAULT_ELO_RATING_BASE)
  );

  const boxCount = computed(() => (isOwnProfile.value ? gameStore.state.box?.length ?? 0 : profile.value?.box_count ?? saveState.value?.box?.length ?? 0));

  const pvpDraws = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.draws, profile.value?.pvp_draws, saveState.value?.pvpStats?.draws, 0)
  );

  const longestStreak = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.pvpStats?.streak, profile.value?.longest_streak, saveState.value?.pvpStats?.streak, 0)
  );

  const shinyCount = computed(() => {
    const team = isOwnProfile.value ? gameStore.state.team : saveState.value?.team;
    const box = isOwnProfile.value ? gameStore.state.box : saveState.value?.box;
    const savedShinies = (isOwnProfile.value ? gameStore.state.stats?.shiniesCaught : saveState.value?.stats?.shiniesCaught) ?? 0;
    return computeShiniesCount(team, box, savedShinies);
  });

  const maxDamage = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.highestDamageDealt, profile.value?.max_damage, saveState.value?.stats?.highestDamageDealt, 0)
  );

  const totalBattles = computed(() => {
    const wins = wildWins.value;
    const trainers = trainersDefeated.value;
    const pvp = pvpWins.value + pvpLosses.value + pvpDraws.value;
    return wins + trainers + pvp;
  });

  const tradeVolume = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.tradeVolume, profile.value?.trade_volume, saveState.value?.stats?.tradeVolume, 0)
  );

  const captureAttempts = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.captureAttempts, profile.value?.capture_attempts, saveState.value?.stats?.captureAttempts, 0)
  );

  const captureSuccesses = computed(() =>
    resolveStatField(isOwnProfile.value, gameStore.state.stats?.captureSuccesses, profile.value?.capture_successes, saveState.value?.stats?.captureSuccesses, 0)
  );

  const captureEfficiency = computed(() => {
    const attempts = captureAttempts.value;
    const successes = captureSuccesses.value;
    if (attempts <= 0) return 0;
    return Math.round((successes / attempts) * 100);
  });

  const money = computed(() => (isOwnProfile.value ? gameStore.state.money ?? 0 : saveState.value?.money ?? 0));
  const battleCoinsCount = computed(() => (isOwnProfile.value ? gameStore.state.battleCoins ?? 0 : saveState.value?.battleCoins ?? 0));

  const eventMedalCounts = computed(() => {
    const team = isOwnProfile.value ? gameStore.state.team : saveState.value?.team;
    const box = isOwnProfile.value ? gameStore.state.box : saveState.value?.box;
    const savedStats = (isOwnProfile.value ? gameStore.state.stats : saveState.value?.stats) as Partial<Record<GameStatKey, number>> | undefined;
    return computeEventTrophyCounts(
      team,
      box,
      eventMedalsFirstDb.value,
      eventMedalsSecondDb.value,
      eventMedalsThirdDb.value,
      savedStats?.eventMedalsFirst || 0,
      savedStats?.eventMedalsSecond || 0,
      savedStats?.eventMedalsThird || 0
    );
  });

  const eventMedalsFirst = computed(() => eventMedalCounts.value.first);
  const eventMedalsSecond = computed(() => eventMedalCounts.value.second);
  const eventMedalsThird = computed(() => eventMedalCounts.value.third);
  const eventMedalsTotal = computed(() => eventMedalCounts.value.total);

  const eventParticipations = computed(() => {
    const savedStats = (isOwnProfile.value ? gameStore.state.stats : saveState.value?.stats) as Partial<Record<GameStatKey, number>> | undefined;
    const fromSaved = savedStats?.eventParticipations ?? 0;
    return Math.max(eventParticipationsDb.value, fromSaved, eventMedalsTotal.value);
  });

  return {
    badgesCount,
    pokedexCaught,
    pokedexSeen,
    trainersDefeated,
    wildWins,
    pvpWins,
    pvpLosses,
    eloRating,
    warCoins,
    criminality,
    reputation,
    captureStreak,
    totalWarPoints,
    isGymDefeated,
    playtimeHours,
    rankedMaxElo,
    boxCount,
    pvpDraws,
    longestStreak,
    shinyCount,
    maxDamage,
    totalBattles,
    tradeVolume,
    captureAttempts,
    captureSuccesses,
    captureEfficiency,
    money,
    battleCoinsCount,
    eventMedalsFirst,
    eventMedalsSecond,
    eventMedalsThird,
    eventMedalsTotal,
    eventParticipations
  };
}
