<script setup>
import { ref, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  pokemon: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const stage = ref('egg') // 'egg', 'crack', 'reveal'
const showParticles = ref(false)

const getSprite = (id, shiny) => {
  return window.getSpriteUrl?.(id, shiny) || ''
}

const startSequence = () => {
  setTimeout(() => {
    stage.value = 'crack'
    window.playSound?.('egg_crack')
    
    setTimeout(() => {
      stage.value = 'reveal'
      showParticles.value = true
      window.playSound?.('evolution_complete') // reuse or egg_hatch
    }, 1500)
  }, 1000)
}

onMounted(() => {
  startSequence()
})
</script>

<template>
  <div
    class="hatch-overlay"
    @click.self="stage === 'reveal' && emit('close')"
  >
    <div
      class="hatch-container"
      :class="stage"
    >
      <!-- Egg Phase -->
      <div
        v-if="stage !== 'reveal'"
        class="egg-visual"
      >
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/egg.png"
          class="egg-sprite"
          :class="{ shake: stage === 'crack' }"
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
          class="continue-btn"
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
  </div>
</template>

<style scoped lang="scss">
.hatch-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hatch-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.egg-visual {
  position: relative;
  .egg-sprite {
    width: 140px;
    image-rendering: pixelated;
    filter: drop-shadow(0 0 20px rgba(255,255,255,0.2));
    animation: bounce 2s infinite ease-in-out;
  }
  .egg-sprite.shake {
    animation: shake 0.2s infinite;
  }
}

.glow-ring {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 200px; height: 200px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
}

.reveal-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  animation: fade-in 0.8s ease-out forwards;
}

.pokemon-display {
  position: relative;
  text-align: center;
  .pokemon-sprite {
    width: 180px;
    image-rendering: pixelated;
    filter: drop-shadow(0 0 30px var(--yellow));
    animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
}

.splash-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #fff;
  margin-top: 30px;
  text-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

.stats-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px 20px;
  margin-top: 25px;
  width: 80%;
  .stat-row {
    display: flex; justify-content: space-between; margin-bottom: 8px;
    &:last-child { margin-bottom: 0; }
    .label { color: var(--gray); font-size: 11px; }
    .val { color: var(--yellow); font-size: 11px; font-weight: bold; }
  }
}

.continue-btn {
  margin-top: 40px;
  padding: 14px 40px;
  background: var(--yellow);
  color: #000;
  border: none;
  border-radius: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  box-shadow: 0 4px 0 #b45309;
  &:active { transform: translateY(2px); box-shadow: 0 2px 0 #b45309; }
}

/* Animations */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes pulse-ring {
  0% { transform: translate(-50%, -50%) #{'scale(0.8)'}; opacity: 0.8; }
  100% { transform: translate(-50%, -50%) #{'scale(1.5)'}; opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: #{'scale(0.9)'}; }
  to { opacity: 1; transform: #{'scale(1)'}; }
}

@keyframes pop-in {
  from { transform: #{'scale(0)'}; }
  to { transform: #{'scale(1.2)'}; }
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
}

@keyframes explode {
  0% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(var(--x), var(--y)); opacity: 0; }
}

.shimmer-bg {
  position: absolute;
  inset: -100px;
  background: radial-gradient(circle at center, rgba(255,217,61,0.1) 0%, transparent 70%);
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
