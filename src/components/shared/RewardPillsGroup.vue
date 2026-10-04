<script setup lang="ts">
/**
 * src/components/shared/RewardPillsGroup.vue
 * 
 * Reusable Retro-Modern reward pills list with item sprites,
 * interactive descriptions, and GSAP micro-animations.
 */

import { computed } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { UnifiedRewardPill } from '@/types/rewards/rewards'
import {
  normalizeAllRewards,
  type RawPrizeData,
  type NormalizedReward
} from './rewardPillsNormalizers'

interface Props {
  pills?: readonly UnifiedRewardPill[] | null
  prize?: RawPrizeData | Record<string, unknown> | null
  rewards?: Record<string, number> | null
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  pills: null,
  prize: null,
  rewards: null,
  size: 'sm'
})

const normalizedList = computed<NormalizedReward[]>(() => {
  return normalizeAllRewards(props.pills, props.rewards, props.prize)
})

// GSAP Micro-interactions
function handlePillEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: -2,
    scale: 1.03,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(250, 204, 21, 0.4)',
    boxShadow: '0 4px 12px rgba(250, 204, 21, 0.15)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

function handlePillLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: 0,
    scale: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: 'none',
    duration: 0.2,
    ease: 'power2.out'
  })
}
</script>

<template>
  <div 
    v-if="normalizedList.length" 
    class="reward-pills-group"
    :class="[`size-${size}`]"
  >
    <PVTooltip
      v-for="item in normalizedList"
      :key="item.id"
      :title="item.title"
      :description="item.description"
      position="top"
    >
      <div
        class="reward-pill"
        :class="[item.colorClass]"
        @mouseenter="handlePillEnter"
        @mouseleave="handlePillLeave"
      >
        <!-- Item or Pokemon Sprite -->
        <img
          v-if="item.spriteUrl"
          :src="item.spriteUrl"
          class="reward-sprite pixel-art"
          :alt="item.label"
          @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
        >

        <!-- Money or Custom Icon -->
        <span 
          v-else-if="item.icon" 
          class="emoji reward-icon"
        >
          {{ item.icon }}
        </span>

        <!-- Label -->
        <span class="reward-label">{{ item.label }}</span>

        <!-- Quantity / Badge -->
        <span 
          v-if="item.qtyText" 
          class="reward-qty"
        >
          {{ item.qtyText }}
        </span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/mixins" as *;

.reward-pills-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.reward-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 6px;
  background: Rgb(255 255 255 / 3%);
  color: Rgb(241 245 249 / 90%);
  font-size: 9px;
  font-weight: 600;
  cursor: help;
  user-select: none;
  box-sizing: border-box;

  .reward-sprite {
    @include pixelated;

    width: 18px;
    height: 18px;
    object-fit: contain;
    filter: Drop-Shadow(0 1px 2px Rgb(0 0 0 / 40%));
  }

  .reward-icon {
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  .reward-label {
    white-space: nowrap;
  }

  .reward-qty {
    @include pixelated;

    padding: 1px 4px;
    border: 1px solid Rgb(250 204 21 / 25%);
    border-radius: 3px;
    background: Rgb(250 204 21 / 12%);
    color: var(--yellow);
    font-size: 7px;
    margin-left: 2px;
  }

  // Color Variants
  &.money {
    background: Rgb(74 222 128 / 4%);
    color: #4ade80;
    border-color: Rgb(74 222 128 / 20%);

    .reward-icon {
      color: #4ade80;
      font-size: 10px;
    }
  }

  &.bc {
    background: Rgb(56 189 248 / 4%);
    color: #38bdf8;
    border-color: Rgb(56 189 248 / 20%);

    .reward-icon {
      font-size: 10px;
    }
  }

  &.pokemon {
    background: Rgb(244 114 182 / 4%);
    color: #f472b6;
    border-color: Rgb(244 114 182 / 20%);
  }

  &.item {
    border-color: Rgb(255 255 255 / 10%);
  }
}

// Sizes
.reward-pills-group.size-md {
  gap: 8px;

  .reward-pill {
    padding: 4px 10px;
    font-size: 10px;

    .reward-sprite {
      width: 22px;
      height: 22px;
    }

    .reward-qty {
      font-size: 8px;
    }
  }
}
</style>
