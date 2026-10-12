<script setup lang="ts">
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue';
import type { UnifiedRewardItem } from '@/types/rewards/rewards';

defineProps<{
  item: UnifiedRewardItem;
  isClaiming: boolean;
}>();

const emit = defineEmits<{
  (e: 'claim', item: UnifiedRewardItem): void;
  (e: 'discard', item: UnifiedRewardItem): void;
}>();

const getSourceLabel = (item: UnifiedRewardItem): { icon: string; text: string } => {
  switch (item.source) {
    case 'event':
      return { icon: '🏆', text: 'TORNEO' };
    case 'ranked_milestone':
      return { icon: '⚔️', text: 'ARENA' };
    case 'class_mission':
      return { icon: '⚡', text: 'MISIÓN' };
    case 'gts_claim':
      return { icon: '🏪', text: 'MERCADO' };
    default:
      return { icon: '🎁', text: 'PREMIO' };
  }
};
</script>

<template>
  <div
    :id="'pending-reward-item-' + item.id"
    class="award-item"
    :class="{ 'is-legacy': item.isLegacy }"
  >
    <div class="award-info">
      <div class="award-name-row">
        <span class="source-badge">
          <span class="emoji">{{ getSourceLabel(item).icon }}</span> {{ getSourceLabel(item).text }}
        </span>
        <span class="award-name text-outline">{{ item.title }}</span>
        <span
          v-if="item.categoryBadge"
          class="category-badge"
        >
          <span class="emoji">{{ item.categoryBadge.icon }}</span> {{ item.categoryBadge.name }}
        </span>
        <span
          v-if="item.isLegacy"
          class="legacy-badge"
        >
          <span class="emoji">⚠️</span> ARCHIVADO
        </span>
      </div>

      <div
        v-if="item.subtitle"
        class="award-sub-meta"
      >
        {{ item.subtitle }}
      </div>

      <div class="award-pills-wrap">
        <RewardPillsGroup
          :pills="item.pills"
          :prize="item.prize"
        />
      </div>
    </div>

    <div class="award-actions-wrap">
      <button
        v-if="item.isClaimable"
        :id="'claim-pending-reward-btn-' + item.id"
        v-gsap-hover
        class="retro-btn claim-action-btn text-outline"
        :disabled="isClaiming"
        @click.stop="emit('claim', item)"
      >
        <span class="emoji">🎁</span> RECLAMAR
      </button>
      <button
        v-if="item.source === 'event'"
        :id="'discard-pending-reward-btn-' + item.id"
        v-gsap-hover
        class="retro-btn discard-action-btn text-outline"
        :disabled="isClaiming"
        @click.stop="emit('discard', item)"
      >
        <span class="emoji">🗑️</span> DESCARTAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.award-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  padding: 10px 14px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: $radius-lg;
  background: Rgb(255 255 255 / 3%);

  &.is-legacy {
    background: Rgb(239 68 68 / 4%);
    border-color: Rgb(239 68 68 / 15%);
  }
}

.award-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  min-width: 0;
  flex: 1;
}

.award-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm;
}

.source-badge {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 2px 6px;
  border: 1px solid Rgb(250 204 21 / 35%);
  border-radius: $radius-sm;
  background: Rgb(250 204 21 / 15%);
  color: var(--amber-400);
  font-size: var(--font-8);
  letter-spacing: 0.5px;
}

.award-name {
  @include pixelated;

  color: var(--white, var(--white));
  font-size: var(--font-10);
}

.award-sub-meta {
  color: var(--gray, var(--slate-400));
  font-size: var(--font-8);
  line-height: 1.25;
}

.category-badge {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 2px 6px;
  border: 1px solid Rgb(59 130 246 / 30%);
  border-radius: $radius-sm;
  background: Rgb(59 130 246 / 15%);
  color: var(--blue-400);
  font-size: var(--font-7);
}

.legacy-badge {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 2px 6px;
  border: 1px solid Rgb(239 68 68 / 40%);
  border-radius: $radius-sm;
  background: Rgb(239 68 68 / 20%);
  color: var(--rose);
  font-size: var(--font-7);
}

.award-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm-alt;
}

.award-actions-wrap {
  display: flex;
  gap: $spacing-sm;
  flex-shrink: 0;
}

.retro-btn {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 6px 12px;
  border-radius: $radius-md;
  font-size: var(--font-8);
  cursor: pointer;
  box-sizing: border-box;

  &.claim-action-btn {
    border: 1px solid var(--green-light);
    background: Linear-Gradient(180deg, var(--emerald) 0%, var(--emerald) 100%);
    color: var(--white);
    box-shadow: var(--shadow-card);
  }

  &.discard-action-btn {
    border: 1px solid var(--rose);
    background: Linear-Gradient(180deg, var(--red-light) 0%, var(--red-600) 100%);
    color: var(--white);
    box-shadow: var(--shadow-card);
  }
}

@media (width <= 640px) {
  .award-item {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md-alt;
  }

  .award-actions-wrap {
    justify-content: flex-end;
  }
}
</style>
