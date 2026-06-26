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
@use "@/styles/components/_cosmetics-shared.scss";

.cosmetics-modal-internal {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.style-card {
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
}

.modal-footer-internal {
  text-align: center;
  p { font-size: 11px; color: Rgba(71, 85, 105, 1); }
}
</style>
