<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { usePlayerClassStore, type ClassDefinition } from '@/stores/playerClass'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { Z_LAYERS } from '@/logic/constants/visuals'
import { useModalStore } from '@/stores/modals'
import gsap from 'gsap'
import { PLAYER_CLASSES, CLASS_MISSIONS } from '@/data/playerClasses'

// Components
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import ProfileStatsGrid from '@/components/profile/ProfileStatsGrid.vue'
import ProfileNotifications from '@/components/profile/ProfileNotifications.vue'
import ProfileTradeNotifs from '@/components/profile/ProfileTradeNotifs.vue'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

defineOptions({ inheritAttrs: false })
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'submit'): void
}>()

const uiStore = useUIStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const classStore = usePlayerClassStore()

const gs = computed(() => gameStore.state)
const profileData = computed(() => profileStore.profileData)

const trainerExpPct = computed(() => {
  const needed = gs.value.trainerExpNeeded || 0
  if (needed === 0) return 0
  return Math.min(100, ((gs.value.trainerExp || 0) / needed) * 100)
})

const xpRemaining = computed(() => {
  const needed = gs.value.trainerExpNeeded || 0
  return Math.max(0, needed - (gs.value.trainerExp || 0))
})

const nextLevel = computed(() => {
  return (gs.value.trainerLevel || 1) + 1
})

const nextClassUnlocks = computed(() => {
  const currentClassId = gs.value.playerClass
  const currentLevel = gs.value.trainerLevel || 1
  if (!currentClassId) return []

  const classDef = (PLAYER_CLASSES as Record<string, ClassDefinition>)[currentClassId]
  if (!classDef) return []

  const unlocks: { level: number; desc: string; type: 'bonus' | 'mission' }[] = []

  // 1. Class bonuses
  if (classDef.bonuses && classDef.bonusLevels) {
    const levels = classDef.bonusLevels
    classDef.bonuses.forEach((bonus: string, index: number) => {
      const reqLv = levels[index]
      if (reqLv !== undefined && reqLv > currentLevel) {
        unlocks.push({
          level: reqLv,
          desc: bonus,
          type: 'bonus'
        })
      }
    })
  }

  // 2. Idle missions
  CLASS_MISSIONS.forEach(mission => {
    if (mission.reqLv > currentLevel) {
      unlocks.push({
        level: mission.reqLv,
        desc: mission.name,
        type: 'mission'
      })
    }
  })

  // Sort by level ascending
  return unlocks.sort((a, b) => a.level - b.level)
})

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
  return profileData.value.lastSave || 'Sin datos'
})

const modalStore = useModalStore()

const openRename = () => {
  modalStore.open('Rename')
}

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

const xpBarRef = ref<HTMLElement | null>(null)
let stripesTween: gsap.core.Tween | null = null
let widthTween: gsap.core.Tween | null = null

const initXpBarAnimation = () => {
  if (xpBarRef.value) {
    // Animate the stripes infinitely using GSAP
    stripesTween = gsap.to(xpBarRef.value, {
      backgroundPositionX: '20px',
      duration: 2,
      ease: 'none',
      repeat: -1
    })

    // Animate the width to the initial percentage
    gsap.set(xpBarRef.value, { width: '0%' })
    widthTween = gsap.to(xpBarRef.value, {
      width: `${trainerExpPct.value}%`,
      duration: 0.8,
      ease: 'power2.out'
    })
  }
}

onMounted(() => {
  initXpBarAnimation()
})

onUnmounted(() => {
  if (stripesTween) stripesTween.kill()
  if (widthTween) widthTween.kill()
})

