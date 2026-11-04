<script setup lang="ts">
import { gsap } from 'gsap';
import { computed } from 'vue';

// Components
import BaseModal from '@/components/common/BaseModal.vue';
import { useTrainerProfile } from '@/components/modals/useTrainerProfile';
import ProfileAchievementsGrid from '@/components/profile/ProfileAchievementsGrid.vue';
import ProfileEventStatsCard from '@/components/profile/ProfileEventStatsCard.vue';
import ProfileNotifications from '@/components/profile/ProfileNotifications.vue';
import ProfilePinnedReplaysCard from '@/components/profile/ProfilePinnedReplaysCard.vue';
import ProfilePokedexCard from '@/components/profile/ProfilePokedexCard.vue';
import ProfileRankedMedalsCard from '@/components/profile/ProfileRankedMedalsCard.vue';
import ProfileStatsGrid from '@/components/profile/ProfileStatsGrid.vue';
import ProfileTradeNotifs from '@/components/profile/ProfileTradeNotifs.vue';
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue';
import { useStatHover } from '@/composables/ui/useStatHover';
import { formatCurrency } from '@/logic/utils/formatters';
import { formatDisplayDate } from '@/logic/utils/timeUtils';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useLivePvPStore } from '@/stores/livePvP';
import { useModalStore } from '@/stores/modals';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import { useProfileStore } from '@/stores/player/profile';
import { useUIStore } from '@/stores/ui';
import type { BattleReplayRecord } from '@/types/battle/pvp';

import ProfileFactionWarCard from './ProfileFactionWarCard.vue';
import ProfileIdentityCard from './ProfileIdentityCard.vue';
import ProfileStatsSection from './ProfileStatsSection.vue';

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: false
});

defineOptions({ inheritAttrs: false });
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUIStore();
const gameStore = useGameStore();
const authStore = useAuthStore();
const profileStore = useProfileStore();
const classStore = usePlayerClassStore();

const gs = computed(() => gameStore.state);
const profileData = computed(() => profileStore.profileData);

const {
  playtimeHours,
  createdAt,
  rankedMaxElo,
  boxCount,
  longestStreak,
  shinyCount,
  maxDamage,
  totalBattles,
  tradeVolume,
  captureEfficiency,
  faction,
  playerClass,
  criminality,
  reputation,
  captureStreak,
  totalWarPoints,
  warCoins,
  pokedexCaught,
  pokedexSeen,
  eventParticipations,
  eventMedalsTotal,
  eventMedalsFirst,
  eventMedalsSecond,
  eventMedalsThird,
  rankedMedals,
  pinnedReplays
} = useTrainerProfile(() => authStore.user?.id);

const formatNum = (num: unknown): string => formatCurrency(Number(num || 0));

const { handleStatEnter, handleStatLeave } = useStatHover();

const activityStats = computed(() => [
  { label: 'Tiempo Jugado', value: `${playtimeHours.value}h`, class: 'yellow-text' },
  { label: 'Miembro Desde', value: formatDisplayDate(createdAt.value) },
  { label: 'Última Partida', value: 'Activo Ahora' }
]);

const classStats = computed(() => {
  const stats = [];
  if (playerClass.value === 'rocket') {
    stats.push({ label: 'Criminalidad', value: `${criminality.value}%`, class: 'danger-text' });
  } else if (playerClass.value === 'entrenador') {
    stats.push({ label: 'Reputación', value: reputation.value, class: 'primary-text' });
  }
  stats.push({ label: 'Mayor Racha', value: captureStreak.value, class: 'yellow-text' });
  return stats;
});

const trainerName = computed(() => {
  return gs.value.trainer || authStore.user?.user_metadata?.username || 'Entrenador';
});

const displayUsername = computed(() => {
  if (profileData.value.username && profileData.value.username !== '—') {
    return profileData.value.username;
  }
  return trainerName.value;
});

const lastSaveFormatted = computed(() => {
  return profileData.value.lastSave || 'Sin datos';
});

const normalizedStats = computed(() => {
  const stats = profileData.value.stats || {};
  return {
    wins: stats.wins !== undefined ? Number(stats.wins) || 0 : undefined,
    trainersDefeated:
      stats.trainersDefeated !== undefined ? Number(stats.trainersDefeated) || 0 : undefined
  };
});

const modalStore = useModalStore();
const livePvPStore = useLivePvPStore();

const handleWatchReplay = (replay: BattleReplayRecord): void => {
  livePvPStore.watchReplay(replay);
  close();
};

const openRename = (): void => {
  modalStore.open('Rename');
};

const close = (): void => {
  emit('close');
};

const handleLogout = (): void => {
  authStore.logout();
};

const handleEditProfile = (): void => {
  uiStore.open('Cosmetics');
};

const GSAP_AVATAR_HOVER_SCALE_BOOST = 1.05;

const handleAvatarEnter = (e: MouseEvent): void => {
  gsap.to(e.currentTarget, {
    scale: GSAP_AVATAR_HOVER_SCALE_BOOST,
    duration: 0.2,
    ease: 'power2.out'
  });
};

const handleAvatarLeave = (e: MouseEvent): void => {
  gsap.to(e.currentTarget, {
    scale: 1,
    duration: 0.2,
    ease: 'power2.out'
  });
};

