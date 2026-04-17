<script setup>
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

const gameStore = useGameStore()
const authStore = useAuthStore()
const gs = computed(() => gameStore.state)

const handleLogout = () => {
  if (window.authStore) {
    window.authStore.logout()
  } else if (window.doLogout) {
    window.doLogout()
  } else {
    authStore.logout()
  }
}
</script>

<template>
  <div
    id="title-screen"
    class="screen zoom-target"
    :class="{ active: !gs.starterChosen }"
  >
    <div class="title-logo">
      Poké Vicio
    </div>
    <div class="title-sub">
      Te reto a dejar de jugarlo
    </div>
    <p class="title-description">
      Elegí tu Pokémon inicial para comenzar tu aventura
    </p>
    
    <div class="starter-grid">
      <!-- Bulbasaur -->
      <div
        class="starter-card grass"
        onclick="chooseStarter('bulbasaur')"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-bulbasaur"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.webp"
            alt="Bulbasaur"
            class="starter-sprite"
          >
          <span
            id="starter-emo-bulbasaur"
            class="starter-emoji-fallback"
          >🌿</span>
        </div>
        <div class="starter-name">
          Bulbasaur
        </div>
        <span class="starter-type type-grass">🌿 Planta</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>45</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>49</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>49</span>
          </div>
        </div>
      </div>

      <!-- Charmander -->
      <div
        class="starter-card fire"
        onclick="chooseStarter('charmander')"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-charmander"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.webp"
            alt="Charmander"
            class="starter-sprite"
          >
          <span
            id="starter-emo-charmander"
            class="starter-emoji-fallback"
          >🔥</span>
        </div>
        <div class="starter-name">
          Charmander
        </div>
        <span class="starter-type type-fire">🔥 Fuego</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>39</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>52</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>43</span>
          </div>
        </div>
      </div>

      <!-- Squirtle -->
      <div
        class="starter-card water"
        onclick="chooseStarter('squirtle')"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-squirtle"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.webp"
            alt="Squirtle"
            class="starter-sprite"
          >
          <span
            id="starter-emo-squirtle"
            class="starter-emoji-fallback"
          >💧</span>
        </div>
        <div class="starter-name">
          Squirtle
        </div>
        <span class="starter-type type-water">💧 Agua</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>44</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>48</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>65</span>
          </div>
        </div>
      </div>
    </div>

    <div class="title-footer">
      <button
        class="logout-btn-trigger"
        @click="handleLogout"
      >
        <i class="fas fa-sign-out-alt" /> 
        <span>CERRAR SESIÓN</span>
      </button>
      <div class="logout-hint">
        ¿Te equivocaste de cuenta? Cierra sesión para volver al login.
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-description {
  color: var(--gray);
  font-size: 14px;
  margin-bottom: 30px;
}

.starter-img-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.starter-sprite {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
}

.starter-emoji-fallback {
  font-size: 60px;
  display: none;
}

.title-footer {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.logout-btn-trigger {
  background: rgba(239, 68, 68, 0.12);
  border: 1.5px solid rgba(239, 68, 68, 0.35);
  color: #ff7676;
  padding: 14px 28px;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 220px;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
}

.logout-btn-trigger:hover {
  background: rgba(239, 68, 68, 0.2) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(239, 68, 68, 0.25) !important;
  border-color: rgba(239, 68, 68, 0.5) !important;
}

.logout-btn-trigger:active {
  transform: translateY(1px);
}

.logout-hint {
  font-size: 10px;
  color: var(--gray);
  font-style: italic;
  opacity: 0.8;
}
</style>
