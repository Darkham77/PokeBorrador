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
  border-radius: $radius-xl;
  background: Rgb(34 197 94 / 6%);
  margin-bottom: 14px;
  box-sizing: border-box;
  box-shadow: var(--shadow-glow-amber-lg);

  .box-inner {
    padding: 12px 14px;
    border-radius: $radius-lg;
    background: Rgb(0 0 0 / 35%);
  }

  .awards-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: 10px;
  }

  .header-actions {
    @include widget-header-actions;
  }

  h3 {
    @include pixelated;

    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;
    margin: 0;
    color: var(--green-bright, var(--green-light));
    font-size: var(--font-10);
    letter-spacing: 0.5px;
  }

  .claim-all-btn {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: $spacing-sm-alt;
    padding: 5px 12px;
    border: 1px solid var(--green-light);
    border-radius: $radius-md;
    background: Linear-Gradient(180deg, var(--emerald) 0%, var(--emerald-500) 100%);
    color: var(--white);
    font-size: var(--font-8);
    cursor: pointer;
    box-shadow: var(--shadow-subtle);
  }

  .awards-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }
}
</style>
