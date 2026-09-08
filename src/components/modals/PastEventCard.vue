<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { gsap } from 'gsap'
import type { PastEventHistoryItem } from '@/types/system/stores'
import { getEventDisplayName, type Event as GameEvent } from '@/logic/events/eventEngine'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import PVTooltip from '@/components/common/PVTooltip.vue'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'
import PastEventWinnerItem from './PastEventWinnerItem.vue'
import { usePastEventAwards } from '@/composables/events/usePastEventAwards'

interface Props {
  item: PastEventHistoryItem
}

interface Emits {
  (e: 'claim', awardId: string): void
}

const props = defineProps<Props>()
const _emit = defineEmits<Emits>()

const eventStore = useEventStore()
const chatCosmetics = useChatCosmeticsStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const HOVER_ANIMATION_DURATION_SEC = 0.2
const HOVER_TRANSLATE_Y_PX = -2

const matchingEvent = computed<GameEvent | null>(() => {
  return eventStore.allEvents.find(e => e.id === props.item.event_id) || null
})

const displayName = computed<string>(() => {
  if (props.item.event_id.startsWith('custom_') || props.item.event_name?.startsWith('custom_')) {
    return 'Evento desconocido'
  }
  if (matchingEvent.value) {
    return getEventDisplayName(matchingEvent.value)
  }
  return props.item.event_name || 'Evento desconocido'
})

const canOpenDetail = computed<boolean>(() => {
  return displayName.value !== 'Evento desconocido' && matchingEvent.value !== null
})

const openEventDetail = () => {
  if (!canOpenDetail.value || !matchingEvent.value) return
  const fullEvent: GameEvent & { ended_at?: string } = {
    ...matchingEvent.value,
    name: matchingEvent.value.name ? matchingEvent.value.name : props.item.event_name,
    description: matchingEvent.value.description ? matchingEvent.value.description : props.item.event_description,
    icon: matchingEvent.value.icon ? matchingEvent.value.icon : props.item.event_icon,
    schedule: matchingEvent.value.schedule ? matchingEvent.value.schedule : props.item.event_schedule,
    start_at: matchingEvent.value.start_at ? matchingEvent.value.start_at : props.item.start_at,
    end_at: matchingEvent.value.end_at ? matchingEvent.value.end_at : props.item.end_at,
    ended_at: props.item.ended_at
  }
  modalStore.open('EventDetail', {
    event: fullEvent
  })
}

watch(
  () => props.item.winners,
  (winners) => {
    if (winners && winners.length > 0) {
      const ids = winners.map((w) => w.player_id).filter(Boolean)
      chatCosmetics.fetchMissingCosmetics(ids)
    }
  },
  { immediate: true }
)

const onBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  if (isEntering) {
    gsap.to(btn, {
      y: HOVER_TRANSLATE_Y_PX,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      y: 0,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform'
    })
  }
}

const onDiscardHover = (event: MouseEvent, isEntering: boolean) => {
  onBtnHover(event, isEntering)
}

const onDiscardClick = (awardId?: string, categoryName?: string) => {
  if (!awardId) return
  if (modalStore.isOpen('Confirm')) return
  const catSuffix = categoryName ? ` (${categoryName})` : ''
  modalStore.open('Confirm', {
    title: '¿DESCARTAR RECOMPENSA?',
    message: `¿Estás seguro de que deseas descartar la recompensa de "${displayName.value}"${catSuffix}? Esta acción no se puede deshacer y se eliminará permanentemente.`,
    confirmText: 'DESCARTAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    variant: 'retro',
    onConfirm: async () => {
      await eventStore.discardAward(awardId)
    }
  })
}

const onInfoBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  if (isEntering) {
    gsap.to(btn, {
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 215, 0, 0.5)',
      scale: 1.1,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      scale: 1,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,background,borderColor'
    })
  }
}

const goToHomeRewards = () => {
  modalStore.closeAll()
  uiStore.activeTab = 'home'
}

const onClaimClick = (_awardUid?: string) => {
  goToHomeRewards()
}

