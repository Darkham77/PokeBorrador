<script setup lang="ts">
interface Props {
  stats: {
    seen: number
    caught: number
    total: number
  }
}

defineProps<Props>()
</script>

<template>
  <header class="pokedex-header-premium glass-morphism">
    <div class="header-layout">
      <!-- Izquierda: Títulos apilados -->
      <div class="header-left">
        <h1 class="header-main-title">
          POKÉDEX NACIONAL
        </h1>
        <h2 class="header-sub-title">
          REGIÓN DE KANTO & JOHTO
        </h2>
      </div>

      <!-- Derecha: Stats Integrados -->
      <div class="header-right">
        <div class="integrated-badge">
          <div class="stat-group">
            <span class="badge-label">VISTOS:</span>
            <span class="badge-value">{{ stats.seen }}</span>
          </div>
          
          <div class="badge-divider" />
          
          <div class="stat-group highlight">
            <span class="badge-label">CAPTURADOS:</span>
            <span class="badge-value">{{ stats.caught }} <small>/ {{ stats.total }}</small></span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokedex-header-premium {
  padding: 12px 24px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  margin-bottom: 0;
  @include gpu-layer;
  @include shell-premium;

  .header-layout {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;

    @include responsive(hud-mobile) {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .header-main-title {
    @include pixelated;
    font-size: 10px;
    color: var(--white);
    letter-spacing: 2px;
    margin: 0;
  }

  .header-sub-title {
    @include pixelated;
    font-size: 7px;
    color: var(--gray);
    opacity: 0.6;
    margin: 0;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.integrated-badge {
  display: flex;
  align-items: center;
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 6px 16px;
  gap: 16px;

  .stat-group {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;

    &.highlight .badge-value {
      color: var(--yellow);
      text-shadow: 0 0 8px Rgba(255, 215, 0, 0.3);
    }

    .badge-label { @include pixelated; font-size: 6px; color: var(--gray); }
    .badge-value { 
      @include pixelated; 
      font-size: 8px; 
      color: var(--white);
      
      small { font-size: 6px; opacity: 0.6; }
    }
  }

  .badge-divider {
    width: 1px;
    height: 14px;
    background: Rgba(255, 255, 255, 0.1);
  }
}

@include responsive(hud-mobile) {
  .header-left {
    .header-main-title { font-size: 8px; }
    .header-sub-title { font-size: 6px; }
  }
}
</style>

