<script setup lang="ts">
import { computed } from 'vue';
import { pokemonDataProvider } from '../../src/logic/providers/pokemonDataProvider';
import gsap from 'gsap';

interface Props {
  abilityName: string;
  pokemonName: string;
  visible: boolean;
}

const props = defineProps<Props>();

const abilityDesc = computed(() => {
  if (!props.abilityName) return '';
  const data = pokemonDataProvider.getAbilityData(props.abilityName);
  return data ? data.desc : 'Descripción no encontrada en la base de datos de habilidades.';
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
  <div class="ability-tooltip-container">
    <Transition
      :css="false"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="visible && abilityName"
        class="ability-tooltip-card"
      >
        <div class="tooltip-header">
          <span class="ability-title">HABILIDAD: {{ abilityName.toUpperCase() }}</span>
          <span class="poke-ref">{{ pokemonName }}</span>
        </div>
        <div class="tooltip-desc-section">
          <p class="desc-text">
            {{ abilityDesc }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.ability-tooltip-container {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: Translatex(-50%);
  z-index: 150;
  width: 250px;
  pointer-events: none;
}

.ability-tooltip-card {
  background: linear-gradient(135deg, Rgba(12, 14, 25, 0.96) 0%, Rgba(24, 28, 50, 0.98) 100%);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 
    0 -10px 25px Rgba(0, 0, 0, 0.7),
    0 0 10px Rgba(96, 165, 250, 0.2);
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

.ability-title {
  font-family: var(--font-pixel);
  font-size: 8px;
  font-weight: bold;
  color: #60a5fa;
  text-shadow: 1px 1px 0px #000;
}

.poke-ref {
  font-family: var(--font-pixel);
  font-size: 7px;
  color: #86868b;
}

.tooltip-desc-section {
  .desc-text {
    font-family: var(--font-pixel);
    font-size: 7px;
    line-height: 1.4;
    color: #e5e5ea;
    margin: 0;
    text-shadow: 1px 1px 0px Rgba(0,0,0,0.5);
  }
}
</style>