const isClaimingAll = ref(false)
const onClaimAllClick = () => {
  goToHomeRewards()
}

const {
  formattedSchedule,
  groupedWinners,
  getCategoryIcon,
  allMyAwards,
  pendingMyAwards,
  parsePrize,
  getAwardForCategory,
  unmatchedAwards
} = usePastEventAwards(() => props.item, matchingEvent)
</script>

<template>
  <div
    class="past-event-card"
    :class="{ 'user-won': item.isWinner }"
  >
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
              :title="canOpenDetail ? 'Ver detalles y reglas del evento' : 'Detalles no disponibles (evento archivado)'"
              position="top"
            >
              <button
                :id="'past-event-info-btn-' + (item.id || item.event_id)"
                class="event-info-btn"
                :class="{ 'disabled-btn': !canOpenDetail }"
                :disabled="!canOpenDetail"
                @mouseenter="onInfoBtnHover($event, true)"
                @mouseleave="onInfoBtnHover($event, false)"
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
      <div class="award-action-slot">
        <template v-if="pendingMyAwards.length > 1">
          <button
            id="claim-all-past-awards-btn"
            class="retro-btn claim-all-btn"
            :disabled="isClaimingAll"
            @mouseenter="onBtnHover($event, true)"
            @mouseleave="onBtnHover($event, false)"
            @click.stop="onClaimAllClick"
          >
            <span class="emoji">🎁</span>
            RECLAMAR TODAS EN INICIO ({{ pendingMyAwards.length }})
          </button>
        </template>

        <template v-else-if="pendingMyAwards.length === 1 && pendingMyAwards[0]">
          <button
            v-if="isAwardClaimable(pendingMyAwards[0], eventStore.allEvents)"
            :id="'claim-past-award-btn-' + pendingMyAwards[0].id"
            class="retro-btn claim-btn"
            @mouseenter="onBtnHover($event, true)"
            @mouseleave="onBtnHover($event, false)"
            @click.stop="onClaimClick(pendingMyAwards[0].id)"
          >
            <span class="emoji">🎁</span>
            RECLAMAR EN INICIO
          </button>
          <button
            :id="'discard-past-award-btn-' + pendingMyAwards[0].id"
            class="retro-btn discard-btn"
            :class="{ 'only-action': !isAwardClaimable(pendingMyAwards[0], eventStore.allEvents) }"
            @mouseenter="onDiscardHover($event, true)"
            @mouseleave="onDiscardHover($event, false)"
            @click.stop="onDiscardClick(pendingMyAwards[0].id)"
          >
            <span class="emoji">🗑️</span>
            DESCARTAR
          </button>
        </template>

        <div
          v-else-if="item.isClaimed || (allMyAwards.length > 0 && pendingMyAwards.length === 0)"
          class="claimed-badge"
        >
          <span class="emoji">✓</span> RECLAMADA
        </div>

        <div
          v-else-if="item.isWinner"
          class="winner-badge"
        >
          <span class="emoji">🏆</span> GANADOR
        </div>
      </div>
    </div>

    <!-- Podium / Winners grouped by category -->
    <div class="podium-box">
      <div class="podium-title">
        PODIO DE GANADORES
      </div>

      <div
        v-if="item.winners.length === 0"
        class="no-winners"
      >
        Sin participantes registrados en esta edición.
      </div>

      <div
        v-else
        class="categories-podium-list"
      >
        <div
          v-for="catGroup in groupedWinners"
          :key="catGroup.categoryId"
          class="category-podium-block"
        >
          <div class="category-block-header pixelated">
            <span class="emoji cat-icon">{{ getCategoryIcon(catGroup.categoryId) }}</span>
            <span class="cat-name">{{ catGroup.categoryName }}</span>
          </div>

          <div class="winners-list">
            <PastEventWinnerItem
              v-for="(w, idx) in catGroup.winners"
              :key="w.player_id || idx"
              :winner="w"
              :category-id="catGroup.categoryId"
              :rank-index="idx"
            />
          </div>

          <!-- Category User Award Banner -->
          <div
            v-if="getAwardForCategory(catGroup.categoryId)"
            class="category-user-award"
          >
            <div class="user-award-left">
              <span class="user-award-label pixelated">
                <span class="emoji">🎁</span> TU PREMIO:
              </span>
              <div class="award-pills-wrap">
                <RewardPillsGroup :prize="parsePrize(getAwardForCategory(catGroup.categoryId)!.prize)" />
              </div>
            </div>

            <div class="user-award-actions">
              <template v-if="getAwardForCategory(catGroup.categoryId)!.received_at === null">
                <button
                  v-if="isAwardClaimable(getAwardForCategory(catGroup.categoryId)!, eventStore.allEvents)"
                  :id="'claim-cat-award-btn-' + getAwardForCategory(catGroup.categoryId)!.id"
                  class="retro-btn claim-btn mini"
                  @mouseenter="onBtnHover($event, true)"
                  @mouseleave="onBtnHover($event, false)"
                  @click.stop="onClaimClick(getAwardForCategory(catGroup.categoryId)!.id)"
                >
                  <span class="emoji">🎁</span> EN INICIO
                </button>
                <button
                  :id="'discard-cat-award-btn-' + getAwardForCategory(catGroup.categoryId)!.id"
                  class="retro-btn discard-btn mini"
                  :class="{ 'only-action': !isAwardClaimable(getAwardForCategory(catGroup.categoryId)!, eventStore.allEvents) }"
                  @mouseenter="onDiscardHover($event, true)"
                  @mouseleave="onDiscardHover($event, false)"
                  @click.stop="onDiscardClick(getAwardForCategory(catGroup.categoryId)!.id, catGroup.categoryName)"
                >
                  <span class="emoji">🗑️</span> DESCARTAR
                </button>
              </template>
              <div
                v-else
                class="claimed-badge mini"
              >
                <span class="emoji">✓</span> RECLAMADA
              </div>
            </div>
          </div>
        </div>

        <!-- Other Unmatched Awards Block -->
        <div
          v-if="unmatchedAwards.length > 0"
          class="category-podium-block other-awards-block"
        >
          <div class="category-block-header pixelated">
            <span class="emoji cat-icon">🎁</span>
            <span class="cat-name">OTRAS RECOMPENSAS GANADAS</span>
          </div>

          <div
            v-for="unmatched in unmatchedAwards"
            :key="unmatched.id"
            class="category-user-award"
          >
            <div class="user-award-left">
              <span class="user-award-label pixelated">
                <span class="emoji">🎁</span> PREMIO:
              </span>
              <div class="award-pills-wrap">
                <RewardPillsGroup :prize="parsePrize(unmatched.prize)" />
              </div>
            </div>

            <div class="user-award-actions">
              <template v-if="unmatched.received_at === null">
                <button
                  v-if="isAwardClaimable(unmatched, eventStore.allEvents)"
                  :id="'claim-unmatched-award-btn-' + unmatched.id"
                  class="retro-btn claim-btn mini"
                  @mouseenter="onBtnHover($event, true)"
                  @mouseleave="onBtnHover($event, false)"
                  @click.stop="onClaimClick(unmatched.id)"
                >
                  <span class="emoji">🎁</span> EN INICIO
                </button>
                <button
                  :id="'discard-unmatched-award-btn-' + unmatched.id"
                  class="retro-btn discard-btn mini"
                  :class="{ 'only-action': !isAwardClaimable(unmatched, eventStore.allEvents) }"
                  @mouseenter="onDiscardHover($event, true)"
                  @mouseleave="onDiscardHover($event, false)"
                  @click.stop="onClaimClick(unmatched.id)"
                >
                  <span class="emoji">🗑️</span> DESCARTAR
                </button>
              </template>
              <div
                v-else
                class="claimed-badge mini"
              >
                <span class="emoji">✓</span> RECLAMADA
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./PastEventCard.styles.scss" lang="scss"></style>
