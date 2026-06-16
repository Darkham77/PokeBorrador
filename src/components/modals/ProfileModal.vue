<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { usePlayerClassStore } from '@/stores/playerClass'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { Z_LAYERS } from '@/logic/constants/visuals'
import { useModalStore } from '@/stores/modals'
import { useTrainerProfile } from '@/components/modals/useTrainerProfile'
import { useStatHover } from '@/composables/useStatHover'

// Components
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import ProfileStatsGrid from '@/components/profile/ProfileStatsGrid.vue'
import ProfileNotifications from '@/components/profile/ProfileNotifications.vue'
import ProfileTradeNotifs from '@/components/profile/ProfileTradeNotifs.vue'
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue'
import ProfileAchievementsGrid from '@/components/profile/ProfileAchievementsGrid.vue'
import ProfilePokedexCard from '@/components/profile/ProfilePokedexCard.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'

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

const {
  playtimeHours,
  createdAt,
  rankedMaxElo,
  boxCount,
  longestStreak,
  shinyCount,
  maxDamage,
  totalBattles,
  tradeVolume,
  captureEfficiency,
  faction,
  playerClass,
  criminality,
  reputation,
  captureStreak,
  totalWarPoints,
  warCoins,
  pokedexCaught,
  pokedexSeen
} = useTrainerProfile(() => authStore.user?.id)

const formatNum = (num: number | string | unknown) => formatCurrency(Number(num || 0))

const formatDate = (isoStr: string | null | undefined) => {
  if (!isoStr) return '---'
  try {
    const inst = Temporal.Instant.from(isoStr)
    const zdt = inst.toZonedDateTimeISO(GAME_TIMEZONE)
    const day = String(zdt.day).padStart(2, '0')
    const month = String(zdt.month).padStart(2, '0')
    const year = zdt.year
    return `${day}/${month}/${year}`
  } catch (_) {
    return '---'
  }
}

const { handleStatEnter, handleStatLeave } = useStatHover()

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

const handleAvatarEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1.05,
    duration: 0.2,
    ease: 'power2.out'
  })
}

const handleAvatarLeave = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1,
    duration: 0.2,
    ease: 'power2.out'
  })
}

