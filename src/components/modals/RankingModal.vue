<script setup lang="ts">
import { gsap } from 'gsap';
import { ref, onMounted, watch, nextTick, computed } from 'vue';

import BaseModal from '@/components/common/BaseModal.vue';
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue';
import SeasonTournamentCard from '@/components/modals/SeasonTournamentCard.vue';
import { useRankTabHover } from '@/composables/arena/useRankCardHover';
import { toPokemonType, type PokemonType } from '@/data/battle/types';
import { getSeasonalThemeForMonth } from '@/data/system/rankedData';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import { useSocialStore } from '@/stores/social/social';
import { useUIStore } from '@/stores/ui';
import type { RankingSortKey } from '@/types/system/game';

import RankingPlayerRow from './RankingPlayerRow.vue';

const RANK_LIST_ANIM_X_OFFSET = -15;
const RANK_LIST_ANIM_SCALE_MIN = 0.97;
const RANK_LIST_ANIM_DURATION_SEC = 0.4;
const RANK_LIST_ANIM_STAGGER_SEC = 0.05;
const RANK_LIST_EASE_STRING = 'back.out(1.15)';
const RANK_SPINNER_ROTATION_DEG = 360;
const RANK_SPINNER_DURATION_SEC = 1.5;

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: false
});

const emit = defineEmits<{
  close: [];
}>();

const socialStore = useSocialStore();

// State
const activeSort = ref<RankingSortKey>('elo_rating');
const listRef = ref<HTMLElement | null>(null);

// Responsiveness
const ui = useUIStore();
const isSmallScreen = computed(() => ui.isSmallScreen);

const currentTheme = computed(() => {
  return getSeasonalThemeForMonth(Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month);
});
const allowedTypes = computed<PokemonType[]>(() =>
  (currentTheme.value.allowedTypes || []).map(toPokemonType)
);

const { handleTabEnter, handleTabLeave } = useRankTabHover();

// Fetch leaderboards
const loadLeaderboard = async (): Promise<void> => {
  await socialStore.fetchLeaderboard(activeSort.value);
};

// GSAP Stagger Entrance Animations
const animateList = async (): Promise<void> => {
  await nextTick();
  if (!listRef.value) return;
  const cards = listRef.value.querySelectorAll('.rank-card');
  if (cards.length > 0) {
    listRef.value.classList.add('list-animating');
    gsap.killTweensOf(cards);
    gsap.from(cards, {
      opacity: 0,
      x: RANK_LIST_ANIM_X_OFFSET,
      scale: RANK_LIST_ANIM_SCALE_MIN,
      duration: RANK_LIST_ANIM_DURATION_SEC,
      stagger: RANK_LIST_ANIM_STAGGER_SEC,
      ease: RANK_LIST_EASE_STRING,
      clearProps: 'all',
      onComplete: () => {
        listRef.value?.classList.remove('list-animating');
      }
    });
  }
};

// Hooks & Watchers
onMounted(async () => {
  await loadLeaderboard();
  await animateList();
});

watch(activeSort, async () => {
  await loadLeaderboard();
  await nextTick();
  const tabs = document.querySelectorAll('.sort-tab');
  tabs.forEach((tab) => {
    gsap.killTweensOf(tab);
    gsap.set(tab, { clearProps: 'color,backgroundColor' });
  });
  await animateList();
});

// Watch loading state to animate the spinner via GSAP
watch(
  () => socialStore.leaderboardLoading,
  async (newVal) => {
    await nextTick();
    const spinner = document.querySelector('.retro-spinner');
    if (newVal && spinner) {
      gsap.to(spinner, {
        rotation: RANK_SPINNER_ROTATION_DEG,
        duration: RANK_SPINNER_DURATION_SEC,
        repeat: -1,
        ease: 'none'
      });
    }
  },
  { immediate: true }
);
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '680px'"
    :height="isSmallScreen ? '100dvh' : '780px'"
    variant="retro"
    padding="raw"
    accent-color="var(--yellow)"
    @close="emit('close')"
  >
    <template #header>
      <div class="ranking-modal-header">
        <div class="ranking-title-group">
          <span class="emoji">🏆</span>
          <div class="title-text-wrap">
            <span class="main-title text-outline">SALÓN DE LA FAMA</span>
            <span class="sub-title">Top 100 entrenadores globales</span>
          </div>
        </div>
        <BaseRefreshButton
          id="ranking-modal-refresh-btn"
          size="md"
          :loading="socialStore.leaderboardLoading"
          title="Actualizar ranking"
          @click="loadLeaderboard"
        />
      </div>
    </template>

    <div class="ranking-modal-content custom-scrollbar">
      <!-- Season Tournament Card (EventCard & Coliseo standard) -->
      <SeasonTournamentCard
        :current-theme="currentTheme"
        :allowed-types="allowedTypes"
        level-cap="100"
      />

      <!-- Sorting Selectors -->
      <div class="sorting-controls">
        <button
          id="ranking-modal-sort-elo-btn"
          class="modal-tab-btn sort-tab text-outline"
          :class="{ active: activeSort === 'elo_rating' }"
          @click.stop="activeSort = 'elo_rating'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          ELO
        </button>
        <button
          id="ranking-modal-sort-level-btn"
          class="modal-tab-btn sort-tab text-outline"
          :class="{ active: activeSort === 'trainer_level' }"
          @click.stop="activeSort = 'trainer_level'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          Nivel
        </button>
        <button
          id="ranking-modal-sort-badges-btn"
          class="modal-tab-btn sort-tab text-outline"
          :class="{ active: activeSort === 'badges' }"
          @click.stop="activeSort = 'badges'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          Medallas
        </button>
      </div>

      <!-- Leaderboard Entries List -->
      <div class="leaderboard-container">
        <div v-if="socialStore.leaderboardLoading" class="loading-view">
          <div class="retro-spinner" />
          <p>Consultando el Salón de la Fama...</p>
        </div>

        <div v-else-if="socialStore.leaderboard.length === 0" class="empty-view">
          No hay datos de entrenadores disponibles.
        </div>

        <div v-else ref="listRef" class="leaderboard-list">
          <RankingPlayerRow
            v-for="(player, index) in socialStore.leaderboard"
            :key="player.id"
            :player="player"
            :index="index"
            :active-sort="activeSort"
          />
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style src="./RankingModal.styles.scss" scoped lang="scss"></style>
