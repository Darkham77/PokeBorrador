<script setup lang="ts">
import { watch, nextTick, computed } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const SPINNER_FULL_ROTATION_DEG = 360
import { formatCurrency } from '@/logic/utils/formatters'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import ProfileStatsGrid from '@/components/profile/ProfileStatsGrid.vue'
import ProfileAchievementsGrid from '@/components/profile/ProfileAchievementsGrid.vue'
import ProfileEventStatsCard from '@/components/profile/ProfileEventStatsCard.vue'
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue'
import ProfilePokedexCard from '@/components/profile/ProfilePokedexCard.vue'
import ProfileFactionWarCard from './ProfileFactionWarCard.vue'
import ProfileStatsSection from './ProfileStatsSection.vue'
import { useTrainerProfile } from './useTrainerProfile.ts'
import { useStatHover } from '@/composables/ui/useStatHover'
import type { GymId } from '@/data/world/gyms'

interface Props {
  show?: boolean
  userId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  userId: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const modalStore = useModalStore()

const {
  loading,
  error,
  isOwnProfile,
  trainerName,
  faction,
  playerClass,
  classDef,
  trainerLevel,
  avatarStyle,
  nickStyle,
  gender,
  badgesCount,
  pokedexCaught,
  pokedexSeen,
  trainersDefeated,
  wildWins,
  warCoins,
  criminality,
  reputation,
  captureStreak,
  totalWarPoints,
  isGymDefeated,
  factionLabel,
  factionColor,
  playtimeHours,
  createdAt,
  lastPlayedAt,
  rankedMaxElo,
  classLevel,
  classXP,
  classXPNeeded,
  boxCount,
  longestStreak,
  shinyCount,
  maxDamage,
  totalBattles,
  tradeVolume,
  captureEfficiency,
  money,
  battleCoinsCount,
  eventParticipations,
  eventMedalsTotal,
  eventMedalsFirst,
  eventMedalsSecond,
  eventMedalsThird,
  saveState,
  fetchData
} = useTrainerProfile(() => props.userId)

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

const openRename = () => {
  modalStore.open('Rename')
}

// Badges
const GYM_BADGES = [
  { id: 'pewter', name: 'Roca' },
  { id: 'cerulean', name: 'Cascada' },
  { id: 'vermilion', name: 'Trueno' },
  { id: 'celadon', name: 'Arcoíris' },
  { id: 'fuchsia', name: 'Alma' },
  { id: 'saffron', name: 'Marsh' },
  { id: 'cinnabar', name: 'Volcán' },
  { id: 'viridian', name: 'Tierra' }
] as const satisfies readonly { id: GymId; name: string }[]

const formatNum = (num: unknown) => formatCurrency(Number(num || 0))

const close = () => {
  emit('close')
}

// GSAP hover handlers via shared composable
const { handleStatEnter, handleStatLeave } = useStatHover()

const activityStats = computed(() => [
  { label: 'Tiempo Jugado', value: `${playtimeHours.value}h`, class: 'yellow-text' },
  { label: 'Miembro Desde', value: formatDate(createdAt.value) },
  { label: 'Última Partida', value: isOwnProfile.value ? 'Activo Ahora' : formatDate(lastPlayedAt.value) }
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


// Watch loading state to animate the spinner via GSAP
watch(loading, (newVal) => {
  if (newVal) {
    nextTick(() => {
      const spinner = document.querySelector('.loader-spinner')
      if (spinner) {
        gsap.to(spinner, {
          rotation: SPINNER_FULL_ROTATION_DEG,
          duration: 1.5,
          repeat: -1,
          ease: 'none'
        })
      }
    })
  }
}, { immediate: true })

// Asset loaders
const getAssetUrlLocal = getAssetUrl
</script>

<template>
  <BaseModal
    :show="show"
    title="PERFIL DE ENTRENADOR"
    title-color="var(--yellow)"
    :header-background="playerClass === 'rocket' ? 'rgba(239, 68, 68, 0.15)' : (playerClass === 'cazabichos' ? 'rgba(34, 197, 94, 0.15)' : (playerClass === 'entrenador' ? 'rgba(59, 130, 246, 0.15)' : (playerClass === 'criador' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.8)')))"
    type="side-right"
    max-width="420px"
    :show-close-button="true"
    padding="raw"
    :custom-class="'trainer-profile-modal ' + (playerClass || 'default')"
    :lock-scroll="false"
    overlay="dark"
    @close="close"
  >
    <section class="profile-panel-content custom-scrollbar">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="loading-state"
      >
        <div class="loader-spinner" />
        <span class="loading-text">CARGANDO ENTRENADOR...</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="error-state"
      >
        <span class="emoji error-icon">⚠️</span>
        <span class="error-message">{{ error }}</span>
        <button
          class="retry-btn"
          @click="fetchData"
        >
          REINTENTAR
        </button>
      </div>

      <!-- Main Profile Body -->
      <div
        v-else
        class="profile-body-premium"
      >
        <!-- Identity Section -->
        <div class="profile-identity-card">
          <div class="avatar-wrap">
            <TrainerAvatar
              :player-class="playerClass"
              :level="trainerLevel"
              :avatar-style="avatarStyle"
              :size="120"
              :gender="gender"
            />
          </div>
          <div
            class="profile-username"
          >
            <span
              v-gsap-nick="nickStyle || 'normal'"
              :class="nickStyle || 'normal'"
            >{{ trainerName }}</span>
            <a
              v-if="isOwnProfile"
              href="#"
              class="change-link"
              title="Cambiar Nombre"
              @click.prevent.stop="openRename"
            >
              <span class="emoji">✏️</span> CAMBIAR
            </a>
          </div>
          <div
            v-if="classDef"
            class="profile-profession"
            :style="{ color: classDef.color }"
          >
            {{ classDef.name }} • LV. {{ trainerLevel }}
          </div>
        </div>

        <!-- Faction Section -->
        <div class="profile-section-card faction-card">
          <div class="section-label">
            BANDO
          </div>
          <div class="faction-row">
            <div
              class="faction-badge"
              :style="{ color: factionColor }"
            >
              <img
                v-if="faction && faction !== 'null' && faction !== 'undefined' && faction.trim() !== ''"
                :src="getAssetUrlLocal(ASSET_TYPES.FACTION, faction)"
                class="faction-img"
                @error="(e: Event) => { if (e.target) (e.target as HTMLImageElement).style.display = 'none' }"
              >
              {{ factionLabel }}
            </div>
          </div>
        </div>

        <!-- Badges Showcase -->
        <div class="profile-section-card badges-card">
          <div class="section-label">
            MEDALLAS DE KANTO ({{ badgesCount }}/8)
          </div>
          <div class="badges-shelf">
            <div 
              v-for="badge in GYM_BADGES" 
              :key="badge.id"
              class="badge-item"
              :title="badge.name"
            >
              <img 
                :src="getAssetUrlLocal(ASSET_TYPES.BADGE, badge.id)" 
                class="badge-img"
                :class="{ 'locked-badge': !isGymDefeated(badge.id) }"
              >
              <span class="badge-title">{{ badge.name }}</span>
            </div>
          </div>
        </div>

        <!-- Experiencia -->
        <ProfileXpCard 
          :level="trainerLevel" 
          :exp="saveState?.trainerExp ?? 0" 
          :exp-needed="saveState?.trainerExpNeeded ?? 100" 
          :class-id="playerClass" 
          :class-color="classDef?.color || 'var(--purple)'"
          :hide-unlocks="true"
          title="Nivel y Experiencia Cuenta"
        />

        <ProfileXpCard 
          v-if="playerClass && classDef"
          :level="classLevel"
          :exp="classXP"
          :exp-needed="classXPNeeded"
          :class-id="playerClass"
          :class-color="classDef?.color || 'var(--purple)'"
          :title="`Nivel y Experiencia Clase (${classDef?.name})`"
        />

        <!-- Pokedex Progress -->
        <ProfilePokedexCard 
          :pokedex-caught="pokedexCaught" 
          :pokedex-seen="pokedexSeen" 
        />

        <!-- Stats Grid -->
        <ProfileStatsGrid 
          :stats="{ wins: wildWins, trainersDefeated: trainersDefeated }" 
          :level="trainerLevel"
          :badges="badgesCount"
          :money="money"
          :battle-coins="battleCoinsCount"
        />

        <!-- Torneos y Competiciones de Eventos -->
        <ProfileEventStatsCard
          :participations="eventParticipations"
          :medals-total="eventMedalsTotal"
          :first-place="eventMedalsFirst"
          :second-place="eventMedalsSecond"
          :third-place="eventMedalsThird"
          :handle-stat-enter="handleStatEnter"
          :handle-stat-leave="handleStatLeave"
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
      </div>
    </section>
  </BaseModal>
</template>

<style src="./TrainerProfileModal.styles.scss" scoped lang="scss"></style>

