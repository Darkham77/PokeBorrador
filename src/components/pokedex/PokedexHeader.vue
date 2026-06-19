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
  @include premium-header;
}

@import "@/styles/components/_premium-header-shared.scss";

.integrated-badge {
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
}
</style>

