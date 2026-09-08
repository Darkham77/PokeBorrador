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
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
  gap: 8px;

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;

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
      font-size: 11px;
      color: var(--yellow, #facc15);
      margin: 0;
      letter-spacing: 1px;
    }

    .card-subtitle {
      font-size: 9px;
      color: var(--gray, #94a3b8);
      margin: 0;
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