const handleFactionChoice = (): void => {
  uiStore.open('FactionChoice');
};
</script>

<template>
  <BaseModal
    :show="show"
    title="MI PERFIL"
    title-color="var(--yellow)"
    :header-background="
      gs.playerClass === 'rocket'
        ? 'Rgba(239, 68, 68, 0.15)'
        : gs.playerClass === 'cazabichos'
          ? 'Rgba(34, 197, 94, 0.15)'
          : gs.playerClass === 'entrenador'
            ? 'Rgba(59, 130, 246, 0.15)'
            : gs.playerClass === 'criador'
              ? 'Rgba(168, 85, 247, 0.15)'
              : 'Rgba(15, 23, 42, 0.8)'
    "
    type="side-right"
    max-width="420px"
    :show-close-button="true"
    padding="raw"
    :custom-class="'profile-modal-legacy ' + (gs.playerClass || 'default')"
    :lock-scroll="false"
    overlay="none"
    @close="close"
  >
    <section class="profile-panel-content custom-scrollbar">
      <div class="profile-body-premium">
        <!-- Identity Section -->
        <ProfileIdentityCard
          :gs="gs"
          :display-username="displayUsername"
          :email="authStore.user?.email || profileData.email"
          :class-store="classStore"
          :faction="faction"
          @edit-profile="handleEditProfile"
          @avatar-enter="handleAvatarEnter"
          @avatar-leave="handleAvatarLeave"
          @open-rename="openRename"
          @open-class-modal="
            modalStore.open(classStore.playerClass ? 'ClassMissions' : 'ClassSelection')
          "
          @faction-choice="handleFactionChoice"
        />

        <!-- Experiencia -->
        <ProfileXpCard title="Nivel y Experiencia Cuenta" :hide-unlocks="true" />

        <ProfileXpCard
          v-if="classStore.playerClass && classStore.currentClassDef"
          :level="classStore.classLevel"
          :exp="classStore.classXP"
          :exp-needed="classStore.classXPNeeded"
          :class-id="classStore.playerClass"
          :class-color="classStore.currentClassDef?.color"
          :title="`Nivel y Experiencia Clase (${classStore.currentClassDef?.name})`"
        />

        <!-- Pokedex Progress -->
        <ProfilePokedexCard :pokedex-caught="pokedexCaught" :pokedex-seen="pokedexSeen" />

        <!-- Stats Grid -->
        <ProfileStatsGrid
          :stats="normalizedStats"
          :level="gs.trainerLevel || profileData.level"
          :badges="gs.badges || profileData.badges"
          :money="gs.money || profileData.money"
          :battle-coins="gs.battleCoins || profileData.battleCoins"
        />

        <!-- Torneos y Competiciones de Eventos -->
        <ProfileEventStatsCard
          :participations="eventParticipations"
          :medals-total="eventMedalsTotal"
          :first-place="eventMedalsFirst"
          :second-place="eventMedalsSecond"
          :third-place="eventMedalsThird"
          :handle-stat-enter="handleStatEnter"
          :handle-stat-leave="handleStatLeave"
        />

        <!-- Medallas de Temporadas Ranked -->
        <ProfileRankedMedalsCard :medals="rankedMedals" />

        <!-- Repeticiones Fijadas -->
        <ProfilePinnedReplaysCard
          :pinned-replays="pinnedReplays"
          :is-own-profile="true"
          :user-id="authStore.user?.id"
          @watch-replay="handleWatchReplay"
        />

        <!-- Faction War Contribution -->
        <ProfileFactionWarCard
          :faction="faction"
          :total-war-points="totalWarPoints"
          :war-coins="warCoins"
          :format-num="formatNum"
          :handle-stat-enter="handleStatEnter"
          :handle-stat-leave="handleStatLeave"
        />

        <!-- Class & Activity Extra Stats -->
        <ProfileStatsSection
          :player-class="playerClass"
          :class-stats="classStats"
          :activity-stats="activityStats"
          :handle-stat-enter="handleStatEnter"
          :handle-stat-leave="handleStatLeave"
        />

        <!-- Logros de Entrenador -->
        <ProfileAchievementsGrid
          :ranked-max-elo="rankedMaxElo"
          :box-count="boxCount"
          :shiny-count="shinyCount"
          :longest-streak="longestStreak"
          :max-damage="maxDamage"
          :total-battles="totalBattles"
          :trade-volume="tradeVolume"
          :capture-efficiency="captureEfficiency"
        />

        <!-- Save Info -->
        <div class="profile-section-card save-card">
          <div class="section-label">GUARDADO</div>
          <div class="save-row">
            <span class="save-status">{{ lastSaveFormatted }}</span>
          </div>
        </div>

        <!-- Notifications -->
        <ProfileNotifications :history="profileData.notificationHistory || []" />

        <!-- Trade Notifications -->
        <ProfileTradeNotifs />

        <!-- Action Buttons -->
        <div class="profile-actions-legacy">
          <button
            id="profile-modal-btn-cerrar-sesi-n"
            class="logout-btn-legacy"
            @click.stop="handleLogout"
          >
            <i class="fas fa-sign-out-alt" /> CERRAR SESIÓN
          </button>
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped lang="scss">
@use '@/styles/components/_profile-modal.scss' as *;
</style>
