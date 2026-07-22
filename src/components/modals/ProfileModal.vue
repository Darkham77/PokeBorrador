<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/player/profile'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { Z_LAYERS } from '@/logic/constants/visuals'
import { useModalStore } from '@/stores/modals'
import { useTrainerProfile } from '@/components/modals/useTrainerProfile'
import { useStatHover } from '@/composables/ui/useStatHover'

// Components
import BaseModal from '@/components/common/BaseModal.vue'
import ProfileStatsGrid from '@/components/profile/ProfileStatsGrid.vue'
import ProfileNotifications from '@/components/profile/ProfileNotifications.vue'
import ProfileTradeNotifs from '@/components/profile/ProfileTradeNotifs.vue'
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue'
import ProfileAchievementsGrid from '@/components/profile/ProfileAchievementsGrid.vue'
import ProfileFactionWarCard from './ProfileFactionWarCard.vue'
import ProfilePokedexCard from '@/components/profile/ProfilePokedexCard.vue'
import ProfileStatsSection from './ProfileStatsSection.vue'
import ProfileIdentityCard from './ProfileIdentityCard.vue'
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

const activityStats = computed(() => [
  { label: 'Tiempo Jugado', value: `${playtimeHours.value}h`, class: 'yellow-text' },
  { label: 'Miembro Desde', value: formatDate(createdAt.value) },
  { label: 'Última Partida', value: 'Activo Ahora' }
])

const classStats = computed(() => {
  const stats = []
  if (playerClass.value === 'rocket') {
    stats.push({ label: 'Criminalidad', value: `${criminality.value}%`, class: 'danger-text' })
  } else if (playerClass.value === 'entrenador') {
    stats.push({ label: 'Reputación', value: reputation.value, class: 'primary-text' })
  }
  stats.push({ label: 'Mayor Racha', value: captureStreak.value, class: 'yellow-text' })
  return stats
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
        <ProfileIdentityCard
          :gs="gs"
          :display-username="displayUsername"
          :email="authStore.user?.email || profileData.email"
          :class-store="classStore"
          :faction="faction"
          @edit-profile="handleEditProfile"
          @avatar-enter="handleAvatarEnter"
          @avatar-leave="handleAvatarLeave"
          @open-rename="openRename"
          @open-class-modal="modalStore.open(classStore.playerClass ? 'ClassMissions' : 'ClassSelection')"
          @faction-choice="handleFactionChoice"
        />

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
        <ProfileFactionWarCard
          :faction="faction"
          :total-war-points="totalWarPoints"
          :war-coins="warCoins"
          :format-num="formatNum"
          :handle-stat-enter="handleStatEnter"
          :handle-stat-leave="handleStatLeave"
        />

        <!-- Class & Activity Extra Stats -->
        <ProfileStatsSection
          :player-class="playerClass"
          :class-stats="classStats"
          :activity-stats="activityStats"
          :handle-stat-enter="handleStatEnter"
          :handle-stat-leave="handleStatLeave"
        />

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
@use "@/styles/components/_profile-shared.scss" as *;



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
</style>
