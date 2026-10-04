<script setup lang="ts">
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import { getEventDisplayName as getEventDisplayNameCore } from '@/logic/events/eventEngine'
import { resolveAwardCategory } from '@/logic/events/eventCompetitions'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import { logger } from '@/logic/utils/logger'
import type { PendingAward } from '@/types/system/stores'
import { parsePrize } from '@/composables/events/usePastEventAwards'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'

const eventStore = useEventStore()
const uiStore = useUIStore()
const { pendingAwards, allEvents } = storeToRefs(eventStore)

const getEventDisplayName = (eventId: string, awardedAt?: string): string => {
  const ev = (allEvents.value || []).find(e => e.id === eventId)
  if (!ev) return 'Evento desconocido'
  if (awardedAt) {
    try {
      const awardedZdt = Temporal.Instant.from(awardedAt).toZonedDateTimeISO(GAME_TIMEZONE)
      return getEventDisplayNameCore(ev, awardedZdt)
    } catch (err) {
      logger.warn('[EventPendingAwardsBanner] Error parseando awardedAt:', err)
    }
  }
  return getEventDisplayNameCore(ev)
}

const getAwardCategory = (award: PendingAward) => {
  const ev = (allEvents.value || []).find(e => e.id === award.event_id)
  const pastEv = (eventStore.pastEvents || []).find(pe => pe.event_id === award.event_id)
  return resolveAwardCategory(award, ev, pastEv?.winners)
}

const getAwardEventName = (award: PendingAward): string => {
  return getEventDisplayName(award.event_id || '', award.awarded_at)
}

const getAwardFullDisplayName = (award: PendingAward): string => {
  const baseName = getAwardEventName(award)
  const cat = getAwardCategory(award)
  if (cat?.categoryTitle) {
    return `${baseName} - ${cat.categoryTitle}`
  }
  return baseName
}

const getCategoryBadge = (award: PendingAward): { icon: string; name: string } | null => {
  const cat = getAwardCategory(award)
  if (cat) {
    return { icon: cat.icon, name: cat.categoryTitle }
  }
  return null
}

const checkIfClaimable = (award: PendingAward): boolean => {
  return isAwardClaimable(award, allEvents.value)
}

const onBtnHover = (e: MouseEvent, enter: boolean) => {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  if (enter) {
    gsap.to(el, { scale: 1.05, duration: 0.15, ease: 'power2.out', overwrite: 'auto' })
  } else {
    gsap.to(el, { scale: 1.0, duration: 0.2, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,scale' })
  }
}

const onDiscardHover = (e: MouseEvent, enter: boolean) => {
  onBtnHover(e, enter)
}

const confirmDiscard = (awardId: string, eventName: string) => {
  uiStore.openConfirm({
    title: '¿DESCARTAR RECOMPENSA?',
    message: `¿Estás seguro de que deseas descartar la recompensa de "${eventName}"? Esta acción es irreversible y no podrás reclamarla más adelante.`,
    confirmText: 'SÍ, DESCARTAR',
    cancelText: 'VOLVER',
    type: 'danger',
    onConfirm: async () => {
      await eventStore.discardAward(awardId)
    }
  })
}
</script>

<template>
  <div
    v-if="pendingAwards.length > 0"
    class="event-pending-awards-banner awards-box"
  >
    <div class="box-inner">
      <h3 class="pixelated">
        <span class="emoji">🎁</span> RECOMPENSAS PENDIENTES ({{ pendingAwards.length }})
      </h3>

      <div class="awards-list">
        <div
          v-for="award in pendingAwards"
          :id="'pending-award-item-' + award.id"
          :key="award.id"
          class="award-item"
          :class="{ 'is-legacy': !checkIfClaimable(award) }"
        >
          <div class="award-info">
            <div class="award-name-row">
              <span class="award-name">{{ getAwardEventName(award) }}</span>
              <span
                v-if="getCategoryBadge(award)"
                class="category-badge"
              >
                <span class="emoji">{{ getCategoryBadge(award)?.icon }}</span> {{ getCategoryBadge(award)?.name }}
              </span>
              <span
                v-if="!checkIfClaimable(award)"
                class="legacy-badge"
              >
                <span class="emoji">⚠️</span> ARCHIVADO / NO DISPONIBLE
              </span>
            </div>

            <div class="award-pills-wrap">
              <RewardPillsGroup :prize="parsePrize(award.prize)" />
            </div>
          </div>

          <div class="award-actions-wrap">
            <button
              v-if="checkIfClaimable(award)"
              :id="'claim-pending-award-btn-' + award.id"
              class="retro-btn claim-action-btn"
              @mouseenter="onBtnHover($event, true)"
              @mouseleave="onBtnHover($event, false)"
              @click.stop="eventStore.claimAward(award.id)"
            >
              <span class="emoji">🎁</span>
              RECLAMAR PREMIO
            </button>
            <button
              :id="'discard-pending-award-btn-' + award.id"
              class="retro-btn discard-action-btn"
              :class="{ 'only-action': !checkIfClaimable(award) }"
              @mouseenter="onDiscardHover($event, true)"
              @mouseleave="onDiscardHover($event, false)"
              @click.stop="confirmDiscard(award.id, getAwardFullDisplayName(award))"
            >
              <span class="emoji">🗑️</span>
              DESCARTAR
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.awards-box {
  padding: 4px;
  border: 1px solid rgb(34 197 94 / 25%);
  border-radius: 12px;
  background: rgb(34 197 94 / 6%);
  margin-bottom: 16px;
  box-sizing: border-box;

  .box-inner {
    padding: 12px;
    border-radius: 8px;
    background: rgb(0 0 0 / 35%);
  }

  h3 {
    @include pixelated;

    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 10px;
    color: var(--green-bright, #4ade80);
    font-size: 9px;
  }

  .awards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .award-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid rgb(255 255 255 / 6%);
    border-radius: 8px;
    background: rgb(255 255 255 / 3%);
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    &.is-legacy {
      background: rgb(239 68 68 / 4%);
      border-color: rgb(239 68 68 / 20%);
    }

    .award-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      flex: 1;
    }

    .award-name-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .legacy-badge {
      @include pixelated;

      padding: 2px 6px;
      border: 1px solid rgb(239 68 68 / 40%);
      border-radius: 4px;
      background: rgb(239 68 68 / 15%);
      color: #fca5a5;
      font-size: 7px;
      letter-spacing: 0.5px;
    }

    .category-badge {
      @include pixelated;

      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid rgb(59 130 246 / 40%);
      border-radius: 4px;
      background: rgb(59 130 246 / 15%);
      color: #93c5fd;
      font-size: 7px;
      letter-spacing: 0.5px;
    }

    .award-name {
      color: var(--white, #fff);
      font-size: 11px;
      font-weight: bold;
    }

    .award-pills-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .award-actions-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
  }
}

.retro-btn {
  @include pixelated;
  @include event-award-action-buttons;

  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 8px;
  cursor: pointer;
  white-space: nowrap;
}
</style>
