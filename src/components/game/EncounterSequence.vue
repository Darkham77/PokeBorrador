<script setup>
import { onMounted } from 'vue'

const props = defineProps({
  type: { type: String, required: true }, // 'rival' or 'fishing'
  pokemon: { type: Object, default: null },
  rarity: { type: String, default: '' },
  onStart: { type: Function, default: null },
  onComplete: { type: Function, default: null }
})

const emit = defineEmits(['close'])

onMounted(() => {
  if (props.type === 'rival') {
    setTimeout(() => {
      if (props.onComplete) props.onComplete()
      emit('close')
    }, 1200)
  }
})

const handleFishingStart = () => {
  if (props.onStart) props.onStart()
  emit('close')
}
</script>

<template>
  <div class="encounter-sequence-container">
    <!-- RIVAL SEQUENCE -->
    <template v-if="type === 'rival'">
      <div class="rival-flicker" />
      <div class="rival-exclamation">
        !
      </div>
    </template>

    <!-- FISHING INTRO -->
    <template v-if="type === 'fishing'">
      <div class="fishing-intro-overlay">
        <div class="fishing-card">
          <div class="fishing-icon">
            🎣
          </div>
          <div class="fishing-title">
            ¡ALGO PICÓ!
          </div>
          <div class="fishing-text">
            ¡Un Pokémon ha mordido el anzuelo!
          </div>
          <button 
            class="fishing-btn" 
            @click="handleFishingStart"
          >
            🎣 ¡MINIJUEGO DE PESCA!
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.encounter-sequence-container {
  position: fixed;
  inset: 0;
  z-index: var(--z-max);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rival-flicker {
  position: fixed;
  inset: 0;
  background: white;
  animation: rivalFlash 0.15s ease infinite;
  pointer-events: none;
  z-index: calc(var(--z-max) + 1);
}

.rival-exclamation {
  position: relative;
  @include pixelated;
  font-size: 80px;
  color: #ff3b30;
  text-shadow: 0 0 20px rgba(255, 59, 48, 0.6);
  z-index: calc(var(--z-max) + 2);
  animation: bounceExcl 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) infinite;
}

@keyframes rivalFlash {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.3; }
}

@keyframes bounceExcl {
  0%, 100% { transform: Scale(1); }
  50% { transform: Scale(1.2); }
}

/* Fishing Styles */
.fishing-intro-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-max);
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: auto;
  animation: fadeIn 0.3s ease;
}

.fishing-card {
  @include card-premium;
  background: var(--card);
  border-radius: 24px;
  padding: 32px;
  max-width: 380px;
  width: 100%;
  border: 2px solid var(--blue);
  text-align: center;
  position: relative;
  box-shadow: 0 0 30px rgba(10, 132, 255, 0.4);
}

.fishing-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: bounce 1.5s infinite;
}

.fishing-title {
  @include pixelated;
  font-size: 12px;
  color: var(--blue);
  margin-bottom: 16px;
  @include pixelated;
}

.fishing-text {
  font-size: 14px;
  color: #eee;
  margin: 16px 0;
  line-height: 1.6;
}

.fishing-btn {
  @include pixelated;
  font-size: 10px;
  padding: 16px 32px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--blue), #2563eb);
  color: $white;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5);
  margin-top: 12px;
  width: 100%;
  transition: transform 0.2s;
  @include pixelated;

  &:hover {
    transform: translateY(-2px);
    filter: Brightness(1.1);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
