<script setup lang="ts">
import ArenaRankedOverview from "@/components/modals/ArenaRankedOverview.vue";
import HomeWidgetMinimizeBtn from "./HomeWidgetMinimizeBtn.vue";
</script>

<template>
  <div
    id="widget-ranked"
    class="home-ranked-widget home-section-card"
  >
    <!-- Card Header -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji card-icon">🏆</span>
        <div class="title-text-group">
          <h3 class="card-title">
            ARENA CLASIFICATORIA
          </h3>
          <span class="card-subtitle">Temporada competitiva activa y emparejamiento ELO</span>
        </div>
      </div>

      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="ranked" />
      </div>
    </div>

    <!-- Modularized Ranked Overview (100% Shared with Coliseum Modal) -->
    <ArenaRankedOverview />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/core/mixins" as *;

.home-ranked-widget {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 12px 14px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 12px;
  background: rgb(18 22 34 / 85%);
  box-shadow: 0 4px 16px rgb(0 0 0 / 40%);
  box-sizing: border-box;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgb(255 255 255 / 6%);

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;

    .card-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .title-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .card-title {
      @include pixelated;

      margin: 0;
      color: var(--yellow, #facc15);
      font-size: 11px;
      letter-spacing: 1px;
    }

    .card-subtitle {
      margin: 0;
      color: var(--gray, #94a3b8);
      font-size: 9px;
      line-height: 1.35;
    }
  }

  .header-actions {
    @include widget-header-actions;

    flex-shrink: 0;
    margin-left: auto;
  }
}
</style>
