<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useEvolutionStore } from '@/stores/evolution';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { gsap } from 'gsap';


defineEmits<{
  (e: 'close'): void;
}>();

const evolutionStore = useEvolutionStore();
const step = ref('intro'); // intro | flashing | transformed | final | cancelled
const oldName = ref('');
const newName = ref('');
const fromSprite = ref('');
const toSprite = ref('');

const FLASH_COUNT = 16; // Más destellos rápidos
const particlesRef = ref<HTMLElement[]>([]);
const flashesDone = ref(0);
const currentShowingSprite = ref<'from' | 'to'>('from');
let timeline: gsap.core.Timeline | null = null;
const activeTweens: gsap.core.Tween[] = [];

// DOM Refs para las auras combinadas de destellos (flare 1 y 2)
const flare1Ref = ref<HTMLElement | null>(null);
const flare2Ref = ref<HTMLElement | null>(null);

const flare1Url = getAssetUrl(ASSET_TYPES.FX, 'flare_1');
const flare2Url = getAssetUrl(ASSET_TYPES.FX, 'flare_2');

const isCancelable = computed(() => {
  return !evolutionStore.itemName;
});

const auraStyles = computed(() => {
  return {
    '--flare-1-url': `url(${flare1Url})`,
    '--flare-2-url': `url(${flare2Url})`,
    '--aura-color-1': 'rgba(96, 165, 250, 0.75)', // Azul
    '--aura-color-2': 'rgba(251, 191, 36, 0.75)'  // Oro
  };
});

const cleanupTweens = () => {
  activeTweens.forEach(t => t.kill());
  activeTweens.length = 0;
};

const initEvolution = () => {
  if (!evolutionStore.sourcePokemon || !evolutionStore.targetId) return;

  const toData = pokemonDataProvider.getPokemonData(evolutionStore.targetId);
  oldName.value = evolutionStore.sourcePokemon.name;
  newName.value = toData?.name || evolutionStore.targetId;
  
  fromSprite.value = getAssetUrl(ASSET_TYPES.POKEMON, evolutionStore.sourcePokemon.id, { isShiny: evolutionStore.sourcePokemon.isShiny });
  toSprite.value = getAssetUrl(ASSET_TYPES.POKEMON, evolutionStore.targetId, { isShiny: evolutionStore.sourcePokemon.isShiny });

  step.value = 'intro';
  flashesDone.value = 0;
  currentShowingSprite.value = 'from';
  if (timeline) {
    timeline.kill();
    timeline = null;
  }
  cleanupTweens();

  nextTick(() => {
    startSequence();
  });
};

onMounted(() => {
  initEvolution();
});

import { watch, onUnmounted } from 'vue';
watch(() => evolutionStore.isEvolving, (newVal) => {
  if (newVal) {
    initEvolution();
  } else {
    if (timeline) {
      timeline.kill();
      timeline = null;
    }
    cleanupTweens();
  }
});

onUnmounted(() => {
  cleanupTweens();
  if (timeline) {
    timeline.kill();
  }
});

