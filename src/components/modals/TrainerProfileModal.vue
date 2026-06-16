<script setup lang="ts">
import { watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import ProfileStatsGrid from '@/components/profile/ProfileStatsGrid.vue'
import ProfileAchievementsGrid from '@/components/profile/ProfileAchievementsGrid.vue'
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue'
import ProfilePokedexCard from '@/components/profile/ProfilePokedexCard.vue'
import { useTrainerProfile } from './useTrainerProfile'
import { useStatHover } from '@/composables/useStatHover'

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
  saveState,
  fetchData
} = useTrainerProfile(() => props.userId)

const formatDate = (isoStr: string | null | undefined) => {
  if (!isoStr) return '---'
  try {
    const inst = Temporal.Instant.from(isoStr)
    const date = new Date(inst.epochMilliseconds)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
]

const formatNum = (num: number | string | unknown) => formatCurrency(Number(num || 0))

const close = () => {
  emit('close')
}

// GSAP hover handlers via shared composable
const { handleStatEnter, handleStatLeave } = useStatHover()


// Watch loading state to animate the spinner via GSAP
watch(loading, (newVal) => {
  if (newVal) {
    nextTick(() => {
      const spinner = document.querySelector('.loader-spinner')
      if (spinner) {
        gsap.to(spinner, {
          rotation: 360,
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
const ASSET_TYPES_LOCAL = ASSET_TYPES
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
        <span class="error-icon">⚠️</span>
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
              ✏️ CAMBIAR
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
                :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, faction)"
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
                :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.BADGE, badge.id)" 
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
          v-if="playerClass && playerClass !== 'none' && playerClass !== 'undefined' && classDef"
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
              <span class="stat-val">{{ isOwnProfile ? 'Activo Ahora' : formatDate(lastPlayedAt) }}</span>
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
      </div>
    </section>
  </BaseModal>
</template>

<style src="./TrainerProfileModal.styles.scss" scoped lang="scss"></style>
