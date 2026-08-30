<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { gsap } from 'gsap'
import { type ClassDefinition } from '@/stores/player/playerClass'
import { useModalStore } from '@/stores/modals'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/player/profile'
import { useUIStore } from '@/stores/ui'
import type { GenderId } from '@/types/system/game'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  currentClass?: ClassDefinition | null
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

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}

const GSAP_TRAINER_CARD_HOVER_SCALE_BOOST = 1.05

// GSAP Hover Interactions
const onTrainerMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    scale: GSAP_TRAINER_CARD_HOVER_SCALE_BOOST,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onTrainerMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    scale: 1,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onRankCardMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(15, 23, 42, 0.6)',
    x: 5,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onRankCardMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(15, 23, 42, 0.4)',
    x: 0,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onAbilityMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(255, 255, 255, 0.06)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onAbilityMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(15, 23, 42, 0.4)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- Left: Identity -->
    <aside class="dashboard-sidebar custom-scrollbar-vicio">
      <div class="avatar-box">
        <div class="avatar-glow" />
        <div class="trainers-wrap">
          <PVTooltip :title="currentGender === 'h' ? '♂️ Masculino (Género Actual)' : (!canChangeGender ? `♂️ Masculino (Cooldown: Faltan ${daysUntilIdentityChange} días)` : '♂️ Masculino (Haz clic para cambiar)')">
            <img 
              :src="getTrainerSprite(currentClass?.showdownSpriteId || currentClass?.id, 'h')"
              class="trainer-big-img" 
              :class="{ active: currentGender === 'h', inactive: currentGender === 'm', locked: currentGender !== 'h' && !canChangeGender }"
              @click.stop="handleSelectGender('h')"
              @mouseenter="onTrainerMouseEnter"
              @mouseleave="onTrainerMouseLeave"
              @error="handleImageError"
            >
          </PVTooltip>
          <PVTooltip :title="currentGender === 'm' ? '♀️ Femenino (Género Actual)' : (!canChangeGender ? `♀️ Femenino (Cooldown: Faltan ${daysUntilIdentityChange} días)` : '♀️ Femenino (Haz clic para cambiar)')">
            <img 
              :src="getTrainerSprite(currentClass?.showdownSpriteId || currentClass?.id, 'm')"
              class="trainer-big-img" 
              :class="{ active: currentGender === 'm', inactive: currentGender === 'h', locked: currentGender !== 'm' && !canChangeGender }"
              @click.stop="handleSelectGender('m')"
              @mouseenter="onTrainerMouseEnter"
              @mouseleave="onTrainerMouseLeave"
              @error="handleImageError"
            >
          </PVTooltip>
        </div>
      </div>

      <h1 class="class-main-title">
        {{ currentClass?.name.toUpperCase() }}
      </h1>
      <p class="class-slogan">
        "{{ currentClass?.description }}"
      </p>

      <div class="rank-cards">
        <div 
          class="rank-card level"
          @mouseenter="onRankCardMouseEnter"
          @mouseleave="onRankCardMouseLeave"
        >
          <div class="card-icon">
            🎖️
          </div>
          <div class="card-text">
            <span class="label">NIVEL CUENTA</span>
            <span class="value">Nv. {{ trainerLevel }}</span>
          </div>
        </div>

        <div 
          class="rank-card level"
          @mouseenter="onRankCardMouseEnter"
          @mouseleave="onRankCardMouseLeave"
        >
          <div class="card-icon">
            🎓
          </div>
          <div class="card-text">
            <span class="label">NIVEL CLASE</span>
            <span
              class="value"
              :style="{ color: currentClass?.color || 'var(--yellow)' }"
            >Nv. {{ classLevel }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right: Details -->
    <main class="dashboard-main custom-scrollbar">
      <section class="details-section">
        <div class="section-header">
          <div class="header-line" />
          <h2>HABILIDADES DE CLASE</h2>
        </div>
        
        <div class="abilities-list">
          <div 
            v-for="(bonus, idx) in currentClass?.bonuses" 
            :key="idx"
            class="ability-item"
            :class="{ locked: (currentClass?.bonusLevels?.[Number(idx)] || 1) > classLevel }"
            @mouseenter="onAbilityMouseEnter"
            @mouseleave="onAbilityMouseLeave"
          >
            <div class="ability-checkbox">
              <span class="icon">{{ (currentClass?.bonusLevels?.[Number(idx)] || 1) <= classLevel ? '✅' : '🔒' }}</span>
            </div>
            <div class="ability-content">
              <p :class="{ 'text-locked': (currentClass?.bonusLevels?.[Number(idx)] || 1) > classLevel }">
                {{ bonus }}
              </p>
              <span
                v-if="(currentClass?.bonusLevels?.[Number(idx)] || 1) > classLevel"
                class="req-hint"
              >
                Requiere Nivel de Clase {{ currentClass?.bonusLevels?.[Number(idx)] }}
              </span>
            </div>
            <div 
              v-if="(currentClass?.bonusLevels?.[Number(idx)] || 1) > 1" 
              class="lv-badge"
            >
              NV. {{ currentClass?.bonusLevels?.[Number(idx)] }}
            </div>
            <PVTooltip
              :description="currentClass?.technicalBonuses?.[Number(idx)] || 'Información no disponible.'"
              position="top"
              :delay="100"
              style="cursor: help;"
            >
              <span class="ability-help"><span class="icon">❓</span></span>
            </PVTooltip>
          </div>
        </div>
      </section>

      <section class="details-section">
        <div class="section-header">
          <div class="header-line red" />
          <h2>LIMITACIONES</h2>
        </div>
        
        <div class="abilities-list limitations">
          <div 
            v-for="(penalty, idx) in currentClass?.penalties" 
            :key="idx"
            class="ability-item limitation"
            @mouseenter="onAbilityMouseEnter"
            @mouseleave="onAbilityMouseLeave"
          >
            <div class="ability-checkbox">
              <span class="icon">❌</span>
            </div>
            <div class="ability-content">
              <p>{{ penalty }}</p>
            </div>
            <PVTooltip
              :description="currentClass?.technicalPenalties?.[Number(idx)] || 'Información no disponible.'"
              position="top"
              :delay="100"
              style="cursor: help;"
            >
              <span class="ability-help"><span class="icon">❓</span></span>
            </PVTooltip>
          </div>
        </div>
      </section>

      <!-- Bottom Actions -->
      <div class="dashboard-actions">
        <button 
          class="missions-btn-wide"
          @click.stop="openMissionsModal"
        >
          <span class="icon">📋</span> MISIONES DE CLASE
        </button>

        <div class="action-footer">
          <button
            class="btn-secondary"
            @click.stop="emit('changeClass')"
          >
            <span class="icon">🔄</span>
            <div class="btn-label-stack">
              <span class="btn-label">CAMBIAR CLASE</span>
              <span class="price">10,000 BC</span>
            </div>
          </button>
          <button
            class="btn-primary"
            @click.stop="emit('close')"
          >
            <span class="icon check-icon">✓</span> ENTENDIDO
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style src="./ClassDashboard.styles.scss" scoped lang="scss"></style>