const startSequence = () => {
  timeline = gsap.timeline({
    onComplete: () => {
      step.value = 'final';
      nextTick(() => {
        gsap.fromTo('.result-text', 
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
      });
    }
  });

  // 1. Intro Wait
  timeline.to({}, { duration: 1.5 });

  // 2. Flashing & Swapping Phase (Intercambio visual de sprites rápido en flashes)
  timeline.add(() => { step.value = 'flashing'; });
  
  for (let i = 0; i < FLASH_COUNT; i++) {
    timeline.add(() => { 
      flashesDone.value = i + 1; 
      // Intercambia el sprite mostrado: de forma alternada a medida que avanza el parpadeo
      if (i > 4) {
        currentShowingSprite.value = currentShowingSprite.value === 'from' ? 'to' : 'from';
      }
    }, `+=${Math.max(0.08, 0.25 - (i * 0.015))}`);
  }

  // 3. Transformation & Sound
  timeline.add(() => {
    evolutionStore.evolve();
    step.value = 'transformed';
    currentShowingSprite.value = 'to';
    
    // Disparar sonido de éxito de evolución
    const win = window as unknown as { playSound?: (s: string) => void };
    win.playSound?.('evolution_complete');
  }, '+=0.15');

  // 4. Glow Burst, Scale & Aura Activation
  timeline.fromTo('.glow-bg', 
    { scale: 1, opacity: 0.2 },
    { scale: 2, opacity: 0.8, duration: 0.5, ease: 'back.out(2)' },
    'transformed'
  );

  timeline.add(() => {
    nextTick(() => {
      if (flare1Ref.value && flare2Ref.value) {
        // Rotaciones continuas en contra-fase
        const rot1 = gsap.to(flare1Ref.value, { rotation: 360, duration: 15, repeat: -1, ease: 'none' });
        const rot2 = gsap.to(flare2Ref.value, { rotation: -360, duration: 15, repeat: -1, ease: 'none' });
        activeTweens.push(rot1, rot2);

        // Efecto respiración de escalas
        const scale1 = gsap.fromTo(flare1Ref.value,
          { scale: 0.8, opacity: 0.3 },
          { scale: 2.2, opacity: 0.95, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
        );
        const scale2 = gsap.fromTo(flare2Ref.value,
          { scale: 2.2, opacity: 0.95 },
          { scale: 0.8, opacity: 0.3, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
        );
        activeTweens.push(scale1, scale2);
      }
    });
  }, 'transformed');

  // 5. Particles burst
  timeline.add(() => {
    particlesRef.value.forEach((el) => {
      if (!el) return;
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 120;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      gsap.fromTo(el,
        { x: 0, y: 0, opacity: 1, scale: 1 },
        {
          x: tx,
          y: ty,
          opacity: 0,
          scale: 0,
          duration: 'random(1.2, 1.8)',
          ease: 'power2.out'
        }
      );
    });
  }, 'transformed');

  // 6. Final Message Wait
  timeline.to({}, { duration: 1.0 });
};

const cancelEvolution = () => {
  if (timeline) {
    timeline.kill();
  }
  step.value = 'cancelled';
  currentShowingSprite.value = 'from';
};

const close = () => {
  evolutionStore.finishEvolution();
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="evolutionStore.isEvolving"
      class="evolution-overlay"
    >
      <div 
        class="evolution-container"
        :style="auraStyles"
      >
        <!-- Auras de destellos de fondo combinados detrás del Pokémon (flare 1 y 2) -->
        <div
          v-if="step === 'transformed' || step === 'final'"
          class="auras-field"
        >
          <div
            ref="flare2Ref"
            class="aura-layer rare-aura"
          />
          <div
            ref="flare1Ref"
            class="aura-layer atmospheric-aura"
          />
        </div>

        <!-- Campo Dinámico de Partículas de Luz -->
        <div class="particles-field">
          <div
            v-for="n in 25"
            :key="n"
            ref="particlesRef"
            class="particle"
          />
        </div>

        <!-- Sprites -->
        <div class="sprite-stage">
          <div
            class="glow-bg"
            :class="step"
          />
          
          <img 
            v-if="currentShowingSprite === 'from' || step === 'cancelled'"
            :src="fromSprite"
            class="pokemon-sprite from" 
            :class="{ flashing: step === 'flashing', 'flash-on': flashesDone % 2 !== 0 }" 
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >

          <img 
            v-if="currentShowingSprite === 'to' && step !== 'cancelled'"
            :src="toSprite"
            class="pokemon-sprite to" 
            :class="{ 'scale-in': step === 'transformed', flashing: step === 'flashing', 'flash-on': flashesDone % 2 !== 0 }"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>

        <!-- Text Info -->
        <div class="evolution-info">
          <p
            v-if="step === 'intro' || step === 'flashing'"
            class="status-text"
          >
            ¡{{ oldName }} está evolucionando!
          </p>

          <div
            v-if="step === 'cancelled'"
            class="result-text"
          >
            <p class="status-text">
              ¿Eh? ¡{{ oldName }} ha dejado de evolucionar!
            </p>
            <button
              class="btn-confirm"
              @click.stop="close"
            >
              CONTINUAR
            </button>
          </div>
          
          <div
            v-if="step === 'final'"
            class="result-text"
          >
            <p>¡{{ oldName }} evolucionó a <span class="highlight">{{ newName }}</span>!</p>
            <button
              class="btn-confirm"
              @click.stop="close"
            >
              CONTINUAR
            </button>
          </div>

          <!-- Botón de cancelar evolución premium respetando el estándar -->
          <div
            v-if="(step === 'intro' || step === 'flashing') && isCancelable"
            class="cancel-container"
          >
            <button
              class="btn-vicio-secondary"
              @click.stop="cancelEvolution"
            >
              ❌ CANCELAR EVOLUCIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "sass:math";
@use "sass:string";

.evolution-overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal) + 2000);
  background: Radial-Gradient(circle at center, Rgba(26, 26, 46, 1) 0%, $dark 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  @include pixelated;
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  transform: Translatez(0);
}

.evolution-container {
  width: 100%;
  max-width: 400px;
  text-align: center;
  position: relative;
}

.sprite-stage {
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glow-bg {
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: var(--blue, Rgba(59, 130, 246, 1));
  will-change: transform, filter, opacity;
  filter: Blur(40px);
  opacity: 0.2;
}

.pokemon-sprite {
  width: 160px;
  height: 160px;
  @include pixelated;
  position: relative;
  z-index: var(--z-base);
  
  &.from {
    will-change: transform, filter, opacity;
    filter: Brightness(1);
    
    &.flash-on {
      filter: Brightness(10) contrast(10) Grayscale(100%);
    }
  }
}

.evolution-info {
  margin-top: 40px;
  padding: 0 20px;
  height: 80px;
}

.status-text {
  color: var(--white);
  font-size: 12px;
  line-height: 1.6;
  text-shadow: 0 2px 4px Rgba(0,0,0,0.5);
}

.result-text {
  p {
    color: var(--white);
    font-size: 13px;
    margin-bottom: 24px;
    line-height: 1.8;
  }
  .highlight {
    color: var(--yellow, Rgba(251, 191, 36, 1));
    font-weight: bold;
  }
}

.btn-confirm {
  background: var(--blue, Rgba(59, 130, 246, 1));
  color: var(--white);
  border: none;
  padding: 12px 24px;
  font-family: inherit;
  font-size: 10px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 Rgba(37, 99, 235, 1);
  
  
  &:active {
    transform: Translatey(2px);
    box-shadow: 0 2px 0 Rgba(37, 99, 235, 1);
  }
}

.particles-field {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: Translate(-50%, -50%);
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 5px;
  height: 5px;
  background: var(--yellow);
  border-radius: 50%;
  opacity: 0;
  @include gpu-layer;
}

.auras-field {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: Translate(-50%, -50%);
  width: 320px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: var(--z-base);
}

.aura-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: 50%;
  will-change: transform, opacity;
  image-rendering: auto !important;

  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  filter: Blur(1.5px);

  &.rare-aura {
    z-index: calc(var(--z-base) + 1);
    -webkit-mask-image: var(--flare-2-url);
    mask-image: var(--flare-2-url);
    background-color: var(--aura-color-2);
  }

  &.atmospheric-aura {
    z-index: var(--z-base);
    -webkit-mask-image: var(--flare-1-url);
    mask-image: var(--flare-1-url);
    background-color: var(--aura-color-1);
  }
}

.cancel-container {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.btn-vicio-secondary {
  background: Rgba(239, 68, 68, 0.15);
  border: 1px solid Rgba(239, 68, 68, 0.4);
  color: #f87171;
  font-family: inherit;
  font-size: 9px;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 Rgba(220, 38, 38, 0.3);
  @include pixelated;

  &:hover {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
    transform: Scale(1.05);
  }

  &:active {
    transform: Translatey(2px);
    box-shadow: 0 2px 0 Rgba(220, 38, 38, 0.3);
  }
}
</style>
