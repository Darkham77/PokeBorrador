<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { usePlayerClassStore } from '@/stores/playerClass'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import ProfileStatsGrid from './profile/ProfileStatsGrid.vue'
import ProfileNotifications from './profile/ProfileNotifications.vue'
import ProfileTradeNotifs from './profile/ProfileTradeNotifs.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const classStore = usePlayerClassStore()

defineProps({
  show: { type: Boolean, default: false }
})

defineOptions({ inheritAttrs: false })
const emit = defineEmits(['close', 'confirm', 'cancel', 'submit'])

const gs = computed(() => gameStore.state)
const profileData = computed(() => profileStore.profileData)

const factionLabel = computed(() => {
  const f = gs.value.faction
  if (!f) return 'Sin Bando'
  if (f === 'union') return 'Equipo Unión'
  if (f === 'poder') return 'Equipo Poder'
  if (f === 'rocket') return 'Equipo Rocket'
  return f.toUpperCase()
})

const factionColor = computed(() => {
  const f = gs.value.faction
  if (f === 'union') return '#3b82f6'
  if (f === 'poder') return '#ef4444'
  if (f === 'rocket') return '#94a3b8'
  return '#94a3b8'
})

const trainerName = computed(() => {
  return gs.value.trainer || authStore.user?.user_metadata?.username || 'Entrenador'
})

const displayUsername = computed(() => {
  if (profileData.value.username && profileData.value.username !== '—') {
    return profileData.value.username
  }
  return trainerName.value
})

const lastSaveFormatted = computed(() => {
  if (!gs.value._last_updated) return 'Sin datos'
  const date = new Date(gs.value._last_updated)
  return date.toLocaleString('es-ES', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
})

const close = () => { emit('close') }

const handleLogout = () => {
  authStore.logout()
}

const handleEditProfile = () => {
  uiStore.open('Cosmetics')
}

const handleFactionChoice = () => {
  uiStore.open('FactionChoice')
}

const handleResetEncounter = () => {
  // Legacy logic: window.resetEncounters?.()
  if (typeof window.resetEncounters === 'function') {
    window.resetEncounters()
    uiStore.notify('Encuentros reseteados', '⚠️')
  }
}

// Expose to template
const getAssetUrlLocal = getAssetUrl
const ASSET_TYPES_LOCAL = ASSET_TYPES
</script>

<template>
  <BaseModal
    :show="show"
    title="MI PERFIL"
    title-color="var(--yellow)"
    :header-background="gs.playerClass === 'rocket' ? 'rgba(239, 68, 68, 0.15)' : (gs.playerClass === 'cazabichos' ? 'rgba(34, 197, 94, 0.15)' : (gs.playerClass === 'entrenador' ? 'rgba(59, 130, 246, 0.15)' : (gs.playerClass === 'criador' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.8)')))"
    type="side-right"
    max-width="420px"
    :show-close-button="true"
    padding="raw"
    :custom-class="'profile-modal-legacy ' + (gs.playerClass || 'default')"
    :lock-scroll="false"
    overlay="none"
    @close="close"
  >
    <section class="profile-panel-content custom-scrollbar">
      <div class="profile-body-premium">
        <!-- Identity Section -->
        <div class="profile-identity-card">
          <div class="avatar-wrap">
            <TrainerAvatar
              :player-class="gs.playerClass"
              :level="gs.trainerLevel"
              :avatar-style="gs.avatar_style"
              :size="120"
            />
          </div>
          <div 
            id="profile-username"
            class="profile-username"
          >
            {{ displayUsername }}
          </div>
          <div
            id="profile-email"
            class="profile-email"
          >
            {{ authStore.user?.email || profileData.email }}
          </div>
          <div
            v-if="classStore.currentClassDef"
            class="profile-profession"
            :style="{ color: classStore.currentClassDef.color }"
          >
            {{ classStore.currentClassDef.name }}
          </div>
        </div>

        <!-- Faction -->
        <div class="profile-section-card faction-card">
          <div class="section-label">
            BANDO
          </div>
          <div class="faction-row">
            <div
              id="player-faction-badge"
              class="faction-badge"
              :style="{ color: factionColor }"
            >
              <img
                v-if="gs.faction"
                :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, gs.faction)"
                class="faction-img"
                @error="e => e.target.style.display = 'none'"
              >
              {{ factionLabel }}
            </div>
            <a
              id="change-faction-btn"
              href="#"
              class="change-link"
              @click.prevent="handleFactionChoice"
            >
              🔗 {{ gs.faction ? 'CAMBIAR' : 'ELEGIR' }}
            </a>
          </div>
        </div>

        <!-- Stats Grid -->
        <ProfileStatsGrid 
          :stats="profileData.stats" 
          :level="gs.trainerLevel || profileData.level"
          :badges="gs.badges || profileData.badges"
          :money="gs.money || profileData.money"
          :battle-coins="gs.battleCoins || profileData.battleCoins"
        />

        <!-- Save Info -->
        <div class="profile-section-card save-card">
          <div class="section-label">
            GUARDADO
          </div>
          <div class="save-row">
            <span class="save-status">{{ lastSaveFormatted }}</span>
          </div>
        </div>

        <!-- Notifications -->
        <ProfileNotifications :history="profileData.notificationHistory || []" />

        <!-- Trade Notifications -->
        <ProfileTradeNotifs />

        <!-- Action Buttons -->
        <div class="profile-actions-legacy">
          <button
            class="logout-btn-legacy"
            @click="handleLogout"
          >
            🚪 CERRAR SESIÓN
          </button>
          <button
            class="edit-btn-legacy"
            @click="handleEditProfile"
          >
            ✏️ Editar
          </button>
          <div class="reset-wrap-legacy">
            <button
              class="reset-btn-legacy"
              @click="handleResetEncounter"
            >
              ⚠️ RESETEAR ENCUENTROS
            </button>
            <div class="hint-text-legacy">
              Si solo te aparecen entrenadores, usa este botón.
            </div>
          </div>
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.profile-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  -webkit-backdrop-filter: Blur(12px); -webkit-backdrop-filter: Blur(12px); backdrop-filter: Blur(12px);
  @include gpu-layer;
  
  // Custom backgrounds by class fading to transparent
  .rocket & { background: linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, transparent 60%); }
  .cazabichos & { background: linear-gradient(180deg, rgba(34, 197, 94, 0.15) 0%, transparent 60%); }
  .entrenador & { background: linear-gradient(180deg, rgba(59, 130, 246, 0.15) 0%, transparent 60%); }
  .criador & { background: linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, transparent 60%); }
}

