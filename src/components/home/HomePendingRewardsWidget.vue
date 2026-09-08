<script setup lang="ts">
import { useUnifiedRewards } from '@/composables/rewards/useUnifiedRewards'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'
import type { UnifiedRewardItem } from '@/types/rewards/rewards'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'

const {
  unifiedRewards,
  totalClaimableRewards,
  isClaiming,
  claimReward,
  claimAllRewards,
  confirmDiscardReward
} = useUnifiedRewards()

const getSourceLabel = (item: UnifiedRewardItem): { icon: string; text: string } => {
  switch (item.source) {
    case 'event':
      return { icon: '🏆', text: 'TORNEO' }
    case 'ranked_milestone':
      return { icon: '⚔️', text: 'ARENA' }
    case 'class_mission':
      return { icon: '⚡', text: 'MISIÓN' }
    case 'gts_claim':
      return { icon: '🏪', text: 'MERCADO' }
    default:
      return { icon: '🎁', text: 'PREMIO' }
  }
}
</script>

<template>
  <div
    v-if="unifiedRewards.length > 0"
    id="widget-pending-rewards"
    class="home-pending-rewards-widget event-pending-awards-banner awards-box"
  >
    <div class="box-inner">
      <div class="awards-header-row">
        <h3 class="pixelated">
          <span class="emoji">🎁</span> RECOMPENSAS PENDIENTES ({{ unifiedRewards.length }})
        </h3>

        <div class="header-actions">
          <button
            v-if="totalClaimableRewards > 1"
            id="btn-claim-all-rewards"
            v-gsap-hover
            class="retro-btn claim-all-btn text-outline"
            :disabled="isClaiming"
            @click.stop="claimAllRewards"
          >
            <span class="emoji">{{ isClaiming ? '⏳' : '✨' }}</span>
            {{ isClaiming ? 'RECLAMANDO...' : `RECLAMAR TODO (${totalClaimableRewards})` }}
          </button>
          <HomeWidgetMinimizeBtn widget-id="pending_rewards" />
        </div>
      </div>

      <div class="awards-list custom-scrollbar">
        <div
          v-for="item in unifiedRewards"
          :id="'pending-reward-item-' + item.id"
          :key="item.id"
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
              @click.stop="claimReward(item)"
            >
              <span class="emoji">🎁</span> RECLAMAR
            </button>
            <button
              v-if="item.source === 'event'"
              :id="'discard-pending-reward-btn-' + item.id"
              v-gsap-hover
              class="retro-btn discard-action-btn text-outline"
              :disabled="isClaiming"
              @click.stop="confirmDiscardReward(item)"
            >
              <span class="emoji">🗑️</span> DESCARTAR
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
  margin-bottom: 14px;
  box-sizing: border-box;
  box-shadow: 0 0 16px Rgba(34, 197, 94, 0.08);

  .box-inner {
    background: Rgba(0, 0, 0, 0.35);
    border-radius: 8px;
    padding: 12px 14px;
  }

  .awards-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    gap: 8px;
  }

  .header-actions {
    @include widget-header-actions;
  }

  h3 {
    @include pixelated;
    font-size: 10px;
    color: var(--green-bright, #4ade80);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.5px;
  }

  .claim-all-btn {
    background: linear-gradient(180deg, #22c55e 0%, #15803d 100%);
    border: 1px solid #4ade80;
    border-radius: 6px;
    color: #ffffff;
    font-size: 8px;
    padding: 5px 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px Rgba(34, 197, 94, 0.3);
    @include pixelated;
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

    &.is-legacy {
      background: Rgba(239, 68, 68, 0.04);
      border-color: Rgba(239, 68, 68, 0.15);
    }
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
    flex-wrap: wrap;
    gap: 8px;
  }

  .source-badge {
    @include pixelated;
    font-size: 7.5px;
    background: Rgba(250, 204, 21, 0.15);
    border: 1px solid Rgba(250, 204, 21, 0.35);
    color: #facc15;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    letter-spacing: 0.5px;
  }

  .award-name {
    @include pixelated;
    font-size: 10px;
    color: var(--white, #ffffff);
  }

  .award-sub-meta {
    font-size: 8px;
    color: var(--gray, #94a3b8);
    line-height: 1.25;
  }

  .category-badge {
    @include pixelated;
    font-size: 7px;
    background: Rgba(59, 130, 246, 0.15);
    border: 1px solid Rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .legacy-badge {
    @include pixelated;
    font-size: 7px;
    background: Rgba(239, 68, 68, 0.2);
    border: 1px solid Rgba(239, 68, 68, 0.4);
    color: #f87171;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .award-pills-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .award-actions-wrap {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .retro-btn {
    @include pixelated;
    font-size: 8px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-sizing: border-box;

    &.claim-action-btn {
      background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
      border: 1px solid #4ade80;
      color: #ffffff;
      box-shadow: 0 2px 6px Rgba(34, 197, 94, 0.25);
    }

    &.discard-action-btn {
      background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
      border: 1px solid #f87171;
      color: #ffffff;
      box-shadow: 0 2px 6px Rgba(239, 68, 68, 0.25);
    }
  }
}

@media (max-width: 640px) {
  .awards-box {
    .award-item {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .award-actions-wrap {
      justify-content: flex-end;
    }
  }
}
</style>
