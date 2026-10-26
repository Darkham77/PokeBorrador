<script setup lang="ts">
import { gsap } from 'gsap';
import { computed, watch, ref } from 'vue';

import PVTooltip from '@/components/common/PVTooltip.vue';
import { usePastEventAwards } from '@/composables/events/usePastEventAwards';
import { getEventDisplayName, type Event as GameEvent } from '@/logic/events/eventEngine';
import { isAwardClaimable } from '@/logic/events/eventValidators';
import { useEventStore } from '@/stores/events';
import { useModalStore } from '@/stores/modals';
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics';
import { useUIStore } from '@/stores/ui';
import type { PastEventHistoryItem } from '@/types/system/stores';

import PastEventAwardRow from './PastEventAwardRow.vue';
import PastEventCardClaimAction from './PastEventCardClaimAction.vue';
import PastEventCategoryPodiumBlock from './PastEventCategoryPodiumBlock.vue';

interface Props {
  item: PastEventHistoryItem;
}

type Emits = (e: 'claim', awardId: string) => void;

const props = defineProps<Props>();
const _emit = defineEmits<Emits>();

const eventStore = useEventStore();
const chatCosmetics = useChatCosmeticsStore();
const modalStore = useModalStore();
const uiStore = useUIStore();

const HOVER_ANIMATION_DURATION_SEC = 0.2;

const matchingEvent = computed<GameEvent | null>(() => {
  return eventStore.allEvents.find((e) => e.id === props.item.event_id) || null;
});

const displayName = computed<string>(() => {
  if (props.item.event_id.startsWith('custom_') || props.item.event_name?.startsWith('custom_')) {
    return 'Evento desconocido';
  }
  if (matchingEvent.value) {
    return getEventDisplayName(matchingEvent.value);
  }
  return props.item.event_name || 'Evento desconocido';
});

const canOpenDetail = computed<boolean>(() => {
  return displayName.value !== 'Evento desconocido' && matchingEvent.value !== null;
});

const openEventDetail = (): void => {
  if (!canOpenDetail.value || !matchingEvent.value) return;
  const fullEvent: GameEvent & { ended_at?: string } = {
    ...matchingEvent.value,
    name: matchingEvent.value.name ? matchingEvent.value.name : props.item.event_name,
    description: matchingEvent.value.description
      ? matchingEvent.value.description
      : props.item.event_description,
    icon: matchingEvent.value.icon ? matchingEvent.value.icon : props.item.event_icon,
    schedule: matchingEvent.value.schedule
      ? matchingEvent.value.schedule
      : props.item.event_schedule,
    start_at: matchingEvent.value.start_at ? matchingEvent.value.start_at : props.item.start_at,
    end_at: matchingEvent.value.end_at ? matchingEvent.value.end_at : props.item.end_at,
    ended_at: props.item.ended_at
  };
  modalStore.open('EventDetail', {
    event: fullEvent
  });
};

watch(
  () => props.item.winners,
  (winners) => {
    if (winners && winners.length > 0) {
      const ids = winners.map((w) => w.player_id).filter(Boolean);
      chatCosmetics.fetchMissingCosmetics(ids);
    }
  },
  { immediate: true }
);