// Watch for XP changes to animate width changes smoothly
watch(trainerExpPct, (newPct) => {
  if (xpBarRef.value) {
    if (widthTween) widthTween.kill()
    widthTween = gsap.to(xpBarRef.value, {
      width: `${newPct}%`,
      duration: 0.5,
      ease: 'power2.out'
    })
  }
})

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
              :avatar-style="gs.avatar_style || undefined"
              :size="120"
              :gender="gs.gender || 'h'"
            />
          </div>
          <div class="identity-details-card">
            <!-- Nombre -->
            <div class="detail-row name-row">
              <span class="label">NOMBRE:</span>
              <div class="value-wrap">
                <span
                  v-gsap-nick="gs.nick_style || 'normal'"
                  :class="gs.nick_style || 'normal'"
                  class="value name-val"
                >{{ displayUsername }}</span>
              </div>
              <button
                class="row-action-btn"
                @click.prevent.stop="openRename"
              >
                CAMBIAR
              </button>
            </div>

            <!-- Email -->
            <div class="detail-row">
              <span class="label">EMAIL:</span>
              <span class="value">{{ authStore.user?.email || profileData.email }}</span>
              <div class="row-spacer" />
            </div>

            <!-- Clase -->
            <div class="detail-row">
              <span class="label">CLASE:</span>
              <span 
                class="value class-val"
                :style="{ color: classStore.currentClassDef?.color }"
              >
                {{ classStore.currentClassDef?.name || 'SIN CLASE' }}
              </span>
              <button
                class="row-action-btn"
                @click.prevent.stop="modalStore.open(classStore.playerClass ? 'ClassMissions' : 'ClassSelection')"
              >
                {{ classStore.playerClass ? 'GESTIONAR' : 'ELEGIR' }}
              </button>
            </div>

            <!-- Bando -->
            <div class="detail-row">
              <span class="label">BANDO:</span>
              <div class="value-wrap">
                <img
                  v-if="gs.faction"
                  :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, gs.faction)"
                  class="faction-img-mini"
                  @error="(e: Event) => { if (e.target) (e.target as HTMLImageElement).style.display = 'none' }"
                >
                <span 
                  class="value class-val"
                  :style="{ color: factionColor }"
                >
                  {{ factionLabel }}
                </span>
              </div>
              <button
                class="row-action-btn"
                @click.prevent.stop="handleFactionChoice"
              >
                {{ gs.faction ? 'CAMBIAR' : 'ELEGIR' }}
              </button>
            </div>
          </div>

          <div class="identity-actions-row">
            <button
              class="cosmetics-btn"
              @click.stop="handleEditProfile"
            >
              <i class="fas fa-paint-brush" /> CAMBIAR COSMETICOS
            </button>
            <button
              class="class-mgmt-btn"
              @click.stop="modalStore.open(classStore.playerClass ? 'ClassMissions' : 'ClassSelection')"
            >
              <i class="fas fa-graduation-cap" /> GESTIÓN DE CLASE
            </button>
          </div>
        </div>

        <!-- Experiencia -->
        <div class="profile-section-card xp-card">
          <div class="section-label">
            NIVEL Y EXPERIENCIA
          </div>
          <div class="xp-details">
            <div class="xp-numbers">
              <span class="xp-current">{{ gs.trainerExp || 0 }} / {{ gs.trainerExpNeeded || 100 }} EXP</span>
              <span class="xp-percent">{{ Math.round(trainerExpPct) }}%</span>
            </div>
            
            <!-- Progress Bar -->
            <div class="xp-bar-container">
              <div 
                ref="xpBarRef"
                class="xp-bar-fill"
                :style="{ backgroundColor: classStore.currentClassDef?.color || 'var(--purple)' }"
              />
            </div>
            
            <div class="xp-remaining-text">
              Faltan <strong :style="{ color: classStore.currentClassDef?.color || '#a855f7' }"> {{ xpRemaining }} EXP </strong> para el Nivel <strong>{{ nextLevel }}</strong>
            </div>
          </div>

          <!-- Unlocks Section -->
          <div 
            v-if="nextClassUnlocks.length > 0" 
            class="xp-unlocks"
          >
            <div class="unlocks-title">
              Próximos Desbloqueos de Clase:
            </div>
            <ul class="unlocks-list">
              <li 
                v-for="(unlock, index) in nextClassUnlocks.slice(0, 2)" 
                :key="index"
                class="unlock-item"
              >
                <span class="unlock-lvl">Lv.{{ unlock.level }}</span>
                <span class="unlock-desc">{{ unlock.desc }}</span>
              </li>
            </ul>
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
            <i class="fas fa-sign-out-alt" /> CERRAR SESIÓN
          </button>
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;
@use "@/styles/components/cosmetics" as *;

