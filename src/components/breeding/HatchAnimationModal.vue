<script setup>
/**
 * HatchAnimationModal
 * Standardized full-screen animation for egg hatching.
 */
import { ref, onMounted } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import { useGameStore } from '@/stores/game'

const props = defineProps({
  show: { type: Boolean, default: false },
  pokemon: { type: Object, default: null },
  egg: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const stage = ref('egg') // 'egg', 'crack', 'reveal'
const showParticles = ref(false)
const resultPokemon = ref(null)

const gameStore = useGameStore()

const prepareResult = async () => {
  if (props.pokemon) {
    resultPokemon.value = props.pokemon
    return
  }
  
  if (props.egg) {
    const { makePokemon, recalcPokemonStats } = await import('@/logic/pokemonFactory')
    const p = makePokemon(props.egg.id, 1, {
      isShiny: props.egg.isShiny,
      isGuardian: props.egg.isGuardian,
      nature: props.egg.nature
    })
    p.ivs = { ...p.ivs, ...props.egg.ivs }
    recalcPokemonStats(p)
    resultPokemon.value = p
  }
}

const handleClose = async () => {
  if (props.egg) {
    await gameStore.executeHatch(props.egg)
  }
  emit('close')
}

const getSprite = (id, isShiny) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny: isShiny })
}

const handleEggClick = () => {
  if (stage.value !== 'egg') return
  
  stage.value = 'crack'
  window.playSound?.('egg_crack')
  
  // Final reveal after a short delay of cracking
  setTimeout(() => {
    stage.value = 'reveal'
    showParticles.value = true
    window.playSound?.('evolution_complete')
  }, 1200)
}

onMounted(async () => {
  if (props.show) {
    await prepareResult()
    // No longer auto-starting sequence
  }
})
</script>

<template>
  <BaseModal
    :show="show"
    max-width="100vw"
    padding="raw"
    variant="modern"
    overlay="dark"
    hide-header
    :show-close-button="false"
    :prevent-close="stage !== 'reveal'"
    @close="handleClose"
  >
    <div
      class="hatch-immersion-container"
      :class="stage"
      @click.stop="stage === 'egg' ? handleEggClick() : null"
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
        <div class="hatch-hint">
          ¡HAZ CLIC PARA ECLOSIONAR!
        </div>
      </div>

      <!-- Result Phase -->
      <div
        v-else
        class="reveal-visual"
      >
        <div class="shimmer-bg" />
        <div
          class="pokemon-display"
        >
          <PVSpriteFX
            :is-shiny="resultPokemon?.isShiny"
            :is-guardian="resultPokemon?.isGuardian"
            :sparkle-count="8"
          >
            <img
              v-if="resultPokemon"
              :src="getSprite(resultPokemon.id, resultPokemon.isShiny)"
              class="pokemon-sprite"
              @error="e => e.target.style.display = 'none'"
            >
          </PVSpriteFX>
          <div class="splash-text">
            ¡Ha nacido un {{ resultPokemon?.name }}!
          </div>
        </div>

        
        <div
          v-if="resultPokemon"
          class="stats-card"
        >
          <div class="stat-row">
            <span class="label">Naturaleza:</span>
            <span class="val">{{ resultPokemon.nature }}</span>
          </div>
          <div class="stat-row">
            <span class="label">IVs:</span>
            <span class="val">{{ resultPokemon.ivs.hp }}/{{ resultPokemon.ivs.atk }}/{{ resultPokemon.ivs.def }}/{{ resultPokemon.ivs.spa }}/{{ resultPokemon.ivs.spd }}/{{ resultPokemon.ivs.spe }}</span>
          </div>
        </div>

        <button
          class="btn-vicio-primary btn-vicio-full"
          style="max-width: 200px; margin-top: 40px;"
          @click.stop="handleClose"
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
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.hatch-immersion-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, Rgba(30, 41, 59, 0.4) 0%, transparent 100%);
  @include gpu-layer;
}

.egg-visual {
  position: relative;
  @include gpu-layer;

  .egg-sprite {
    width: 140px;
    @include sprite-render;
    filter: Drop-Shadow(0 0 20px Rgba(255,255,255,0.2));
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
  border: 2px solid Rgba(255,255,255,0.1);
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
  @include pixelated;
  font-size: 14px;
  color: $white;
  margin-top: 30px;
  text-shadow: 0 4px 8px Rgba(0,0,0,0.5);
  @include pixelated;
}

.stats-card {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
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
  background: radial-gradient(circle at center, Rgba(255,217,61,0.1) 0%, transparent 70%);
  animation: rotate 10s linear infinite;
  @include gpu-layer;
}

@keyframes rotate {
  from { transform: Rotate(0deg); }
  to { transform: Rotate(360deg); }
}

.hatch-hint {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: TranslateX(-50%);
  @include pixelated;
  font-size: 10px;
  color: Rgba(255,255,255,0.6);
  white-space: nowrap;
  animation: pulse-hint 1.5s infinite;
  @include pixelated;
}

@keyframes pulse-hint {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

:deep(.base-modal-card) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  overflow: visible !important;
  max-height: none !important;
}

:deep(.base-modal-content) {
  overflow: visible !important;
  padding: 0 !important;
}

:deep(.base-modal-overlay) {
  -webkit-backdrop-filter: Blur(10px); backdrop-filter: Blur(10px);
}
</style>