const onBtnHover = (event: MouseEvent, isEntering: boolean): void => {
  const btn = event.currentTarget as HTMLElement;
  if (!btn || btn.hasAttribute('disabled')) return;
  if (isEntering) {
    gsap.to(btn, {
      scale: 1.04,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  } else {
    gsap.to(btn, {
      scale: 1,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }
};

const onDiscardHover = (event: MouseEvent, isEntering: boolean): void => {
  onBtnHover(event, isEntering);
};

const onDiscardClick = (awardId?: string, categoryName?: string): void => {
  if (!awardId) return;
  if (modalStore.isOpen('Confirm')) return;
  const catSuffix = categoryName ? ` (${categoryName})` : '';
  modalStore.open('Confirm', {
    title: '¿DESCARTAR RECOMPENSA?',
    message: `¿Estás seguro de que deseas descartar la recompensa de "${displayName.value}"${catSuffix}? Esta acción no se puede deshacer y se eliminará permanentemente.`,
    confirmText: 'DESCARTAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    variant: 'retro',
    onConfirm: async () => {
      await eventStore.discardAward(awardId);
    }
  });
};

const goToHomeRewards = (): void => {
  modalStore.closeAll();
  uiStore.activeTab = 'home';
};

const onClaimClick = (_awardUid?: string): void => {
  goToHomeRewards();
};

const isClaimingAll = ref(false);
const onClaimAllClick = (): void => {
  goToHomeRewards();
};

const {
  formattedSchedule,
  groupedWinners,
  getCategoryIcon,
  allMyAwards,
  pendingMyAwards,
  parsePrize,
  getAwardForCategory,
  unmatchedAwards
} = usePastEventAwards(() => props.item, matchingEvent);
</script>

<template>
  <div class="past-event-card" :class="{ 'user-won': item.isWinner }">
    <!-- Card Top Bar -->
    <div class="card-top">
      <div class="event-meta">
        <span class="emoji event-icon">{{ item.event_icon }}</span>
        <div class="event-title-group">
          <div class="event-title-row">
            <h4 class="event-name">
              {{ displayName }}
            </h4>
            <PVTooltip
              :title="
                canOpenDetail
                  ? 'Ver detalles y reglas del evento'
                  : 'Detalles no disponibles (evento archivado)'
              "
              position="top"
            >
              <button
                :id="'past-event-info-btn-' + (item.id || item.event_id)"
                class="event-info-btn"
                :class="{ 'disabled-btn': !canOpenDetail }"
                :disabled="!canOpenDetail"
                @mouseenter="onBtnHover($event, true)"
                @mouseleave="onBtnHover($event, false)"
                @click.stop="openEventDetail"
              >
                <span class="emoji info-icon">ℹ️</span>
              </button>
            </PVTooltip>
          </div>
          <span class="event-date">{{ formattedSchedule }}</span>
        </div>
      </div>

      <!-- Claim Status / Button -->
      <PastEventCardClaimAction
        :pending-my-awards="pendingMyAwards"
        :all-my-awards-count="allMyAwards.length"
        :is-claimed="item.isClaimed"
        :is-winner="item.isWinner"
        :all-events="eventStore.allEvents"
        :is-claiming-all="isClaimingAll"
        @claim-all="onClaimAllClick"
        @claim="onClaimClick"
        @discard="onDiscardClick"
        @btn-hover="onBtnHover"
        @discard-hover="onDiscardHover"
      />
    </div>

    <!-- Podium / Winners grouped by category -->
    <div class="podium-box">
      <div class="podium-title">PODIO DE GANADORES</div>

      <div v-if="item.winners.length === 0" class="no-winners">
        Sin participantes registrados en esta edición.
      </div>

      <div v-else class="categories-podium-list">
        <PastEventCategoryPodiumBlock
          v-for="catGroup in groupedWinners"
          :key="catGroup.categoryId"
          :cat-group="catGroup"
          :category-icon="getCategoryIcon(catGroup.categoryId)"
          :award="getAwardForCategory(catGroup.categoryId)"
          :prize="
            getAwardForCategory(catGroup.categoryId)
              ? parsePrize(getAwardForCategory(catGroup.categoryId)!.prize)
              : null
          "
          :is-claimable="
            getAwardForCategory(catGroup.categoryId)
              ? isAwardClaimable(getAwardForCategory(catGroup.categoryId)!, eventStore.allEvents)
              : false
          "
          @claim="onClaimClick"
          @discard="onDiscardClick"
          @hover="onBtnHover"
          @discard-hover="onDiscardHover"
        />

        <!-- Other Unmatched Awards Block -->
        <div v-if="unmatchedAwards.length > 0" class="category-podium-block other-awards-block">
          <div class="category-block-header pixelated">
            <span class="emoji cat-icon">🎁</span>
            <span class="cat-name">OTRAS RECOMPENSAS GANADAS</span>
          </div>

          <PastEventAwardRow
            v-for="unmatched in unmatchedAwards"
            :key="unmatched.id"
            :award="unmatched"
            label="PREMIO:"
            :prize="parsePrize(unmatched.prize)"
            :is-claimable="isAwardClaimable(unmatched, eventStore.allEvents)"
            @claim="onClaimClick"
            @discard="onDiscardClick"
            @hover="onBtnHover"
            @discard-hover="onDiscardHover"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./PastEventCard.styles.scss" lang="scss"></style>
