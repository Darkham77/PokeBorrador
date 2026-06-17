<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCosmeticsStore } from '@/stores/player/cosmetics'
import { useProfileStore } from '@/stores/player/profile'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import AvatarFrameSelector from '@/components/modals/AvatarFrameSelector.vue'

interface NickStyle {
  id: string
  name: string
  class: string
  requiredRole?: string
  requiredClass?: string
  requiredFaction?: string
}

const uiStore = useUIStore()
const cosmeticsStore = useCosmeticsStore()
const profileStore = useProfileStore()
const gameStore = useGameStore()
const authStore = useAuthStore()

const isOpen = computed(() => uiStore.isCosmeticsModalOpen)

const closeCosmetics = () => {
  uiStore.isCosmeticsModalOpen = false
}

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

const isNickLocked = (style: NickStyle) => {
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

const selectNick = (style: NickStyle) => {
  if (isNickLocked(style)) {
    if (style.requiredRole) {
      uiStore.notify('Este estilo es exclusivo para Administradores', '🔒')
    } else if (style.requiredClass) {
      const className = style.requiredClass.toUpperCase()
      if (gameStore.state.playerClass !== style.requiredClass) {
        uiStore.notify(`Este estilo es exclusivo para la profesión ${className}`, '🔒')
      } else {
        uiStore.notify(`Este estilo requiere profesión ${className} Nivel 25`, '🔒')
      }
    } else if (style.requiredFaction) {
      const factionName = style.requiredFaction === 'union' ? 'UNIÓN' : 'PODER'
      uiStore.notify(`Este estilo es exclusivo para miembros del Team ${factionName}`, '🔒')
    }
    return
  }
  cosmeticsStore.equipNickStyle(style.id)
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    title="VESTIDOR COSMÉTICO"
    max-width="650px"
    :z-index="12000"
    variant="retro"
    @close="closeCosmetics"
  >
    <div class="cosmetics-modal-internal">
      <!-- Nick Styles -->
      <section class="style-section">
        <div class="section-header">
          <h3>Estilos de Nick</h3>
          <span class="badge">CHAT & PERFIL</span>
        </div>
        <p class="section-desc">
          Personalizá cómo los demás ven tu nombre.
        </p>
        
        <div class="styles-grid">
          <div
            v-for="style in cosmeticsStore.allNickStyles"
            :key="style.id"
            class="style-card"
            :class="{ 
              active: cosmeticsStore.equippedNickStyle === style.id,
              locked: isNickLocked(style),
              unlocked: !isNickLocked(style) && (style.requiredRole || style.requiredClass || style.requiredFaction)
            }"
            @click.stop="selectNick(style)"
          >
            <div class="preview-area">
              <span
                v-gsap-nick="style.class"
                class="preview-nick"
                :class="style.class"
              >{{ profileStore.profileData.username || 'Entrenador' }}</span>
            </div>
            <div class="style-meta">
              <span class="style-name">{{ style.name }}</span>
              <span
                v-if="isNickLocked(style)"
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
                v-if="cosmeticsStore.equippedNickStyle === style.id"
                class="status-tag"
              >EQUIPADO</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Avatar Styles -->
      <AvatarFrameSelector />
    </div>

    <template #footer>
      <div class="modal-footer-internal">
        <p>Los cambios se guardan instantáneamente en tu perfil de Supabase.</p>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.cosmetics-modal-internal {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.style-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    h3 { font-size: 18px; color: var(--white); font-weight: 700; }
    .badge {
      font-size: 9px;
      background: Rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
      color: Rgba(148, 163, 184, 1);
      font-weight: 800;
    }
  }
  .section-desc {
    font-size: 13px;
    color: $muted;
    margin-bottom: 24px;
  }
}

.styles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.style-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  will-change: transform, filter;
  position: relative;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    transform: Translatey(-4px);
    border-color: Rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: Rgba(59, 130, 246, 0.08);
    border-color: Rgba(59, 130, 246, 1);
    box-shadow: 0 0 20px Rgba(59, 130, 246, 0.15);
  }

  &.locked {
    opacity: 0.6;
    filter: Grayscale(0.85);
    cursor: not-allowed;
    background: Rgba(0, 0, 0, 0.25);
    border-color: Rgba(255, 255, 255, 0.03);
    
    &:hover {
      transform: none;
      background: Rgba(0, 0, 0, 0.25);
      border-color: Rgba(255, 255, 255, 0.03);
    }
  }

  .preview-area {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .preview-nick {
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }

  .style-meta {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    
    .style-name {
      display: block;
      font-size: 11px;
      color: Rgba(148, 163, 184, 1);
      font-weight: 600;
    }
    
    .status-tag {
      font-size: 9px;
      color: Rgba(59, 130, 246, 1);
      font-weight: 800;
      display: block;
    }

    .lock-tag {
      font-size: 8px;
      font-weight: 800;
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;

      &.locked {
        color: #ef4444;
        background: Rgba(239, 68, 68, 0.1);
        border: 1px solid Rgba(239, 68, 68, 0.25);
      }

      &.unlocked {
        color: #4ade80;
        background: Rgba(34, 197, 94, 0.15);
        border: 1px solid Rgba(34, 197, 94, 0.3);
      }

      &.cazabichos {
        color: #22c55e !important;
        background: Rgba(34, 197, 94, 0.1) !important;
        border: 1px solid Rgba(34, 197, 94, 0.3) !important;
      }

      &.criador {
        color: #a855f7 !important;
        background: Rgba(168, 85, 247, 0.1) !important;
        border: 1px solid Rgba(168, 85, 247, 0.3) !important;
      }

      &.rocket {
        color: #ef4444 !important;
        background: Rgba(239, 68, 68, 0.1) !important;
        border: 1px solid Rgba(239, 68, 68, 0.3) !important;
      }

      &.entrenador {
        color: #3b82f6 !important;
        background: Rgba(59, 130, 246, 0.1) !important;
        border: 1px solid Rgba(59, 130, 246, 0.3) !important;
      }

      &.union {
        color: #00d2ff !important;
        background: Rgba(0, 210, 255, 0.15) !important;
        border: 1px solid Rgba(0, 210, 255, 0.3) !important;
      }

      &.poder {
        color: #ff3300 !important;
        background: Rgba(255, 51, 0, 0.15) !important;
        border: 1px solid Rgba(255, 51, 0, 0.3) !important;
      }
    }
  }
}

.modal-footer-internal {
  text-align: center;
  p { font-size: 11px; color: Rgba(71, 85, 105, 1); }
}
</style>
