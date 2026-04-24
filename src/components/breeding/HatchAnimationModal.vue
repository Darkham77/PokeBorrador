<script setup>
/**
 * HatchAnimationModal
 * Standardized full-screen animation for egg hatching.
 */
import { ref, onMounted } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  pokemon: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const stage = ref('egg') // 'egg', 'crack', 'reveal'
const showParticles = ref(false)

const getSprite = (id, isShiny) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny: isShiny })
}

const startSequence = () => {
  setTimeout(() => {
    stage.value = 'crack'
    window.playSound?.('egg_crack')
    
    setTimeout(() => {
      stage.value = 'reveal'
      showParticles.value = true
      window.playSound?.('evolution_complete')
    }, 1500)
  }, 1000)
}

onMounted(() => {
  if (props.show) startSequence()
})
</script>

<template>
  <BaseModal
    :show="show"
    max-width="100%"
    padding="raw"
    variant="modern"
    overlay="dark"
    hide-header
    :show-close-button="stage === 'reveal'"
    :prevent-close="stage !== 'reveal'"
    @close="emit('close')"
  >
    <div
      class="hatch-immersion-container"
      :class="stage"
    >
      <!-- Egg Phase -->
      <div
        v-if="stage !== 'reveal'"
        class="egg-visual"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.ITEM, 'egg')"
          class="egg-sprite"
          :class="{ shake: stage === 'crack' }"
          @error="e => e.target.style.display = 'none'"
        >
        <div class="glow-ring" />
      </div>

      <!-- Result Phase -->
      <div
        v-else
        class="reveal-visual"
      >
        <div class="shimmer-bg" />
        <div class="pokemon-display">
          <img
            :src="getSprite(pokemon.id, pokemon.isShiny)"
            class="pokemon-sprite"
            @error="e => e.target.style.display = 'none'"
          >
          <div class="splash-text">
            ¡Ha nacido un {{ pokemon.name }}!
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stat-row">
            <span class="label">Naturaleza:</span>
            <span class="val">{{ pokemon.nature }}</span>
          </div>
          <div class="stat-row">
            <span class="label">IVs:</span>
            <span class="val">{{ pokemon.ivs.hp }}/{{ pokemon.ivs.atk }}/{{ pokemon.ivs.def }}/{{ pokemon.ivs.spa }}/{{ pokemon.ivs.spd }}/{{ pokemon.ivs.spe }}</span>
          </div>
        </div>

        <button
          class="btn-vicio-primary btn-vicio-full"
          style="max-width: 200px; margin-top: 40px;"
          @click="emit('close')"
        >
          CONTINUAR
        </button>
      </div>

      <!-- Particles -->
      <div
        v-if="showParticles"
        class="particles-field"
      >
        <div
          v-for="n in 20"
          :key="n"
          class="particle"
          :style="`--delay: ${Math.random() * 2}s; --x: ${Math.random() * 200 - 100}px; --y: ${Math.random() * 200 - 100}px` "
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.hatch-immersion-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, transparent 100%);
  @include gpu-layer;
}

.egg-visual {
  position: relative;
  @include gpu-layer;

  .egg-sprite {
    width: 140px;
    @include sprite-render;
    filter: Drop-Shadow(0 0 20px rgba(255,255,255,0.2));
    animation: bounce 2s infinite ease-in-out;
  }
  .egg-sprite.shake {
    animation: shake 0.2s infinite;
  }
}

.glow-ring {
  position: absolute;
  top: 50%; left: 50%;
  transform: Translate(-50%, -50%);
  width: 200px; height: 200px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
  @include gpu-layer;
}

.reveal-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  animation: fade-in 0.8s ease-out forwards;
  @include gpu-layer;
}

.pokemon-display {
  position: relative;
  text-align: center;
  .pokemon-sprite {
    width: 180px;
    @include sprite-render;
    filter: Drop-Shadow(0 0 30px var(--yellow));
    animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
}

.splash-text {
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  color: $white;
  margin-top: 30px;
  text-shadow: 0 4px 8px rgba(0,0,0,0.5);
  @include pixelated;
}

.stats-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px 20px;
  margin-top: 25px;
  width: 320px;
  max-width: 90%;
  @include gpu-layer;

  .stat-row {
    display: flex; justify-content: space-between; margin-bottom: 8px;
    &:last-child { margin-bottom: 0; }
    .label { color: var(--gray); font-size: 11px; }
    .val { color: var(--yellow); font-size: 11px; font-weight: bold; }
  }
}

/* Animations */
@keyframes bounce {
  0%, 100% { transform: TranslateY(0); }
  50% { transform: TranslateY(-15px); }
}

@keyframes shake {
  0% { transform: TranslateX(0); }
  25% { transform: TranslateX(-5px); }
  75% { transform: TranslateX(5px); }
}

@keyframes pulse-ring {
  0% { transform: Translate(-50%, -50%) Scale(0.8); opacity: 0.8; }
  100% { transform: Translate(-50%, -50%) Scale(1.5); opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: Scale(0.9); }
  to { opacity: 1; transform: Scale(1.0); }
}

@keyframes pop-in {
  from { transform: Scale(0); }
  to { transform: Scale(1.2); }
}

/* Particles */
.particles-field {
  position: absolute;
  top: 50%; left: 50%;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 6px; height: 6px;
  background: var(--yellow);
  border-radius: 50%;
  animation: explode 1.5s ease-out forwards;
  animation-delay: var(--delay);
  @include gpu-layer;
}

@keyframes explode {
  0% { transform: Translate(0, 0); opacity: 1; }
  100% { transform: Translate(var(--x), var(--y)); opacity: 0; }
}

.shimmer-bg {
  position: absolute;
  inset: -100px;
  background: radial-gradient(circle at center, rgba(255,217,61,0.1) 0%, transparent 70%);
  animation: rotate 10s linear infinite;
  @include gpu-layer;
}

@keyframes rotate {
  from { transform: Rotate(0deg); }
  to { transform: Rotate(360deg); }
}

:deep(.base-modal-card) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
</style>
