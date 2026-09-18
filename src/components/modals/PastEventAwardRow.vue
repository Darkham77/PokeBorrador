<script setup lang="ts">
/**
 * src/components/modals/PastEventAwardRow.vue
 * 
 * Modular award banner for past event category awards and unmatched prizes.
 */

import type { PendingAward } from '@/types/system/stores.ts';
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue';

defineProps<{
  award: PendingAward;
  label: string;
  prize: Record<string, unknown>; // open-record: Generic key-value data dictionary container
  isClaimable: boolean;
  categoryName?: string;
}>();

const emit = defineEmits<{
  (e: 'claim', awardId: string): void;
  (e: 'discard', awardId: string, categoryName?: string): void;
  (e: 'hover', event: MouseEvent, entering: boolean): void;
  (e: 'discardHover', event: MouseEvent, entering: boolean): void;
}>();
</script>

<template>
  <div class="category-user-award">
    <div class="user-award-left">
      <span class="user-award-label pixelated">
        <span class="emoji">🎁</span> {{ label }}
      </span>
      <div class="award-pills-wrap">
        <RewardPillsGroup :prize="prize" />
      </div>
    </div>

    <div class="user-award-actions">
      <template v-if="award.received_at === null">
        <button
          v-if="isClaimable"
          :id="`claim-cat-award-btn-${award.id}`"
          class="retro-btn claim-btn mini"
          @mouseenter="emit('hover', $event, true)"
          @mouseleave="emit('hover', $event, false)"
          @click.stop="emit('claim', award.id)"
        >
          <span class="emoji">🎁</span> EN INICIO
        </button>
        <button
          :id="`discard-cat-award-btn-${award.id}`"
          class="retro-btn discard-btn mini"
          :class="{ 'only-action': !isClaimable }"
          @mouseenter="emit('discardHover', $event, true)"
          @mouseleave="emit('discardHover', $event, false)"
          @click.stop="emit('discard', award.id, categoryName)"
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
</template>

<style scoped lang="scss">
@use '@/styles/core/variables' as *;

.category-user-award {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  background: Rgba(255, 255, 255, 0.04);
  border: 1px solid Rgba(255, 215, 0, 0.25);
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 4px;

  .user-award-left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;

    .user-award-label {
      font-size: 8px;
      color: var(--yellow);
      letter-spacing: 0.5px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .award-pills-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  .user-award-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }
}

.claimed-badge.mini {
  font-size: 8px;
  padding: 3px 6px;
  border-radius: 4px;
  background: Rgba(16, 185, 129, 0.15);
  border: 1px solid Rgba(16, 185, 129, 0.4);
  color: #34d399;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
}
</style>
