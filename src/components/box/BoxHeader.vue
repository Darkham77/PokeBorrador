<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { gsap } from 'gsap';

defineProps<{
  count: number;
  max: number;
  hint?: string;
}>();

const pulseDot = useTemplateRef<HTMLElement>('pulseDot');

onMounted(() => {
  if (pulseDot.value) {
    gsap.to(pulseDot.value, {
      opacity: 0.4,
      scale: 1.2,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });
  }
});
</script>

<template>
  <header class="box-header-premium glass-morphism">
    <div class="header-layout">
      <!-- Izquierda: Títulos apilados -->
      <div class="header-left">
        <h1 class="header-main-title"><span class="emoji">💊</span> CENTRO POKÉMON</h1>
        <h2 class="header-sub-title">SISTEMA DE ALMACENAMIENTO — RED LAN</h2>
      </div>

      <!-- Derecha: Info Integrada y Acciones -->
      <div class="header-right">
        <div class="integrated-badge">
          <div class="status-group">
            <span ref="pulseDot" class="pulse-dot" />
            <span class="badge-label">ESTADO RED:</span>
            <span class="badge-value">{{ count }} / {{ max }}</span>
          </div>

          <div v-if="hint" class="badge-divider" />

          <div v-if="hint" class="hint-group">
            <span class="emoji">💡</span>
            <span class="hint-text">{{ hint }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;
@use '@/styles/components/premium-header-shared' as *;

.box-header-premium {
  @include premium-header;
}

.integrated-badge {
  .status-group {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    white-space: nowrap;

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: var(--shadow-glow-yellow-sm);
    }

    .badge-label {
      @include pixelated;
      color: var(--gray);
      font-size: var(--font-6);
    }
    .badge-value {
      @include pixelated;
      color: var(--white);
      font-size: var(--font-7);
    }
  }

  .hint-group {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .hint-icon {
      font-size: var(--font-10);
      will-change: transform, filter, opacity;
      filter: Drop-Shadow(0 0 4px var(--yellow));
    }
    .hint-text {
      @include pixelated;
      max-width: 250px;
      color: var(--gray);
      font-size: var(--font-6);
    }
  }
}
</style>
