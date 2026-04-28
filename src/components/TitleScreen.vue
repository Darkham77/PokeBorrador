<script setup>
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const _uiStore = useUIStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const gs = computed(() => gameStore.state)

const handleChooseStarter = async (id) => {
  await gameStore.chooseStarter(id)
}

const handleLogout = () => {
  authStore.logout()
}
</script>

<template>
  <div
    v-show="!gs.starterChosen && gameStore.isReady"
    id="title-screen"
    class="screen zoom-target"
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
        :style="{ '--card-seed': 0.1 }"
        @click.stop="handleChooseStarter('bulbasaur')"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-bulbasaur"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, 'bulbasaur')"
            alt="Bulbasaur"
            class="starter-sprite"
            @error="e => e.target.style.display = 'none'"
          >
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
        :style="{ '--card-seed': 0.5 }"
        @click.stop="handleChooseStarter('charmander')"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-charmander"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, 'charmander')"
            alt="Charmander"
            class="starter-sprite"
            @error="e => e.target.style.display = 'none'"
          >
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
        :style="{ '--card-seed': 0.9 }"
        @click.stop="handleChooseStarter('squirtle')"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-squirtle"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, 'squirtle')"
            alt="Squirtle"
            class="starter-sprite"
            @error="e => e.target.style.display = 'none'"
          >
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
        @click.stop="handleLogout"
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

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
  width: 160px;
  height: 160px;
  image-rendering: pixelated;
}

.title-footer {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.logout-btn-trigger {
  @include btn-vicio('danger', 'md');
  padding: 14px 28px;
  font-size: 9px;
  min-width: 220px;
}

.logout-hint {
  font-size: 10px;
  color: var(--gray);
  font-style: italic;
  opacity: 0.8;
}
</style>
