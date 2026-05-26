<script setup lang="ts">
import { computed } from 'vue';
import { NATURE_DATA } from '../../src/data/natures';
import gsap from 'gsap';

interface Props {
  natureName: string;
  pokemonName: string;
  visible: boolean;
}

const props = defineProps<Props>();

const natureDesc = computed(() => {
  if (!props.natureName) return '';
  const data = (NATURE_DATA as Record<string, { desc: string }>)[props.natureName];
  return data ? data.desc : 'Naturaleza neutra o desconocida.';
});

const natureUp = computed(() => {
  if (!props.natureName) return null;
  return (NATURE_DATA as Record<string, { up: string | null }>)[props.natureName]?.up || null;
});

const natureDown = computed(() => {
  if (!props.natureName) return null;
  return (NATURE_DATA as Record<string, { down: string | null }>)[props.natureName]?.down || null;
});

const onBeforeEnter = (el: Element) => {
  gsap.set(el, {
    opacity: 0,
    y: 10,
    scale: 0.95
  });
};

const onEnter = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.25,
    ease: 'power2.out',
    onComplete: done
  });
};

const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    y: 8,
    scale: 0.95,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: done
  });
};
</script>

<template>
  <div class="nature-tooltip-container">
    <Transition
      :css="false"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="visible && natureName"
        class="nature-tooltip-card"
      >
        <div class="tooltip-header">
          <span class="nature-title">NATURALEZA: {{ natureName.toUpperCase() }}</span>
          <span class="poke-ref">{{ pokemonName }}</span>
        </div>
        <div class="tooltip-desc-section">
          <!-- Modificadores visuales elegantes -->
          <div
            v-if="natureUp || natureDown"
            class="modifiers-row"
          >
            <span
              v-if="natureUp"
              class="stat-mod mod-up"
            >▲ {{ natureUp.toUpperCase() }} (+10%)</span>
            <span
              v-if="natureDown"
              class="stat-mod mod-down"
            >▼ {{ natureDown.toUpperCase() }} (-10%)</span>
          </div>
          <p
            class="desc-text"
            :class="{ 'neutra': !natureUp && !natureDown }"
          >
            {{ natureDesc }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.nature-tooltip-container {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: Translatex(-50%);
  z-index: 150;
  width: 250px;
  pointer-events: none;
}

.nature-tooltip-card {
  background: linear-gradient(135deg, Rgba(12, 14, 25, 0.96) 0%, Rgba(24, 28, 50, 0.98) 100%);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 
    0 -10px 25px Rgba(0, 0, 0, 0.7),
    0 0 10px Rgba(251, 191, 36, 0.2);
  padding: 12px;
  backdrop-filter: Blur(8px);
  pointer-events: auto;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed Rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
  margin-bottom: 8px;
}

.nature-title {
  font-family: var(--font-pixel);
  font-size: 8px;
  font-weight: bold;
  color: #fbbf24;
  text-shadow: 1px 1px 0px #000;
}

.poke-ref {
  font-family: var(--font-pixel);
  font-size: 7px;
  color: #86868b;
}

.tooltip-desc-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .modifiers-row {
    display: flex;
    gap: 8px;
  }

  .stat-mod {
    font-family: var(--font-pixel);
    font-size: 6px;
    font-weight: bold;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid Rgba(0, 0, 0, 0.2);

    &.mod-up {
      color: #32d74b;
      background: Rgba(50, 215, 75, 0.1);
      border-color: Rgba(50, 215, 75, 0.2);
    }

    &.mod-down {
      color: #ff453a;
      background: Rgba(255, 69, 58, 0.1);
      border-color: Rgba(255, 69, 58, 0.2);
    }
  }

  .desc-text {
    font-family: var(--font-pixel);
    font-size: 7px;
    line-height: 1.4;
    color: #e5e5ea;
    margin: 0;
    text-shadow: 1px 1px 0px Rgba(0,0,0,0.5);

    &.neutra {
      color: #86868b;
      font-style: italic;
    }
  }
}
</style>
