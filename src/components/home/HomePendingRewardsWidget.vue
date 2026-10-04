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
  padding: 4px;
  border: 1px solid Rgb(34 197 94 / 25%);
  border-radius: 12px;
  background: Rgb(34 197 94 / 6%);
  margin-bottom: 14px;
  box-sizing: border-box;
  box-shadow: 0 0 16px Rgb(34 197 94 / 8%);

  .box-inner {
    padding: 12px 14px;
    border-radius: 8px;
    background: Rgb(0 0 0 / 35%);
  }

  .awards-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .header-actions {
    @include widget-header-actions;
  }

  h3 {
    @include pixelated;

    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: var(--green-bright, #4ade80);
    font-size: 10px;
    letter-spacing: 0.5px;
  }

  .claim-all-btn {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border: 1px solid #4ade80;
    border-radius: 6px;
    background: Linear-Gradient(180deg, #22c55e 0%, #15803d 100%);
    color: #fff;
    font-size: 8px;
    cursor: pointer;
    box-shadow: 0 2px 8px Rgb(34 197 94 / 30%);
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
