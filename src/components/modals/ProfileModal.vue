<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/player/profile'
import { usePlayerClassStore } from '@/stores/player/playerClass'
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
import ProfileEventStatsCard from '@/components/profile/ProfileEventStatsCard.vue'
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
  pokedexSeen,
  eventParticipations,
  eventMedalsTotal,
  eventMedalsFirst,
  eventMedalsSecond,
  eventMedalsThird
} = useTrainerProfile(() => authStore.user?.id)

const formatNum = (num: unknown) => formatCurrency(Number(num || 0))

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

const GSAP_AVATAR_HOVER_SCALE_BOOST = 1.05

const handleAvatarEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: GSAP_AVATAR_HOVER_SCALE_BOOST,
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
          v-if="classStore.playerClass && classStore.currentClassDef"
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
@use "@/styles/components/_profile-modal.scss" as *;
</style>