const handleFactionChoice = () => {
  uiStore.open('FactionChoice')
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
          <div 
            class="avatar-wrap"
            @click.stop="handleEditProfile"
            @mouseenter="handleAvatarEnter"
            @mouseleave="handleAvatarLeave"
          >
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
                >
                  {{ displayUsername }}
                  <span
                    class="gender-symbol"
                    :class="gs.gender === 'm' ? 'female' : 'male'"
                  >
                    {{ gs.gender === 'm' ? '♀' : '♂' }}
                  </span>
                </span>
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
              <span class="value email-val">{{ authStore.user?.email || profileData.email }}</span>
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
        <ProfileXpCard
          title="Nivel y Experiencia Cuenta"
          :hide-unlocks="true"
        />

        <ProfileXpCard 
          v-if="classStore.playerClass && classStore.playerClass !== 'none' && classStore.playerClass !== 'undefined' && classStore.currentClassDef"
          :level="classStore.classLevel"
          :exp="classStore.classXP"
          :exp-needed="classStore.classXPNeeded"
          :class-id="classStore.playerClass"
          :class-color="classStore.currentClassDef?.color"
          :title="`Nivel y Experiencia Clase (${classStore.currentClassDef?.name})`"
        />

        <!-- Pokedex Progress -->
        <ProfilePokedexCard 
          :pokedex-caught="pokedexCaught" 
          :pokedex-seen="pokedexSeen" 
        />



        <!-- Stats Grid -->
        <ProfileStatsGrid 
          :stats="profileData.stats" 
          :level="gs.trainerLevel || profileData.level"
          :badges="gs.badges || profileData.badges"
          :money="gs.money || profileData.money"
          :battle-coins="gs.battleCoins || profileData.battleCoins"
        />

        <!-- Faction War Contribution -->
        <div
          v-if="faction"
          class="profile-section-card war-card"
        >
          <div class="section-label">
            GUERRA DE BANDOS
          </div>
          <div class="stats-grid">
            <div
              class="stat-item highlight-war-points"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val">
                <i class="fas fa-shield-alt icon-war" />
                {{ formatNum(totalWarPoints) }}
              </span>
              <span class="stat-lbl">Puntos de Guerra</span>
            </div>
            <div
              class="stat-item highlight-war-coins"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val">
                <i class="fas fa-coins icon-war-coin" />
                {{ formatNum(warCoins) }}
              </span>
              <span class="stat-lbl">Monedas de Guerra</span>
            </div>
          </div>
        </div>

        <!-- Class Custom Details -->
        <div
          v-if="playerClass"
          class="profile-section-card class-details-card"
        >
          <div class="section-label">
            ESPECIALIZACIÓN DE CLASE
          </div>
          <div class="stats-grid">
            <div
              v-if="playerClass === 'rocket'"
              class="stat-item"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val danger-text">{{ criminality }}%</span>
              <span class="stat-lbl">Criminalidad</span>
            </div>
            <div
              v-else-if="playerClass === 'entrenador'"
              class="stat-item"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val primary-text">{{ reputation }}</span>
              <span class="stat-lbl">Reputación</span>
            </div>
            <div
              class="stat-item"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val yellow-text">{{ captureStreak }}</span>
              <span class="stat-lbl">Mayor Racha</span>
            </div>
          </div>
        </div>

        <!-- Historial de Actividad -->
        <div class="profile-section-card activity-card">
          <div class="section-label">
            HISTORIAL DE ACTIVIDAD
          </div>
          <div class="stats-grid">
            <div
              class="stat-item"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val yellow-text">{{ playtimeHours }}h</span>
              <span class="stat-lbl">Tiempo Jugado</span>
            </div>
            <div
              class="stat-item"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val">{{ formatDate(createdAt) }}</span>
              <span class="stat-lbl">Miembro Desde</span>
            </div>
            <div
              class="stat-item"
              @mouseenter="handleStatEnter"
              @mouseleave="handleStatLeave"
            >
              <span class="stat-val">Activo Ahora</span>
              <span class="stat-lbl">Última Partida</span>
            </div>
          </div>
        </div>

        <!-- Logros de Entrenador -->
        <ProfileAchievementsGrid
          :ranked-max-elo="rankedMaxElo"
          :box-count="boxCount"
          :shiny-count="shinyCount"
          :longest-streak="longestStreak"
          :max-damage="maxDamage"
          :total-battles="totalBattles"
          :trade-volume="tradeVolume"
          :capture-efficiency="captureEfficiency"
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
  padding: 16px 0 0;
  background: transparent;
  border: none;

  .avatar-wrap {
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    z-index: calc(v-bind('Z_LAYERS.BASE') + 1);
    border-radius: 50%;
    cursor: pointer;
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

        &.email-val {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 11px;
        }

        &.name-val {
          font-size: 14px;
          font-weight: bold;
          overflow: visible;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        &.class-val {
          font-weight: bold;
          text-transform: uppercase;
          @include pixelated;
        }

        .gender-symbol {
          font-family: inherit;
          font-size: 14px;
          font-weight: bold;
          margin-left: 4px;
          
          &.male {
            color: Rgba(59, 139, 255, 1);
            text-shadow: 0 0 5px Rgba(59, 139, 255, 0.5);
          }
          
          &.female {
            color: Rgba(255, 110, 255, 1);
            text-shadow: 0 0 5px Rgba(255, 110, 255, 0.5);
          }
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

/* Stats grids */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  @include gpu-layer;

  &.pvp {
    background: linear-gradient(135deg, Rgba(236, 72, 153, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(236, 72, 153, 0.2);

    .stat-val.ELO {
      color: #f472b6;
      text-shadow: 0 0 10px Rgba(236, 72, 153, 0.4);
    }
  }

  &.highlight-war-points {
    background: linear-gradient(135deg, Rgba(59, 130, 246, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(59, 130, 246, 0.2);

    .stat-val, .icon-war {
      color: #60a5fa;
      text-shadow: 0 0 10px Rgba(59, 130, 246, 0.4);
    }
  }

  &.highlight-war-coins {
    background: linear-gradient(135deg, Rgba(251, 191, 36, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(251, 191, 36, 0.2);

    .stat-val, .icon-war-coin {
      color: #fbbf24;
      text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4);
    }
  }
}

.stat-val {
  @include pixelated;
  font-size: 14px;
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stat-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Colors & Helpers */
.danger-text { color: #f87171 !important; text-shadow: 0 0 10px Rgba(239, 68, 68, 0.4); }
.primary-text { color: #60a5fa !important; text-shadow: 0 0 10px Rgba(59, 130, 246, 0.4); }
.yellow-text { color: #fbbf24 !important; text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4); }
.shiny-text { color: #fbbf24 !important; text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4); }
</style>
