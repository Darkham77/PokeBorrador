<script setup lang="ts">
import { computed } from 'vue'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import type { PendingAward } from '@/types/system/stores'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

interface Props {
  pendingMyAwards: PendingAward[]
  allMyAwardsCount: number
  isClaimed?: boolean
  isWinner?: boolean
  allEvents: GameEvent[]
  isClaimingAll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isClaimed: false,
  isWinner: false,
  isClaimingAll: false
})

const emit = defineEmits<{
  (e: 'claimAll'): void
  (e: 'claim', awardId: string): void
  (e: 'discard', awardId: string): void
  (e: 'btnHover', event: MouseEvent, isEntering: boolean): void
  (e: 'discardHover', event: MouseEvent, isEntering: boolean): void
}>()

const isClaimAllVisible = computed(() => props.pendingMyAwards.length > 1)
const singlePendingAward = computed(() => props.pendingMyAwards.length === 1 ? props.pendingMyAwards[0] : null)
const isSingleAwardClaimable = computed(() => singlePendingAward.value ? isAwardClaimable(singlePendingAward.value, props.allEvents) : false)
const isClaimedBadgeVisible = computed(() => props.isClaimed || (props.allMyAwardsCount > 0 && props.pendingMyAwards.length === 0))
</script>

<template>
  <div class="award-action-slot">
    <template v-if="isClaimAllVisible">
      <button
        id="claim-all-past-awards-btn"
        class="retro-btn claim-all-btn"
        :disabled="props.isClaimingAll"
        @mouseenter="emit('btnHover', $event, true)"
        @mouseleave="emit('btnHover', $event, false)"
        @click.stop="emit('claimAll')"
      >
        <span class="emoji">🎁</span>
        RECLAMAR TODAS EN INICIO ({{ props.pendingMyAwards.length }})
      </button>
    </template>

    <template v-else-if="singlePendingAward">
      <button
        v-if="isSingleAwardClaimable"
        :id="'claim-past-award-btn-' + singlePendingAward.id"
        class="retro-btn claim-btn"
        @mouseenter="emit('btnHover', $event, true)"
        @mouseleave="emit('btnHover', $event, false)"
        @click.stop="emit('claim', singlePendingAward.id)"
      >
        <span class="emoji">🎁</span>
        RECLAMAR EN INICIO
      </button>
      <button
        :id="'discard-past-award-btn-' + singlePendingAward.id"
        class="retro-btn discard-btn"
        :class="{ 'only-action': !isSingleAwardClaimable }"
        @mouseenter="emit('discardHover', $event, true)"
        @mouseleave="emit('discardHover', $event, false)"
        @click.stop="emit('discard', singlePendingAward.id)"
      >
        <span class="emoji">🗑️</span>
        DESCARTAR
      </button>
    </template>

    <div
      v-else-if="isClaimedBadgeVisible"
      class="claimed-badge"
    >
      <span class="emoji">✓</span> RECLAMADA
    </div>

    <div
      v-else-if="props.isWinner"
      class="winner-badge"
    >
      <span class="emoji">🏆</span> GANADOR
    </div>
  </div>
</template>

<style scoped src="./PastEventCard.styles.scss" lang="scss"></style>
