<script setup>
import { onMounted, ref } from 'vue'
import { useWarStore } from '@/stores/war'
import WarDashboard from '@/components/war/WarDashboard.vue'
import FactionChoiceModal from '@/components/war/FactionChoiceModal.vue'

const warStore = useWarStore()
const showChoiceModal = ref(false)

onMounted(async () => {
  await warStore.loadWarData()
  // Show choice modal if no faction selected
  if (!warStore.faction) {
    showChoiceModal.value = true
  }
})
</script>

<template>
  <div class="war-page">
    <div class="container">
      <header class="page-header">
        <h1
          class="glitch"
          data-text="GUERRA DE FACCIONES"
        >
          GUERRA DE FACCIONES
        </h1>
        <p class="subtitle">
          Control territorial de Kanto - Temporada {{ warStore.currentWeekId }}
        </p>
      </header>

      <WarDashboard />

      <!-- Faction Selection Trigger (if needed) -->
      <div
        v-if="warStore.faction"
        class="change-faction-hint"
      >
        ¿Quieres cambiar de bando? 
        <button @click="showChoiceModal = true">
          MODIFICAR FACCIÓN
        </button>
      </div>
    </div>

    <!-- Faction Choice Modal -->
    <FactionChoiceModal 
      :show="showChoiceModal" 
      @close="showChoiceModal = false" 
    />
  </div>
</template>

<style lang="scss" scoped>
.war-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #1a1a1a 0%, #0a0a0a 100%);
  padding: 40px 20px;
  overflow-y: auto;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;

  h1 {
    font-family: 'Press Start 2P', cursive;
    font-size: 24px;
    color: white;
    margin-bottom: 12px;
    letter-spacing: 2px;
  }

  .subtitle {
    font-size: 12px;
    color: #888;
    font-family: 'Press Start 2P', cursive;
  }
}

.change-faction-hint {
  margin-top: 40px;
  text-align: center;
  font-size: 11px;
  color: #555;
  
  button {
    background: none;
    border: none;
    color: #888;
    text-decoration: underline;
    cursor: pointer;
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    margin-left: 8px;
    
    &:hover { color: white; }
  }
}

/* Glitch Effect (Premium) */
.glitch {
  position: relative;
  &::before, &::after {
    content: attr(data-text);
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    opacity: 0.8;
  }
  &::before {
    left: 2px;
    text-shadow: -2px 0 #ff00c1;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim 5s infinite linear alternate-reverse;
  }
  &::after {
    left: -2px;
    text-shadow: -2px 0 #00fff9, 2px 2px #ff00c1;
    animation: glitch-anim2 1s infinite linear alternate-reverse;
  }
}

@keyframes glitch-anim {
  0% { clip: rect(31px, 9999px, 94px, 0); transform: skew(0.85deg); }
  100% { clip: rect(70px, 9999px, 71px, 0); transform: skew(0.1deg); }
}

@keyframes glitch-anim2 {
  0% { clip: rect(65px, 9999px, 100px, 0); transform: skew(0.3deg); }
  100% { clip: rect(10px, 9999px, 20px, 0); transform: skew(0.3deg); }
}
</style>
