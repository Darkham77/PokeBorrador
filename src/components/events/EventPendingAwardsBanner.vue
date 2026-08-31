<script setup lang="ts">
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/events'
import { useUIStore } from '@/stores/ui'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import { getEventDisplayName as getEventDisplayNameCore } from '@/logic/events/eventEngine'
import type { PendingAward } from '@/types/system/stores'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'

const eventStore = useEventStore()
const uiStore = useUIStore()
const { pendingAwards, allEvents } = storeToRefs(eventStore)

const getEventDisplayName = (eventId: string): string => {
  const ev = (allEvents.value || []).find(e => e.id === eventId)
  if (!ev) return 'Evento desconocido'
  return getEventDisplayNameCore(ev)
}

const parsePrize = (rawPrize: unknown): Record<string, unknown> => {
  if (!rawPrize) return {}
  if (typeof rawPrize === 'string') {
    try {
      return JSON.parse(rawPrize) as Record<string, unknown> // open-record
    } catch {
      return {}
    }
  }
  return typeof rawPrize === 'object' ? (rawPrize as Record<string, unknown>) : {} // open-record
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
        <span class="title-icon">🎁</span> RECOMPENSAS PENDIENTES ({{ pendingAwards.length }})
      </h3>
      
      <div class="awards-list">
        <div
          v-for="award in pendingAwards"
          :key="award.id"
          class="award-item"
          :class="{ 'is-legacy': !checkIfClaimable(award) }"
        >
          <div class="award-info">
            <div class="award-name-row">
              <span class="award-name">{{ getEventDisplayName(award.event_id || '') }}</span>
              <span
                v-if="!checkIfClaimable(award)"
                class="legacy-badge"
              >
                <span class="emoji-inline">⚠️</span> ARCHIVADO / NO DISPONIBLE
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
              <span class="btn-emoji">🎁</span>
              RECLAMAR PREMIO
            </button>
            <button
              :id="'discard-pending-award-btn-' + award.id"
              class="retro-btn discard-action-btn"
              :class="{ 'only-action': !checkIfClaimable(award) }"
              @mouseenter="onDiscardHover($event, true)"
              @mouseleave="onDiscardHover($event, false)"
              @click.stop="confirmDiscard(award.id, getEventDisplayName(award.event_id || ''))"
            >
              <span class="btn-emoji">🗑️</span>
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
  background: Rgba(34, 197, 94, 0.06);
  border: 1px solid Rgba(34, 197, 94, 0.25);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
  box-sizing: border-box;

  .box-inner {
    background: Rgba(0, 0, 0, 0.35);
    border-radius: 8px;
    padding: 12px;
  }

  h3 {
    @include pixelated;
    font-size: 9px;
    color: var(--green-bright, #4ade80);
    margin: 0 0 10px 0;
    display: flex;
    align-items: center;
    gap: 6px;
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
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.06);
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 8px;

    &.is-legacy {
      background: Rgba(239, 68, 68, 0.04);
      border-color: Rgba(239, 68, 68, 0.2);
    }

    &:last-child {
      margin-bottom: 0;
    }

    .award-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .award-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .legacy-badge {
      @include pixelated;
      font-size: 7px;
      padding: 2px 6px;
      border-radius: 4px;
      background: Rgba(239, 68, 68, 0.15);
      border: 1px solid Rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      letter-spacing: 0.5px;
    }

    .award-name {
      font-weight: bold;
      font-size: 11px;
      color: var(--white, #ffffff);
    }

    .award-pills-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
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
  font-size: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
  white-space: nowrap;

  .btn-emoji {
    font-size: 11px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
  }

  &.claim-action-btn {
    background: #16a34a;
    border-color: #4ade80;
    color: var(--white);
    font-weight: bold;
    box-shadow: 0 2px 0 #15803d, 0 0 10px Rgba(74, 222, 128, 0.25);
    text-shadow: 0 1px 2px Rgba(0, 0, 0, 0.5);

    &:hover:not(:disabled) {
      background: #22c55e;
      border-color: #86efac;
      box-shadow: 0 3px 0 #15803d, 0 0 14px Rgba(74, 222, 128, 0.4);
      transform: Translatey(-1px);
    }

    &:active:not(:disabled) {
      transform: Translatey(1px);
      box-shadow: 0 0 0 transparent;
    }
  }

  &.discard-action-btn {
    background: Rgba(239, 68, 68, 0.15);
    border-color: Rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    font-weight: bold;
    box-shadow: 0 2px 0 Rgba(0, 0, 0, 0.4);
    text-shadow: 0 1px 2px Rgba(0, 0, 0, 0.5);

    &:hover:not(:disabled) {
      background: #ef4444;
      border-color: #fca5a5;
      color: var(--white);
      box-shadow: 0 3px 0 #b91c1c, 0 0 12px Rgba(239, 68, 68, 0.4);
      transform: Translatey(-1px);
    }

    &.only-action {
      background: #dc2626;
      border-color: #f87171;
      color: var(--white);
      box-shadow: 0 2px 0 #991b1b, 0 0 10px Rgba(220, 38, 38, 0.3);

      &:hover:not(:disabled) {
        background: #ef4444;
        border-color: #fca5a5;
        box-shadow: 0 3px 0 #991b1b, 0 0 14px Rgba(239, 68, 68, 0.5);
      }
    }

    &:active:not(:disabled) {
      transform: Translatey(1px);
    }
  }
}
</style>
