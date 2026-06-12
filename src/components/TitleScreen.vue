<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { gsap } from 'gsap'

const gameStore = useGameStore()
const authStore = useAuthStore()
const gs = computed(() => gameStore.state)

const handleChooseStarter = async (id: string) => {
  await gameStore.chooseStarter(id)
}

const handleLogout = () => {
  authStore.logout()
}

const getStarterConfig = (type: string) => {
  if (type === 'grass') {
    return {
      color: 'rgba(50, 215, 75, 0.8)',
      bg: 'rgba(50, 215, 75, 0.15)',
      shadow: '0 12px 35px rgba(50, 215, 75, 0.35)'
    }
  }
  if (type === 'fire') {
    return {
      color: 'rgba(255, 69, 58, 0.8)',
      bg: 'rgba(255, 69, 58, 0.15)',
      shadow: '0 12px 35px rgba(255, 69, 58, 0.35)'
    }
  }
  return {
    color: 'rgba(10, 132, 255, 0.8)',
    bg: 'rgba(10, 132, 255, 0.15)',
    shadow: '0 12px 35px rgba(10, 132, 255, 0.35)'
  }
}

const handleMouseEnter = (event: MouseEvent, type: string) => {
  const el = event.currentTarget as HTMLElement
  const config = getStarterConfig(type)
  
  gsap.to(el, {
    y: -12,
    scale: 1.03,
    borderColor: config.color,
    backgroundColor: config.bg,
    boxShadow: config.shadow,
    '--glow-opacity': 1,
    duration: 0.35,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const handleMouseLeave = (event: MouseEvent) => {
  const el = event.currentTarget as HTMLElement
  
  gsap.to(el, {
    y: 0,
    scale: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    boxShadow: 'none',
    '--glow-opacity': 0,
    duration: 0.3,
    ease: 'power2.inOut',
    overwrite: 'auto'
  })
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
        @mouseenter="handleMouseEnter($event, 'grass')"
        @mouseleave="handleMouseLeave($event)"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-bulbasaur"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, 'bulbasaur')"
            alt="Bulbasaur"
            class="starter-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
        @mouseenter="handleMouseEnter($event, 'fire')"
        @mouseleave="handleMouseLeave($event)"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-charmander"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, 'charmander')"
            alt="Charmander"
            class="starter-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
        @mouseenter="handleMouseEnter($event, 'water')"
        @mouseleave="handleMouseLeave($event)"
      >
        <div class="starter-img-container">
          <img
            id="starter-img-squirtle"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, 'squirtle')"
            alt="Squirtle"
            class="starter-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
  text-align: center;
}

.starter-img-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.starter-sprite {
  width: 160px;
  height: 160px;
  @include pixelated;
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
  text-align: center;
}

@media (max-height: 850px), (max-width: 600px) {
  .title-description {
    margin-bottom: 15px;
    font-size: 12px;
  }
  
  .starter-img-container {
    height: 90px;
    margin-bottom: 4px;
    position: relative;
    overflow: visible;
  }
  
  .starter-sprite {
    width: 160px;
    height: 160px;
    position: absolute;
    top: 50%;
    transform: Translatey(-55%);
  }
  
  .title-footer {
    margin-top: 15px;
    gap: 8px;
  }
  
  .logout-btn-trigger {
    padding: 10px 20px;
    min-width: 180px;
  }
}
</style>
