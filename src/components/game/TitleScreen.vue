<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { STARTER_POKEMON } from '@/data/pokemon/starters.ts'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { gsap } from 'gsap'

const gameStore = useGameStore()
const authStore = useAuthStore()
const gs = computed(() => gameStore.state)

const starterList = computed(() => {
  return STARTER_POKEMON.map((config, index) => {
    const data = pokemonDataProvider.getPokemonData(config.id)
    const primaryType = data.type || 'normal'
    const typeLabel = primaryType === 'grass' ? '🌿 Planta' : primaryType === 'fire' ? '🔥 Fuego' : primaryType === 'water' ? '💧 Agua' : primaryType
    return {
      id: config.id,
      name: data.name || config.id,
      type: primaryType,
      typeLabel,
      seed: 0.1 + index * 0.4,
      stats: {
        hp: data.hp || 45,
        attack: data.atk || 49,
        defense: data.def || 49
      }
    }
  })
})

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
      <div
        v-for="starter in starterList"
        :id="`starter-card-${starter.id}`"
        :key="starter.id"
        class="starter-card"
        :class="starter.type"
        :style="{ '--card-seed': starter.seed }"
        @click.stop="handleChooseStarter(starter.id)"
        @mouseenter="handleMouseEnter($event, starter.type)"
        @mouseleave="handleMouseLeave($event)"
      >
        <div class="starter-img-container">
          <img
            :id="`starter-img-${starter.id}`"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, starter.id)"
            :alt="starter.name"
            class="starter-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>
        <div class="starter-name">
          {{ starter.name }}
        </div>
        <span
          class="starter-type"
          :class="`type-${starter.type}`"
        >{{ starter.typeLabel }}</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>{{ starter.stats.hp }}</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>{{ starter.stats.attack }}</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>{{ starter.stats.defense }}</span>
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
