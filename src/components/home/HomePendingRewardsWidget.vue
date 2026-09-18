<script setup lang="ts">
import { useUnifiedRewards } from '@/composables/rewards/useUnifiedRewards'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'
import HomePendingRewardItem from './HomePendingRewardItem.vue'

const {
  unifiedRewards,
  totalClaimableRewards,
  isClaiming,
  claimReward,
  claimAllRewards,
  confirmDiscardReward
} = useUnifiedRewards()
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
        <HomePendingRewardItem
          v-for="item in unifiedRewards"
          :key="item.id"
          :item="item"
          :is-claiming="isClaiming"
          @claim="claimReward"
          @discard="confirmDiscardReward"
        />
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
}
</style>
