<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { gsap } from 'gsap'

defineProps<{
  count: number
  max: number
  hint?: string
}>()

const pulseDot = ref<HTMLElement | null>(null)

onMounted(() => {
  if (pulseDot.value) {
    gsap.to(pulseDot.value, {
      opacity: 0.4,
      scale: 1.2,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    })
  }
})
</script>

<template>
  <header class="box-header-premium glass-morphism">
    <div class="header-layout">
      <!-- Izquierda: Títulos apilados -->
      <div class="header-left">
        <h1 class="header-main-title">
          <span class="title-icon">💊</span> CENTRO POKÉMON
        </h1>
        <h2 class="header-sub-title">
          SISTEMA DE ALMACENAMIENTO — RED LAN
        </h2>
      </div>

      <!-- Derecha: Info Integrada y Acciones -->
      <div class="header-right">
        <div class="integrated-badge">
          <div class="status-group">
            <span 
              ref="pulseDot"
              class="pulse-dot" 
            />
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
@use "@/styles/components/premium-header-shared" as *;

.box-header-premium {
  @include premium-header;
}

.integrated-badge {
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
    }

    .badge-label { @include pixelated; font-size: 6px; color: var(--gray); }
    .badge-value { @include pixelated; font-size: 7px; color: var(--white); }
  }

  .hint-group {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .hint-icon { font-size: 10px; will-change: transform, filter, opacity;
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
</style>