.profile-header-premium {
  display: none;
}

.profile-body-premium {
  padding: 0 24px 40px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  @include smooth-scroll;
}

.profile-identity-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 20px;
  background: transparent;
  border: none;

  .avatar-wrap {
    margin-bottom: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    
    // Legacy Elemental Aura Restorations
    :deep(.trainer-avatar-container) {
      border: 2px solid var(--yellow) !important;
      box-shadow: 0 0 10px rgba(0,0,0,0.5) !important;

      &.av-fire {
        border-color: #ff4400 !important;
        box-shadow: 0 0 0 3px #ff4400, 0 0 0 5px rgba(255, 136, 0, 0.4), 0 0 16px rgba(255, 68, 0, 0.5) !important;
        &::before {
          content: ''; position: absolute; inset: -8px; border-radius: 50%;
          background: conic-gradient(#ff0000,#ff8800,#ffcc00,#ff4400,#ff0000);
          z-index: -1; animation: spin-slow 2s linear infinite;
        }
      }
      
      &.av-water {
        border-color: #0088ff !important;
        box-shadow: 0 0 0 3px #0088ff, 0 0 0 5px rgba(0, 170, 255, 0.3), 0 0 14px rgba(0, 102, 255, 0.4) !important;
        &::before {
          content: ''; position: absolute; inset: -9px; border-radius: 50%;
          background: conic-gradient(#0033cc,#00aaff,#44eeff,#0066ff,#0033cc);
          z-index: -1; animation: spin-slow 4s linear infinite;
        }
      }

      &.av-legend {
        border-color: #ffdd00 !important;
        box-shadow: 0 0 0 3px #ffdd00, 0 0 18px rgba(255, 170, 0, 0.5) !important;
        &::before {
          content: ''; position: absolute; inset: -10px; border-radius: 50%;
          background: conic-gradient(#ff0000,#ff8800,#ffff00,#00ff88,#00ffff,#0088ff,#ff00ff,#ff0000);
          z-index: -1; animation: spin-slow 2s linear infinite;
        }
      }
    }
  }

  @keyframes spin-slow { from{transform:Rotate(0deg)} to{transform:Rotate(360deg)} }

  .profile-username {
    font-family: 'Press Start 2P', cursive;
    font-size: 16px;
    color: var(--yellow);
    margin-bottom: 12px;
    @include pixelated;
  }

  .profile-email {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    @include pixelated;
    margin-bottom: 8px;
  }

  .profile-profession {
    font-size: 10px;
    font-family: 'Press Start 2P', cursive;
    text-transform: uppercase;
    @include pixelated;
  }
}

.profile-section-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .section-label {
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 16px;
    letter-spacing: 1px;
    @include pixelated;
  }
}

.faction-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .faction-badge {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
    font-size: 14px;

    .faction-img {
      width: 24px;
      height: 24px;
    }
  }

  .change-link {
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    color: var(--yellow);
    text-decoration: none;
    @include pixelated;
    
    &:hover { text-decoration: underline; }
  }
}

.save-row {
  .save-status {
    @include pixelated;
    font-size: 12px;
    color: $white;
    @include pixelated;
  }
}

.profile-actions-legacy {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  button {
    width: 100%;
    padding: 16px;
    border-radius: 16px;
    border: none;
    font-family: 'Press Start 2P', cursive;
    font-size: 9px;
    cursor: pointer;
    transition: all 0.2s;
    @include pixelated;
  }

  .logout-btn-legacy {
    @include btn-vicio-danger;
    padding: 16px;
    font-size: 9px;
  }

  .edit-btn-legacy {
    background: rgba(255, 255, 255, 0.05);
    color: $white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    @include hover-neon-yellow(1px);
    &:hover { background: rgba(255, 255, 255, 0.1); }
  }

  .reset-wrap-legacy {
    margin-top: 12px;
    text-align: center;
    .reset-btn-legacy {
      background: transparent;
      color: rgba(255, 255, 255, 0.2);
      font-size: 8px;
      &:hover { color: #f59e0b; }
    }
    .hint-text-legacy {
      margin-top: 8px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.2);
    }
  }
}

.profile-modal-legacy {
  border-left: 2px solid rgba(255, 255, 255, 0.05) !important;
  
  :deep(.modal-scrollable-content) {
    background: transparent !important;
  }
}

</style>
