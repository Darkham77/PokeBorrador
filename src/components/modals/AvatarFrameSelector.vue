<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCosmeticsStore } from '@/stores/player/cosmetics'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import AvatarFrameCard from './AvatarFrameCard.vue'


import {
  isCosmeticStyleLocked,
  resolveCosmeticLockNotification,
  filterAvatarStylesByShape,
  checkIsLocalEnvironment,
  type ShapeFilterOption,
  type LockableCosmeticStyle,
  type CosmeticPlayerContext
} from './cosmeticsFilterHelper'

const uiStore = useUIStore()
const cosmeticsStore = useCosmeticsStore()
const gameStore = useGameStore()
const authStore = useAuthStore()

const activeShapeFilter = ref<ShapeFilterOption>('all')

const filteredAvatarStyles = computed(() => {
  return filterAvatarStylesByShape(cosmeticsStore.allAvatarStyles, activeShapeFilter.value)
})

const isLocal = computed(() => {
  const hn = typeof window !== 'undefined' ? window.location.hostname : undefined
  return checkIsLocalEnvironment(import.meta.env.DEV, hn)
})

const isAdmin = computed(() => {
  return authStore.user?.role === 'admin' || isLocal.value
})

const playerContext = computed<CosmeticPlayerContext>(() => ({
  playerClass: gameStore.state.playerClass,
  classLevel: gameStore.state.classLevel,
  trainerLevel: gameStore.state.trainerLevel,
  faction: gameStore.state.faction,
  isAdmin: isAdmin.value
}))

const isAvatarLocked = (style: LockableCosmeticStyle) => {
  return isCosmeticStyleLocked(style, playerContext.value)
}

const selectAvatar = (style: LockableCosmeticStyle) => {
  const lockNotice = resolveCosmeticLockNotification(style, 'marco', playerContext.value)
  if (lockNotice) {
    uiStore.notify(lockNotice, '🔒')
    return
  }
  cosmeticsStore.equipAvatarStyle(style.id)
}
</script>

<template>
  <section class="style-section">
    <div class="section-header">
      <h3>Bordes de Avatar</h3>
      <span class="badge">FOTO DE PERFIL</span>
    </div>
    <p class="section-desc">
      Marcos especiales para destacar tu presencia.
    </p>

    <!-- Filtro de Formas de Marcos -->
    <div class="shape-filter-tabs">
      <button 
        type="button"
        class="filter-tab-btn" 
        :class="{ active: activeShapeFilter === 'all' }"
        @click.stop="activeShapeFilter = 'all'"
      >
        Todos
      </button>
      <button 
        type="button"
        class="filter-tab-btn" 
        :class="{ active: activeShapeFilter === 'circular' }"
        @click.stop="activeShapeFilter = 'circular'"
      >
        <span class="emoji">🔴</span> Circulares
      </button>
      <button 
        type="button"
        class="filter-tab-btn" 
        :class="{ active: activeShapeFilter === 'square' }"
        @click.stop="activeShapeFilter = 'square'"
      >
        <span class="emoji">🟦</span> Cuadrados
      </button>
    </div>
    
    <div class="styles-grid">
      <AvatarFrameCard
        v-for="style in filteredAvatarStyles"
        :key="style.id"
        :style-data="style"
        :is-active="cosmeticsStore.equippedAvatarStyle === style.id"
        :is-locked="isAvatarLocked(style)"
        :player-class="gameStore.state.playerClass"
        :trainer-level="gameStore.state.trainerLevel"
        :gender="gameStore.state.gender"
        @select="selectAvatar(style)"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "@/styles/components/_cosmetics-shared.scss";

.avatar-preview-box {
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shape-filter-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  background: Rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  width: fit-content;
}

.filter-tab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    color: #f1f5f9;
    background: Rgba(255, 255, 255, 0.03);
  }

  &.active {
    color: #ffffff;
    background: Rgba(59, 130, 246, 0.2);
    border: 1px solid Rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 10px Rgba(59, 130, 246, 0.1);
  }
}
</style>
