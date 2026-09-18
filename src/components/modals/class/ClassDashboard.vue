<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { type PlayerClassDefinition } from '@/data/player/playerClasses'
import { useModalStore } from '@/stores/modals'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/player/profile'
import { useUIStore } from '@/stores/ui'
import type { GenderId } from '@/types/system/game'
import ClassDashboardSidebar from './ClassDashboardSidebar.vue'
import ClassDashboardAbilityItem from './ClassDashboardAbilityItem.vue'
import ClassDashboardPenaltyItem from './ClassDashboardPenaltyItem.vue'

interface Props {
  currentClass?: PlayerClassDefinition | null
  trainerLevel?: number
  trainerRank?: string
  classLevel?: number
}

withDefaults(defineProps<Props>(), {
  currentClass: null,
  trainerLevel: 1,
  trainerRank: 'Novato',
  classLevel: 1
})

const modalStore = useModalStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const uiStore = useUIStore()

import { getDaysUntilIdentityChange, canChangeIdentity } from '@/logic/player/identityCooldown'

const currentGender = computed<GenderId>(() => {
  return gameStore.state.gender === 'm' ? 'm' : 'h'
})

const daysUntilIdentityChange = computed(() => {
  return getDaysUntilIdentityChange(gameStore.state.last_renamed_at || profileStore.profileData.last_renamed_at)
})

const canChangeGender = computed(() => {
  return canChangeIdentity(gameStore.state.last_renamed_at || profileStore.profileData.last_renamed_at)
})

const handleSelectGender = (targetGender: GenderId) => {
  if (currentGender.value === targetGender) {
    uiStore.notify(`Ya tienes seleccionado el género ${targetGender === 'm' ? 'Femenino ♀️' : 'Masculino ♂️'}.`, 'ℹ️')
    return
  }

  if (!canChangeGender.value) {
    uiStore.notify(`Cooldown activo: Faltan ${daysUntilIdentityChange.value} días para poder cambiar de identidad.`, '⏳')
    return
  }

  const genderName = targetGender === 'm' ? 'Femenino ♀️' : 'Masculino ♂️'

  uiStore.openConfirm({
    title: '¿CAMBIAR DE GÉNERO?',
    message: `¿Deseas cambiar el género de tu entrenador a ${genderName}? Recuerda que solo se permite un cambio de identidad (nombre o género) cada 30 días.`,
    confirmText: 'CAMBIAR GÉNERO',
    cancelText: 'CANCELAR',
    type: 'primary',
    variant: 'retro',
    onConfirm: () => {
      const nowStr = Temporal.Now.instant().toString()
      gameStore.state.gender = targetGender
      gameStore.state.last_renamed_at = nowStr
      profileStore.updateProfile({ 
        gender: targetGender,
        last_renamed_at: nowStr 
      })

      if (authStore.user?.id.startsWith('local_')) {
        const localUserStr = localStorage.getItem('pokevicio_local_user')
        if (localUserStr) {
          interface LocalUser {
            user_metadata?: {
              username?: string;
              gender?: string;
              last_renamed_at?: string;
              [key: string]: unknown;
            };
            [key: string]: unknown;
          }
          const lu = JSON.parse(localUserStr) as LocalUser;
          if (!lu.user_metadata) lu.user_metadata = {};
          lu.user_metadata.gender = targetGender;
          lu.user_metadata.last_renamed_at = nowStr;
          localStorage.setItem('pokevicio_local_user', JSON.stringify(lu));
        } else {
          localStorage.setItem('pokevicio_local_user', JSON.stringify({
            id: authStore.user.id,
            email: authStore.user?.email || 'entrenador@local',
            user_metadata: { 
              username: gameStore.state.trainer,
              gender: targetGender,
              last_renamed_at: nowStr 
            }
          }))
        }
      }

      gameStore.save(false)
      if (authStore.user) {
        profileStore.syncProfileFromAuth(authStore.user, gameStore.state)
      }
      uiStore.notify(`Género de entrenador cambiado a ${targetGender === 'm' ? 'Femenino' : 'Masculino'}.`, '✨')
    }
  })
}

const emit = defineEmits<{
  (e: 'changeClass'): void
  (e: 'close'): void
}>()

const openMissionsModal = () => {
  modalStore.close('ClassMissions')
  modalStore.open('EventMissions')
}

const getTrainerSprite = (id: string | number | undefined, gender: GenderId = 'h') => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id as string, { trainerSuffix: 'front', gender });
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- Left: Identity -->
    <ClassDashboardSidebar
      :current-class="currentClass"
      :current-gender="currentGender"
      :can-change-gender="canChangeGender"
      :days-until-identity-change="daysUntilIdentityChange"
      :trainer-level="trainerLevel"
      :class-level="classLevel"
      :trainer-male-sprite="getTrainerSprite(currentClass?.avatarSpriteId, 'h')"
      :trainer-female-sprite="getTrainerSprite(currentClass?.avatarSpriteId, 'm')"
      @select-gender="handleSelectGender"
    />

    <!-- Right: Details -->
    <main class="dashboard-main custom-scrollbar">
      <section class="details-section">
        <div class="section-header">
          <div class="header-line" />
          <h2>HABILIDADES DE CLASE</h2>
        </div>
        
        <div class="abilities-list">
          <ClassDashboardAbilityItem
            v-for="(bonus, idx) in currentClass?.bonuses"
            :key="idx"
            :bonus="bonus"
            :technical-bonus="currentClass?.technicalBonuses?.[Number(idx)]"
            :req-level="currentClass?.bonusLevels?.[Number(idx)]"
            :class-level="classLevel"
          />
        </div>
      </section>

      <section class="details-section">
        <div class="section-header">
          <div class="header-line red" />
          <h2>LIMITACIONES</h2>
        </div>

        <div class="abilities-list limitations">
          <ClassDashboardPenaltyItem
            v-for="(penalty, idx) in currentClass?.penalties"
            :key="idx"
            :penalty="penalty"
            :technical-penalty="currentClass?.technicalPenalties?.[Number(idx)]"
          />
        </div>
      </section>

      <!-- Bottom Actions -->
      <div class="dashboard-actions">
        <button 
          class="missions-btn-wide"
          @click.stop="openMissionsModal"
        >
          <span class="emoji">📋</span> MISIONES DE CLASE
        </button>

        <div class="action-footer">
          <button
            class="btn-secondary"
            @click.stop="emit('changeClass')"
          >
            <span class="emoji">🔄</span>
            <div class="btn-label-stack">
              <span class="btn-label">CAMBIAR CLASE</span>
              <span class="price">10,000 BC</span>
            </div>
          </button>
          <button
            class="btn-primary"
            @click.stop="emit('close')"
          >
            <span class="emoji check-icon">✓</span> ENTENDIDO
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style src="./ClassDashboard.styles.scss" scoped lang="scss"></style>
