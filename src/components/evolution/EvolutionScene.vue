<script setup>
import { ref, onMounted } from 'vue';
import { useEvolutionStore } from '@/stores/evolution';
import { getSpriteUrl } from '@/logic/pokemonUtils';
import { POKEMON_DB } from '@/data/pokemonDB';

const evolutionStore = useEvolutionStore();
const step = ref('intro'); // intro | flashing | transformed | final
const oldName = ref('');
const newName = ref('');
const fromSprite = ref('');
const toSprite = ref('');

const FLASH_COUNT = 6; // 3 flashes (on/off)
const flashesDone = ref(0);

onMounted(() => {
  if (!evolutionStore.sourcePokemon || !evolutionStore.targetId) return;

  oldName.value = evolutionStore.sourcePokemon.name;
  newName.value = POKEMON_DB[evolutionStore.targetId]?.name || evolutionStore.targetId;
  fromSprite.value = getSpriteUrl(evolutionStore.sourcePokemon.id, evolutionStore.sourcePokemon.isShiny);
  toSprite.value = getSpriteUrl(evolutionStore.targetId, evolutionStore.sourcePokemon.isShiny);

  startSequence();
});

const startSequence = () => {
  // Wait a bit in intro
  setTimeout(() => {
    step.value = 'flashing';
    runFlashes();
  }, 1500);
};

const runFlashes = () => {
  const interval = setInterval(() => {
    flashesDone.value++;
    if (flashesDone.value >= FLASH_COUNT) {
      clearInterval(interval);
      completeEvolution();
    }
  }, 250);
};

const completeEvolution = () => {
  // Actually mutate the data in the store
  const result = evolutionStore.evolve();
  step.value = 'transformed';
  
  // Final message delay
  setTimeout(() => {
    step.value = 'final';
  }, 1000);
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
      <div class="evolution-container">
        <!-- Background FX -->
        <div class="particles">
          <div
            v-for="n in 20"
            :key="n"
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
            v-if="step !== 'transformed' && step !== 'final'"
            :src="fromSprite" 
            class="pokemon-sprite from" 
            :class="{ flashing: step === 'flashing', 'flash-on': flashesDone % 2 !== 0 }"
          >

          <img 
            v-if="step === 'transformed' || step === 'final'"
            :src="toSprite" 
            class="pokemon-sprite to"
            :class="{ 'scale-in': step === 'transformed' }"
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
            v-if="step === 'final'"
            class="result-text"
          >
            <p>¡{{ oldName }} evolucionó a <span class="highlight">{{ newName }}</span>!</p>
            <button
              class="btn-confirm"
              @click="close"
            >
              CONTINUAR
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "sass:math";
@use "sass:string";

.evolution-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0a 100%);
  display: flex;
  align-items: center;
  justify-content:center;
  font-family: 'Press Start 2P', cursive;
  backdrop-filter: blur(10px);
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
  background: var(--blue, #3b82f6);
  filter: blur(40px);
  opacity: 0.2;
  transition: all 1s ease;
  
  &.flashing {
    background: #fff;
    opacity: 0.5;
    transform: string.unquote("scale(#{1.5})");
  }
  
  &.transformed, &.final {
    background: var(--yellow, #fbbf24);
    opacity: 0.6;
    transform: string.unquote("scale(#{1.5})");
    box-shadow: 0 0 60px rgba(251, 191, 36, 0.4);
  }
}

.pokemon-sprite {
  width: 160px;
  height: 160px;
  image-rendering: pixelated;
  position: relative;
  z-index: 2;
  
  &.from {
    filter: Brightness(1);
    transition: filter 0.1s;
    
    &.flash-on {
      filter: Brightness(10) Contrast(10) grayScale(100%);
    }
  }
  
  &.scale-in {
    animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
}

.evolution-info {
  margin-top: 40px;
  padding: 0 20px;
  height: 80px;
}

.status-text {
  color: #fff;
  font-size: 12px;
  line-height: 1.6;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.result-text {
  animation: fadeIn 0.5s ease;
  p {
    color: #fff;
    font-size: 13px;
    margin-bottom: 24px;
    line-height: 1.8;
  }
  .highlight {
    color: var(--yellow, #fbbf24);
    font-weight: bold;
  }
}

.btn-confirm {
  background: var(--blue, #3b82f6);
  color: #fff;
  border: none;
  padding: 12px 24px;
  font-family: inherit;
  font-size: 10px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 #2563eb;
  transition: transform 0.1s;
  
  &:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #2563eb;
  }
}

// Particles effect
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #fff;
  border-radius: 2px;
  opacity: 0;
  
  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      left: math.random(100) * 1%;
      top: math.random(100) * 1%;
      animation: float #{math.random(3000) + 2000}ms infinite ease-in-out;
      animation-delay: #{math.random(2000)}ms;
    }
  }
}

@keyframes bounceIn {
  from { transform: string.unquote("scale(#{0})"); opacity: 0; }
  to { transform: string.unquote("scale(#{1.0})"); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0% { transform: translateY(0) string.unquote("scale(#{1.0})"); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translateY(-40px) string.unquote("scale(#{0})"); opacity: 0; }
}
</style>
