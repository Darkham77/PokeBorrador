<script setup lang="ts">
import ArenaRankedOverview from "@/components/modals/ArenaRankedOverview.vue";
import ArenaMilestoneTrack from "@/components/modals/ArenaMilestoneTrack.vue";
import ArenaLeaderboardSection from "@/components/modals/ArenaLeaderboardSection.vue";
</script>

<template>
  <div class="arena-ranked-panel">
    <!-- 1 & 2. Overview: Seasonal Tournament Card & Rank Summary with Matchmaking -->
    <ArenaRankedOverview />

    <!-- 3. Seasonal Milestones Track -->
    <ArenaMilestoneTrack />

    <!-- 4. Salón de la Fama Leaderboard -->
    <ArenaLeaderboardSection />
  </div>
</template>

<style scoped lang="scss">
.arena-ranked-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
</style>
