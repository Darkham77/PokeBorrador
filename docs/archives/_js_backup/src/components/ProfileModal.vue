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
  if (f === 'union') return 'Rgba(59, 130, 246, 1)'
  if (f === 'poder') return 'Rgba(239, 68, 68, 1)'
  if (f === 'rocket') return 'Rgba(148, 163, 184, 1)'
  return 'Rgba(148, 163, 184, 1)'
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
    :header-background="gs.playerClass === 'rocket' ? 'Rgba(239, 68, 68, 0.15)' : (gs.playerClass === 'cazabichos' ? 'Rgba(34, 197, 94, 0.15)' : (gs.playerClass === 'entrenador' ? 'Rgba(59, 130, 246, 0.15)' : (gs.playerClass === 'criador' ? 'Rgba(168, 85, 247, 0.15)' : 'Rgba(15, 23, 42, 0.8)')))"
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
              @click.prevent.stop="handleFactionChoice"
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
            @click.stop="handleLogout"
          >
            🚪 CERRAR SESIÓN
          </button>
          <button
            class="edit-btn-legacy"
            @click.stop="handleEditProfile"
          >
            ✏️ Editar
          </button>
          <div class="reset-wrap-legacy">
            <button
              class="reset-btn-legacy"
              @click.stop="handleResetEncounter"
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
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.profile-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  -webkit-backdrop-filter: Blur(12px);
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  
  // Custom backgrounds by class fading to transparent
  .rocket & { background: Linear-Gradient(180deg, Rgba(239, 68, 68, 0.15) 0%, transparent 60%); }
  .cazabichos & { background: Linear-Gradient(180deg, Rgba(34, 197, 94, 0.15) 0%, transparent 60%); }
  .entrenador & { background: Linear-Gradient(180deg, Rgba(59, 130, 246, 0.15) 0%, transparent 60%); }
  .criador & { background: Linear-Gradient(180deg, Rgba(168, 85, 247, 0.15) 0%, transparent 60%); }
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
    :Deep(.trainer-avatar-container) {
      border: 2px solid Var(--yellow) !important;
      box-shadow: 0 0 10px Rgba(0,0,0,0.5) !important;

      &.av-fire {
        border-color: Rgba(255, 68, 0, 1) !important;
        box-shadow: 0 0 0 3px Rgba(255, 68, 0, 1), 0 0 0 5px Rgba(255, 136, 0, 0.4), 0 0 16px Rgba(255, 68, 0, 0.5) !important;
        &::before {
          content: ''; position: absolute; inset: -8px; border-radius: 50%;
          background: conic-Gradient(Rgba(255, 0, 0, 1),Rgba(255, 136, 0, 1),Rgba(255, 204, 0, 1),Rgba(255, 68, 0, 1),Rgba(255, 0, 0, 1));
          z-index: -1; animation: spin-slow 2s linear infinite;
        }
      }
      
      &.av-water {
        border-color: Rgba(0, 136, 255, 1) !important;
        box-shadow: 0 0 0 3px Rgba(0, 136, 255, 1), 0 0 0 5px Rgba(0, 170, 255, 0.3), 0 0 14px Rgba(0, 102, 255, 0.4) !important;
        &::before {
          content: ''; position: absolute; inset: -9px; border-radius: 50%;
          background: conic-Gradient(Rgba(0, 51, 204, 1),Rgba(0, 170, 255, 1),Rgba(68, 238, 255, 1),Rgba(0, 102, 255, 1),Rgba(0, 51, 204, 1));
          z-index: -1; animation: spin-slow 4s linear infinite;
        }
      }

      &.av-legend {
        border-color: Rgba(255, 221, 0, 1) !important;
        box-shadow: 0 0 0 3px Rgba(255, 221, 0, 1), 0 0 18px Rgba(255, 170, 0, 0.5) !important;
        &::before {
          content: ''; position: absolute; inset: -10px; border-radius: 50%;
          background: conic-Gradient(Rgba(255, 0, 0, 1),Rgba(255, 136, 0, 1),Rgba(255, 255, 0, 1),Rgba(0, 255, 136, 1),Rgba(0, 255, 255, 1),Rgba(0, 136, 255, 1),Rgba(255, 0, 255, 1),Rgba(255, 0, 0, 1));
          z-index: -1; animation: spin-slow 2s linear infinite;
        }
      }
    }
  }

  @keyframes spin-slow { from{transform:Rotate(0deg)} to{transform:Rotate(360deg)} }

  .profile-username {
    @include pixelated;
    font-size: 16px;
    color: Var(--yellow);
    margin-bottom: 12px;
    @include pixelated;
  }

  .profile-email {
    font-size: 12px;
    color: Rgba(255, 255, 255, 0.4);
    @include pixelated;
    margin-bottom: 8px;
  }

  .profile-profession {
    font-size: 10px;
    @include pixelated;
    text-transform: uppercase;
    @include pixelated;
  }
}

.profile-section-card {
  padding: 20px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .section-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.3);
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
    @include pixelated;
    font-size: 8px;
    color: Var(--yellow);
    text-decoration: none;
    @include pixelated;
    
    &:hover { text-decoration: underline; }
  }
}

.save-row {
  .save-status {
    @include pixelated;
    font-size: 12px;
    color: Var(--white);
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
    @include pixelated;
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
    background: Rgba(255, 255, 255, 0.05);
    color: Var(--white);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    @include hover-neon-Yellow(1px);
    &:hover { background: Rgba(255, 255, 255, 0.1); }
  }

  .reset-wrap-legacy {
    margin-top: 12px;
    text-align: center;
    .reset-btn-legacy {
      background: transparent;
      color: Rgba(255, 255, 255, 0.2);
      font-size: 8px;
      &:hover { color: Rgba(245, 158, 11, 1); }
    }
    .hint-text-legacy {
      margin-top: 8px;
      font-size: 10px;
      color: Rgba(255, 255, 255, 0.2);
    }
  }
}

.profile-modal-legacy {
  border-left: 2px solid Rgba(255, 255, 255, 0.05) !important;
  
  :Deep(.modal-scrollable-content) {
    background: transparent !important;
  }
}

</style>
