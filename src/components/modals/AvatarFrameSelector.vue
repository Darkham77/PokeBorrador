<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCosmeticsStore } from '@/stores/player/cosmetics'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'

interface AvatarStyle {
  id: string
  name: string
  class: string
  requiredRole?: string
  requiredClass?: string
  requiredFaction?: string
}

const uiStore = useUIStore()
const cosmeticsStore = useCosmeticsStore()
const gameStore = useGameStore()
const authStore = useAuthStore()

const activeShapeFilter = ref<'all' | 'circular' | 'square'>('all')

const filteredAvatarStyles = computed(() => {
  const styles = cosmeticsStore.allAvatarStyles
  if (activeShapeFilter.value === 'circular') {
    return styles.filter(s => !s.class.includes('sq'))
  }
  if (activeShapeFilter.value === 'square') {
    return styles.filter(s => s.class.includes('sq'))
  }
  return styles
})

// Check if the current context is local development
const isLocal = computed(() => {
  if (import.meta.env.DEV) return true
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname
    return hn === 'localhost' || hn === '127.0.0.1' || hn.endsWith('.local')
  }
  return false
})

// Check if user is admin (local development counts as admin)
const isAdmin = computed(() => {
  return authStore.user?.role === 'admin' || isLocal.value
})

const isAvatarLocked = (style: AvatarStyle) => {
  if (style.requiredRole === 'admin' && !isAdmin.value) {
    return true
  }
  if (style.requiredClass) {
    if (gameStore.state.playerClass !== style.requiredClass) {
      return true
    }
    const currentLevel = Math.max(gameStore.state.classLevel || 1, gameStore.state.trainerLevel || 1)
    if (currentLevel < 25) {
      return true
    }
  }
  if (style.requiredFaction && gameStore.state.faction !== style.requiredFaction) {
    return true
  }
  return false
}

const selectAvatar = (style: AvatarStyle) => {
  if (isAvatarLocked(style)) {
    if (style.requiredRole) {
      uiStore.notify('Este marco es exclusivo para Administradores', '🔒')
    } else if (style.requiredClass) {
      const className = style.requiredClass.toUpperCase()
      if (gameStore.state.playerClass !== style.requiredClass) {
        uiStore.notify(`Este marco es exclusivo para la profesión ${className}`, '🔒')
      } else {
        uiStore.notify(`Este marco requiere profesión ${className} Nivel 25`, '🔒')
      }
    } else if (style.requiredFaction) {
      const factionName = style.requiredFaction === 'union' ? 'UNIÓN' : 'PODER'
      uiStore.notify(`Este marco es exclusivo para miembros del Team ${factionName}`, '🔒')
    }
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
        🔴 Circulares
      </button>
      <button 
        type="button"
        class="filter-tab-btn" 
        :class="{ active: activeShapeFilter === 'square' }"
        @click.stop="activeShapeFilter = 'square'"
      >
        🟦 Cuadrados
      </button>
    </div>
    
    <div class="styles-grid">
      <div
        v-for="style in filteredAvatarStyles"
        :key="style.id"
        class="style-card avatar-item"
        :class="{ 
          active: cosmeticsStore.equippedAvatarStyle === style.id,
          locked: isAvatarLocked(style),
          unlocked: !isAvatarLocked(style) && (style.requiredRole || style.requiredClass || style.requiredFaction)
        }"
        @click.stop="selectAvatar(style)"
      >
        <div class="avatar-preview-box">
          <TrainerAvatar
            :size="64"
            :avatar-style="style.class"
            :player-class="gameStore.state.playerClass"
            :level="gameStore.state.trainerLevel"
            :gender="gameStore.state.gender"
          />
        </div>
        <div class="style-meta">
          <span class="style-name">{{ style.name }}</span>
          <span
            v-if="isAvatarLocked(style)"
            class="lock-tag locked"
            :class="[style.requiredClass, style.requiredFaction]"
          >
            🔒 {{ style.requiredRole ? 'ADMIN' : (style.requiredClass ? `${style.requiredClass.toUpperCase()} (NIVEL 25)` : (style.requiredFaction ? `TEAM ${style.requiredFaction.toUpperCase()}` : '')) }}
          </span>
          <span
            v-else-if="style.requiredRole || style.requiredClass || style.requiredFaction"
            v-gsap-loop="{ effect: 'pulse-shadow', color: 'rgba(74, 222, 128, 0.4)', boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)', duration: 2 }"
            class="lock-tag unlocked"
            :class="[style.requiredClass, style.requiredFaction]"
          >
            🔓 {{ style.requiredRole ? 'ADMIN' : (style.requiredClass ? `${style.requiredClass.toUpperCase()} (NIVEL 25)` : (style.requiredFaction ? `TEAM ${style.requiredFaction.toUpperCase()}` : '')) }}
          </span>
          <span
            v-if="cosmeticsStore.equippedAvatarStyle === style.id"
            class="status-tag"
          >EQUIPADO</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@import "@/styles/components/_cosmetics-shared.scss";

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
