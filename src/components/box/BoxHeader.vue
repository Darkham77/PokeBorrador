<script setup lang="ts">
defineProps<{
  count: number
  max: number
  hint?: string
}>()
</script>

<template>
  <header class="box-header-premium glass-morphism">
    <div class="header-layout">
      <!-- Izquierda: Títulos apilados -->
      <div class="header-left">
        <h1 class="header-main-title">
          CENTRO POKÉMON
        </h1>
        <h2 class="header-sub-title">
          SISTEMA DE ALMACENAMIENTO — RED LAN
        </h2>
      </div>

      <!-- Derecha: Info Integrada y Acciones -->
      <div class="header-right">
        <div class="integrated-badge">
          <div class="status-group">
            <span class="pulse-dot" />
            <span class="badge-label">ESTADO RED:</span>
            <span class="badge-value">{{ count }} / {{ max }}</span>
          </div>
          
          <div
            v-if="hint"
            class="badge-divider"
          />
          
          <div
            v-if="hint"
            class="hint-group"
          >
            <span class="hint-icon">💡</span>
            <span class="hint-text">{{ hint }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-header-premium {
  padding: 12px 24px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  margin-bottom: 0;
  @include gpu-layer;

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
  padding: 6px 12px;
  gap: 12px;

  .status-group {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;

    .pulse-dot {
      width: 6px;
      height: 6px;
      background: var(--green);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--green);
      animation: pulse 2s infinite;
    }

    .badge-label { @include pixelated; font-size: 6px; color: var(--gray); }
    .badge-value { @include pixelated; font-size: 7px; color: var(--white); }
  }

  .badge-divider {
    width: 1px;
    height: 14px;
    background: Rgba(255, 255, 255, 0.1);
  }

  .hint-group {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .hint-icon { font-size: 10px; will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 4px var(--yellow)); }
    .hint-text { @include pixelated; font-size: 6px; color: var(--gray); max-width: 250px; }
  }
}

.rocket-action-btn {
  @include btn-vicio('danger', 'sm');
}

.rocket-confirm-group {
  display: flex;
  gap: 8px;

  .confirm-btn {
    @include btn-vicio('danger', 'sm');
  }

  .cancel-btn {
    @include btn-vicio('danger', 'sm');
  }
}

@keyframes pulse {
  0% { opacity: 0.6; transform: Scale(1); }
  50% { opacity: 1; transform: Scale(1.2); }
  100% { opacity: 0.6; transform: Scale(1); }
}
</style>
