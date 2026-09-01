<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useEvolutionStore } from '@/stores/evolution';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { gsap } from 'gsap';
import { gameBus } from '@/logic/events/gameBus';

defineOptions({
  inheritAttrs: false
});

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
const EVOLUTION_RESULT_TEXT_Y_OFFSET_PX = 10;
const EVOLUTION_INTRO_DELAY_SEC = 1.5;
const EVOLUTION_AURA_ROTATION_SEC = 15;
const EVOLUTION_PARTICLE_DIST_BASE = 60;
const EVOLUTION_PARTICLE_DIST_RANGE = 120;
const EVOLUTION_PARTICLES_COUNT = 25;
const GSAP_BURST_DURATION_SEC = 0.5;
const GSAP_BURST_SCALE = 2;
const GSAP_AURA_SCALE_DURATION_SEC = 2.2;
const EVOLUTION_RESULT_TEXT_DURATION_SEC = 0.5;
const EVOLUTION_FLASH_SPRITE_SWAP_THRESHOLD = 4;
const EVOLUTION_FLASH_MIN_DELAY_SEC = 0.08;
const EVOLUTION_FLASH_BASE_DELAY_SEC = 0.25;
const EVOLUTION_FLASH_DECAY_RATE = 0.015;
const EVOLUTION_TRANSFORMED_DELAY_SEC = 0.15;
const EVOLUTION_BURST_EASE_OVERSHOOT = 2;
const EVOLUTION_FLARE_INITIAL_SCALE = 0.8;
const EVOLUTION_FLARE_INITIAL_OPACITY = 0.3;
const EVOLUTION_FLARE_MAX_SCALE = 2.2;
const EVOLUTION_FLARE_MAX_OPACITY = 0.95;
const EVOLUTION_FINAL_WAIT_DURATION_SEC = 1.0;
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
          { opacity: 0, y: EVOLUTION_RESULT_TEXT_Y_OFFSET_PX },
          { opacity: 1, y: 0, duration: EVOLUTION_RESULT_TEXT_DURATION_SEC, ease: 'power2.out' }
        );
      });
    }
  });

  // 1. Intro Wait
  timeline.to({}, { duration: EVOLUTION_INTRO_DELAY_SEC });

  // 2. Flashing & Swapping Phase (Intercambio visual de sprites rápido en flashes)
  timeline.add(() => { step.value = 'flashing'; });
  
  for (let i = 0; i < FLASH_COUNT; i++) {
    timeline.add(() => { 
      flashesDone.value = i + 1; 
      // Intercambia el sprite mostrado: de forma alternada a medida que avanza el parpadeo
      if (i > EVOLUTION_FLASH_SPRITE_SWAP_THRESHOLD) {
        currentShowingSprite.value = currentShowingSprite.value === 'from' ? 'to' : 'from';
      }
    }, `+=${Math.max(EVOLUTION_FLASH_MIN_DELAY_SEC, EVOLUTION_FLASH_BASE_DELAY_SEC - (i * EVOLUTION_FLASH_DECAY_RATE))}`);
  }

  // 3. Transformation & Sound
  timeline.add(() => {
    evolutionStore.evolve();
    step.value = 'transformed';
    currentShowingSprite.value = 'to';
    
    // Reproducir grito del Pokémon evolucionado
    if (evolutionStore.targetId) {
      gameBus.emit('PLAY_CRY', { name: evolutionStore.targetId });
    }
  }, `+=${EVOLUTION_TRANSFORMED_DELAY_SEC}`);

  // 4. Glow Burst, Scale & Aura Activation
  timeline.fromTo('.glow-bg', 
    { scale: 1, opacity: 0.2 },
    { scale: GSAP_BURST_SCALE, opacity: 0.8, duration: GSAP_BURST_DURATION_SEC, ease: `back.out(${EVOLUTION_BURST_EASE_OVERSHOOT})` },
    'transformed'
  );

  timeline.add(() => {
    nextTick(() => {
      if (flare1Ref.value && flare2Ref.value) {
        // Rotaciones continuas en contra-fase
        const rot1 = gsap.to(flare1Ref.value, { rotation: 360, duration: EVOLUTION_AURA_ROTATION_SEC, repeat: -1, ease: 'none' });
        const rot2 = gsap.to(flare2Ref.value, { rotation: -360, duration: EVOLUTION_AURA_ROTATION_SEC, repeat: -1, ease: 'none' });
        activeTweens.push(rot1, rot2);

        // Efecto respiración de escalas
        const scale1 = gsap.fromTo(flare1Ref.value,
          { scale: EVOLUTION_FLARE_INITIAL_SCALE, opacity: EVOLUTION_FLARE_INITIAL_OPACITY },
          { scale: EVOLUTION_FLARE_MAX_SCALE, opacity: EVOLUTION_FLARE_MAX_OPACITY, duration: GSAP_AURA_SCALE_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
        );
        const scale2 = gsap.fromTo(flare2Ref.value,
          { scale: EVOLUTION_FLARE_MAX_SCALE, opacity: EVOLUTION_FLARE_MAX_OPACITY },
          { scale: EVOLUTION_FLARE_INITIAL_SCALE, opacity: EVOLUTION_FLARE_INITIAL_OPACITY, duration: GSAP_AURA_SCALE_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
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
      const distance = EVOLUTION_PARTICLE_DIST_BASE + Math.random() * EVOLUTION_PARTICLE_DIST_RANGE;
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
  timeline.to({}, { duration: EVOLUTION_FINAL_WAIT_DURATION_SEC });
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
            v-for="n in EVOLUTION_PARTICLES_COUNT"
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
              <span class="emoji">❌</span> CANCELAR EVOLUCIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/components/_evolution-scene.scss" as *;
</style>
