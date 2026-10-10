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
        id="avatar-frame-selector-btn-todos" 
        type="button"
        class="filter-tab-btn" 
        :class="{ active: activeShapeFilter === 'all' }"
        @click.stop="activeShapeFilter = 'all'"
      >
        Todos
      </button>
      <button
        id="avatar-frame-selector-btn-circulares" 
        type="button"
        class="filter-tab-btn" 
        :class="{ active: activeShapeFilter === 'circular' }"
        @click.stop="activeShapeFilter = 'circular'"
      >
        <span class="emoji">🔴</span> Circulares
      </button>
      <button
        id="avatar-frame-selector-btn-cuadrados" 
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
@use "@/styles/components/_cosmetics-shared";

.avatar-preview-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

.shape-filter-tabs {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  width: fit-content;
  padding: 4px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(0 0 0 / 20%);
  margin-bottom: 20px;
}

.filter-tab-btn {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 6px 12px;
  border: none;
  border-radius: $radius-lg;
  background: transparent;
  color: var(--slate-400);
  font-family: inherit;
  font-size: var(--font-11);
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: Rgb(255 255 255 / 3%);
    color: var(--slate-100);
  }

  &.active {
    border: 1px solid Rgb(59 130 246 / 30%);
    background: Rgb(59 130 246 / 20%);
    color: var(--white);
    box-shadow: var(--shadow-glow-blue);
  }
}
</style>