.profile-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  will-change: transform, filter, opacity, backdrop-filter;
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
  padding: 32px 0 0;
  background: transparent;
  border: none;

  .avatar-wrap {
    margin-bottom: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    z-index: calc(v-bind('Z_LAYERS.BASE') + 1);
    border-radius: 50%;
  }

  .identity-details-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-self: stretch;
    background: Rgba(0, 0, 0, 0.2);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 6px 14px;
    .detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid Rgba(255, 255, 255, 0.03);
      min-height: 36px;

      &:last-child {
        border-bottom: none;
      }

      &.name-row {
        min-height: 44px;
      }

      .label {
        @include pixelated;
        font-size: 8px;
        color: Rgba(255, 255, 255, 0.3);
        letter-spacing: 0.5px;
        width: 80px;
        flex-shrink: 0;
        text-align: left;
      }

      .value-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }

      .value {
        @include pixelated;
        font-size: 8px;
        color: var(--white);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;

        &.name-val {
          font-size: 14px;
          font-weight: bold;
        }

        &.class-val {
          font-weight: bold;
          text-transform: uppercase;
        }
      }

      .faction-img-mini {
        width: 16px;
        height: 16px;
        object-fit: contain;
        flex-shrink: 0;
        margin-right: 4px;
      }

      .row-action-btn {
        background: transparent;
        border: 1px solid Rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        color: var(--yellow);
        padding: 4px 8px;
        font-size: 7px;
        cursor: pointer;
        @include pixelated;
        flex-shrink: 0;
        
        &:hover {
          background: Rgba(255, 255, 255, 0.05);
          border-color: var(--yellow);
        }
      }

      .row-spacer {
        width: 48px;
        flex-shrink: 0;
      }
    }
  }

  .identity-actions-row {
    display: flex;
    gap: 8px;
    width: 100%;
    margin-top: 16px;
    align-self: stretch;

    .cosmetics-btn {
      flex: 1;
      @include btn-vicio('primary', 'sm', true);
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .class-mgmt-btn {
      flex: 1;
      @include btn-vicio('secondary', 'sm', true);
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: Rgba(168, 85, 247, 0.15) !important;
      border: 2px solid Rgba(168, 85, 247, 0.4) !important;
      color: #c084fc !important;
      text-shadow: 0 0 6px Rgba(168, 85, 247, 0.4);
      
      &:hover {
        background: Rgba(168, 85, 247, 0.25) !important;
        border-color: Rgba(168, 85, 247, 0.6) !important;
        color: #d8b4fe !important;
      }
    }
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

.save-row {
  .save-status {
    @include pixelated;
    font-size: 12px;
    color: var(--white);
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
    
    @include pixelated;
  }

  .logout-btn-legacy {
    @include btn-vicio('danger', 'sm', true);
  }

  .edit-btn-legacy {
    @include btn-vicio('primary', 'sm', true);
  }

  .reset-wrap-legacy {
    margin-top: 12px;
    text-align: center;
    
    .reset-btn-legacy {
      background: transparent;
      border: 1px dashed Rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-radius: 8px;
      color: Rgba(255, 255, 255, 0.4);
      font-size: 8px;
      @include pixelated;
      cursor: pointer;
      
      
      &:hover {
        border-color: Rgba(245, 158, 11, 0.4);
        color: Rgba(245, 158, 11, 1);
        background: Rgba(245, 158, 11, 0.05);
      }
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
  
  :deep(.modal-scrollable-content) {
    background: transparent !important;
  }
}

.xp-card {
  .xp-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .xp-numbers {
    display: flex;
    justify-content: space-between;
    align-items: center;
    @include pixelated;
    font-size: 8px;
    color: var(--white);
    letter-spacing: 0.5px;
  }

  .xp-current {
    font-weight: 500;
  }

  .xp-percent {
    color: Rgba(255, 255, 255, 0.6);
  }

  .xp-bar-container {
    width: 100%;
    height: 10px;
    background: Rgba(0, 0, 0, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .xp-bar-fill {
    height: 100%;
    border-radius: 5px;
    background-image: linear-gradient(90deg, Rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, Rgba(255,255,255,0.15) 50%, Rgba(255,255,255,0.15) 75%, transparent 75%, transparent);
    background-size: 20px 20px;
  }

  .xp-remaining-text {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.6);
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;

    strong {
      font-weight: 700;
    }
  }

  .xp-unlocks {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.08);
  }

  .unlocks-title {
    font-size: 11px;
    font-weight: 600;
    color: Rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .unlocks-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unlock-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: Rgba(203, 213, 225, 0.85);
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .unlock-lvl {
    @include pixelated;
    font-size: 7px;
    background: Rgba(255, 255, 255, 0.1);
    color: var(--yellow);
    border-radius: 4px;
    padding: 2px 4px;
    font-weight: bold;
    flex-shrink: 0;
    line-height: 1;
  }

  .unlock-desc {
    font-size: 11px;
  }
}

</style>
