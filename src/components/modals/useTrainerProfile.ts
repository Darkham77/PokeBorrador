import { computed, type ComputedRef, type Ref } from 'vue';

import { PLAYER_CLASSES, isPlayerClassId, type PlayerClassId } from '@/data/player/playerClasses';
import { getXPNeededForClassLevel } from '@/logic/player/classMath';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useChatStore } from '@/stores/social/chat';
import { useSocialStore, type Friend } from '@/stores/social/social';
import type { RankedSeasonMedal, BattleReplayRecord } from '@/types/battle/pvp.ts';

import {
  resolveCosmeticField,
  resolveFactionLabel,
  resolveFactionColor,
  type ProfileRow,
  type SaveStateData
} from './trainerProfileResolver.ts';
import { useTrainerProfileFetcher } from './useTrainerProfileFetcher.ts';
import {
  useTrainerProfileStats,
  type UseTrainerProfileStatsReturn
} from './useTrainerProfileStats.ts';

export interface UseTrainerProfileReturn extends UseTrainerProfileStatsReturn {
  readonly loading: Ref<boolean>;
  readonly profile: Ref<ProfileRow | null>;
  readonly saveState: Ref<SaveStateData | null>;
  readonly error: Ref<string | null>;
  readonly isOwnProfile: ComputedRef<boolean>;
  readonly trainerName: ComputedRef<string>;
  readonly faction: ComputedRef<string | null>;
  readonly playerClass: ComputedRef<PlayerClassId | null>;
  readonly classDef: ComputedRef<(typeof PLAYER_CLASSES)[keyof typeof PLAYER_CLASSES] | null>;
  readonly trainerLevel: ComputedRef<number>;
  readonly avatarStyle: ComputedRef<string>;
  readonly nickStyle: ComputedRef<string>;
  readonly gender: ComputedRef<string>;
  readonly factionLabel: ComputedRef<string>;
  readonly factionColor: ComputedRef<string>;
  readonly createdAt: ComputedRef<string | null>;
  readonly lastPlayedAt: ComputedRef<string | null>;
  readonly classLevel: ComputedRef<number>;
  readonly classXP: ComputedRef<number>;
  readonly classXPNeeded: ComputedRef<number>;
  readonly rankedMedals: Ref<RankedSeasonMedal[]>;
  readonly pinnedReplays: Ref<BattleReplayRecord[]>;
  readonly fetchData: () => Promise<void>;
}

export function useTrainerProfile(
  getUserId: () => string | null | undefined
): UseTrainerProfileReturn {
  const gameStore = useGameStore();
  const authStore = useAuthStore();
  const chatStore = useChatStore();
  const socialStore = useSocialStore();

  const userId = computed(getUserId);

  const isOwnProfile = computed(() => {
    return authStore.user?.id === userId.value;
  });

  const {
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
  } = useTrainerProfileFetcher(userId, isOwnProfile);

  const stats = useTrainerProfileStats(
    isOwnProfile,
    profile,
    saveState,
    eventParticipationsDb,
    eventMedalsFirstDb,
    eventMedalsSecondDb,
    eventMedalsThirdDb
  );

  const cachedCosmetic = computed(() =>
    userId.value ? chatStore.profileCosmetics[userId.value] : null
  );
  const friendProfile = computed(() =>
    userId.value ? socialStore.friends.find((f: Friend) => f.id === userId.value) : null
  );

  const trainerName = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.trainer,
      cachedCosmetic.value?.username,
      friendProfile.value?.username,
      profile.value?.username || authStore.user?.user_metadata?.username,
      saveState.value?.trainer,
      'Entrenador'
    )
  );

  const faction = computed(() => {
    if (isOwnProfile.value) return gameStore.state.faction || null;
    return profile.value?.faction || saveState.value?.faction || null;
  });

  const playerClass = computed<PlayerClassId | null>(() => {
    const raw = resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.playerClass,
      cachedCosmetic.value?.player_class,
      friendProfile.value?.playerClass,
      profile.value?.player_class,
      saveState.value?.playerClass,
      null
    );
    return raw && isPlayerClassId(raw) ? raw : null;
  });

  const classDef = computed(() => {
    if (!playerClass.value || !isPlayerClassId(playerClass.value)) return null;
    return PLAYER_CLASSES[playerClass.value] || null;
  });

  const trainerLevel = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.trainerLevel,
      cachedCosmetic.value?.trainer_level,
      friendProfile.value?.level,
      profile.value?.trainer_level,
      saveState.value?.trainerLevel,
      1
    )
  );

  const avatarStyle = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.avatar_style,
      cachedCosmetic.value?.avatar_style,
      friendProfile.value?.avatar_style,
      profile.value?.avatar_style,
      saveState.value?.avatar_style,
      ''
    )
  );

  const nickStyle = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.nick_style,
      cachedCosmetic.value?.nick_style,
      friendProfile.value?.nick_style,
      profile.value?.nick_style,
      saveState.value?.nick_style,
      ''
    )
  );

  const gender = computed(() =>
    resolveCosmeticField(
      isOwnProfile.value,
      gameStore.state.gender,
      cachedCosmetic.value?.gender,
      friendProfile.value?.gender,
      profile.value?.gender,
      saveState.value?.gender,
      'h'
    )
  );

  const factionLabel = computed(() => resolveFactionLabel(faction.value));
  const factionColor = computed(() => resolveFactionColor(faction.value));

  const createdAt = computed(
    () =>
      profile.value?.created_at || (isOwnProfile.value ? Temporal.Now.instant().toString() : null)
  );
  const lastPlayedAt = computed(() =>
    isOwnProfile.value ? Temporal.Now.instant().toString() : profile.value?.last_played_at || null
  );

  const classLevel = computed(() =>
    isOwnProfile.value
      ? (gameStore.state.classLevel ?? 1)
      : (profile.value?.class_level ?? saveState.value?.classLevel ?? 1)
  );
  const classXP = computed(() =>
    isOwnProfile.value
      ? (gameStore.state.classXP ?? 0)
      : (profile.value?.class_xp ?? saveState.value?.classXP ?? 0)
  );
  const classXPNeeded = computed(() => getXPNeededForClassLevel(classLevel.value));

  return {
    loading,
    profile,
    saveState,
    error,
    isOwnProfile,
    trainerName,
    faction,
    playerClass,
    classDef,
    trainerLevel,
    avatarStyle,
    nickStyle,
    gender,
    factionLabel,
    factionColor,
    createdAt,
    lastPlayedAt,
    classLevel,
    classXP,
    classXPNeeded,
    rankedMedals,
    pinnedReplays,
    fetchData,
    ...stats
  };
}
