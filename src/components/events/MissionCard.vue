<script setup lang="ts">
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { getItemById, isItemId, type ItemId } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { DetailedMissionReward } from '@/logic/player/classMissionsData'

const cardRef = ref<HTMLElement | null>(null)

const props = withDefaults(defineProps<{
  id?: string
  avatar: string
  isAvatarUrl?: boolean
  title: string
  dialogue: string
  rulesText?: string
  activationReq?: string
  rewardConditions?: string
  unmetRequirement?: string
  availableRequirement?: string
  isAvailable?: boolean
  rewardIcon?: string
  rewardLabel?: string
  rewardVal?: string
  rewardId?: ItemId
  rewardTooltipTitle?: string
  rewardTooltipDescription?: string
  rewardsList?: readonly DetailedMissionReward[]
  btnText: string
  btnDisabled: boolean
  isCompleted: boolean
  completedBadgeText?: string
  isActiveMission?: boolean
  activePokemonInfo?: string
  activeGuaranteedReward?: string
  progressPercent?: number
  remainingTimeText?: string
}>(), {
  id: '',
  isAvatarUrl: false,
  rulesText: '',
  activationReq: '',
  rewardConditions: '',
  unmetRequirement: '',
  availableRequirement: '',
  isAvailable: false,
  rewardIcon: '🎁',
  rewardLabel: 'Recompensa',
  rewardVal: '',
  rewardId: undefined,
  rewardTooltipTitle: '',
  rewardTooltipDescription: '',
  rewardsList: () => [],
  completedBadgeText: '',
  isActiveMission: false,
  activePokemonInfo: '',
  activeGuaranteedReward: '',
  progressPercent: 0,
  remainingTimeText: ''
})

defineEmits<{
  (e: 'action'): void
}>()

const rewardSpriteUrl = computed(() => {
  if (props.rewardId && isItemId(props.rewardId)) {
    return getAssetUrl(ASSET_TYPES.ITEM, props.rewardId)
  }
  return null
})

const computedRewardTooltipTitle = computed(() => {
  if (props.rewardTooltipTitle) return props.rewardTooltipTitle
  if (props.rewardId && isItemId(props.rewardId)) {
    const item = getItemById(props.rewardId)
    if (item) return item.name
  }
  return props.rewardLabel
})

const computedRewardTooltipDescription = computed(() => {
  if (props.rewardTooltipDescription) return props.rewardTooltipDescription
  if (props.rewardId && isItemId(props.rewardId)) {
    const item = getItemById(props.rewardId)
    if (item) return item.desc
  }
  
  // Fallback static descriptions for general rewards
  const labelLower = props.rewardLabel.toLowerCase()
  const valLower = props.rewardVal.toLowerCase()
  if (labelLower.includes('peso') || props.rewardIcon === '₱' || valLower.includes('peso')) {
    return 'Poké-Pesos (₱). Moneda principal del juego.'
  }
  if (labelLower.includes('exp') || labelLower.includes('experiencia') || valLower.includes('exp') || valLower.includes('experiencia')) {
    return 'Puntos de experiencia para subir el nivel y rango de tu clase.'
  }
  if (labelLower.includes('bc') || labelLower.includes('battle coin') || valLower.includes('bc') || valLower.includes('battle coin')) {
    return 'Battle Coins (BC). Moneda especial de batallas.'
  }
  
  return `Recompensa: ${props.rewardVal}`
})

const GSAP_HOVER_SPRITE_SCALE = 1.15
const GSAP_HOVER_SPRITE_Y_OFFSET_PX = -6
const MISSION_CARD_HOVER_SCALE_BOOST = 1.02

const handleMouseEnter = () => {
  if (!cardRef.value) return
  const isAvail = props.isAvailable && !props.isCompleted
  const isLock = !props.isAvailable && !props.isCompleted

  const targetBorderColor = props.isCompleted 
    ? 'rgba(34, 197, 94, 0.8)' 
    : isAvail 
      ? 'rgba(250, 204, 21, 0.85)' 
      : isLock 
        ? 'rgba(96, 165, 250, 0.7)' 
        : 'rgba(255, 255, 255, 0.25)'

  const targetBoxShadow = isAvail
    ? '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 22px rgba(250, 204, 21, 0.25), inset 0 1px 0 rgba(255, 235, 130, 0.35)'
    : isLock
      ? '0 6px 20px rgba(59, 130, 246, 0.2)'
      : '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.1)'

  gsap.to(cardRef.value, {
    scale: MISSION_CARD_HOVER_SCALE_BOOST,
    y: -4,
    duration: 0.3,
    ease: 'power2.out',
    borderColor: targetBorderColor,
    boxShadow: targetBoxShadow
  })

  const sprite = cardRef.value.querySelector('.trainer-avatar img')
  if (sprite) {
    gsap.to(sprite, {
      scale: GSAP_HOVER_SPRITE_SCALE,
      y: GSAP_HOVER_SPRITE_Y_OFFSET_PX,
      filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.6))',
      duration: 0.3,
      ease: 'power2.out'
    })
  }
}

const handleMouseLeave = () => {
  if (!cardRef.value) return
  const isAvail = props.isAvailable && !props.isCompleted
  const isLock = !props.isAvailable && !props.isCompleted

  const baseBorderColor = props.isCompleted
    ? 'rgba(34, 197, 94, 0.4)'
    : isAvail
      ? 'rgba(250, 204, 21, 0.45)'
      : isLock
        ? 'rgba(96, 165, 250, 0.45)'
        : 'rgba(255, 255, 255, 0.08)'

  const baseBoxShadow = isAvail
    ? '0 4px 18px rgba(0, 0, 0, 0.5), 0 0 14px rgba(250, 204, 21, 0.08), inset 0 1px 0 rgba(255, 235, 130, 0.2)'
    : isLock
      ? '0 4px 16px rgba(0, 0, 0, 0.4)'
      : 'none'

  gsap.to(cardRef.value, {
    scale: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out',
    borderColor: baseBorderColor,
    boxShadow: baseBoxShadow
  })

  const sprite = cardRef.value.querySelector('.trainer-avatar img')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1,
      y: 0,
      filter: 'none',
      duration: 0.3,
      ease: 'power2.out'
    })
  }
}

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
  const placeholder = target.nextElementSibling as HTMLElement;
  if (placeholder) placeholder.style.display = 'flex';
};
</script>

<template>
  <div 
    :id="'mission-card-' + (id || 'default')"
    ref="cardRef"
    class="mission-card"
    :class="{ 
      'is-available': isAvailable && !isCompleted,
      'is-locked': !isAvailable && !isCompleted,
      completed: isCompleted 
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      v-if="isCompleted && completedBadgeText"
      class="completed-badge"
    >
      {{ completedBadgeText }}
    </div>
    
    <div class="trainer-section">
      <div class="trainer-avatar">
        <img 
          v-if="isAvatarUrl"
          :src="avatar" 
          class="pixelated"
          @error="handleImgError"
        >
        <span
          v-else
          class="avatar-placeholder"
        >{{ avatar }}</span>
        
        <span
          v-if="isAvatarUrl"
          class="avatar-placeholder"
          style="display: none;"
        ><span class="emoji">👤</span></span>
      </div>
      <div class="dialogue-box">
        <span class="trainer-name">{{ title }}</span>
        <p class="dialogue">
          " {{ dialogue }} "
        </p>
      </div>
    </div>

    <!-- Deployment Requirement & Reward Conditions Box -->
    <div
      v-if="activationReq || rewardConditions || rulesText"
      class="rules-box"
    >
      <div
        v-if="activationReq"
        class="rules-section-block"
      >
        <span class="rules-badge deploy-badge">REQUISITO DE DESPLIEGUE</span>
        <p class="rules-desc">
          {{ activationReq }}
        </p>
      </div>

      <div
        v-if="rewardConditions"
        class="rules-section-block"
      >
        <span class="rules-badge reward-badge">CÓMO SE GANAN LAS RECOMPENSAS</span>
        <p class="rules-desc">
          {{ rewardConditions }}
        </p>
      </div>

      <div
        v-else-if="rulesText"
        class="rules-section-block"
      >
        <span class="rules-badge">REGLAS / REQUISITOS</span>
        <p class="rules-desc">
          {{ rulesText }}
        </p>
      </div>
    </div>

    <!-- Unmet requirement banner -->
    <div
      v-if="unmetRequirement && !isCompleted && !isActiveMission"
      class="requirement-banner is-unmet"
    >
      <span class="emoji req-icon">⚠️</span>
      <span class="req-text">{{ unmetRequirement }}</span>
    </div>

    <!-- Available requirement banner -->
    <div
      v-else-if="availableRequirement && isAvailable && !isCompleted && !isActiveMission"
      class="requirement-banner is-available-req"
    >
      <span class="emoji req-icon">✨</span>
      <span class="req-text">{{ availableRequirement }}</span>
    </div>

    <!-- Active Operation Summary & Single Countdown Box -->
    <div
      v-if="isActiveMission"
      class="active-operation-box mission-active-progress"
      :class="{ 'is-done': isCompleted }"
    >
      <div class="operation-header-row">
        <span class="operation-status-title">
          {{ isCompleted ? '¡OPERACIÓN COMPLETADA!' : 'OPERACIÓN EN CURSO' }}
        </span>
        <span class="operation-timer-text">
          {{ remainingTimeText }}
        </span>
      </div>

      <!-- In-card active deployment progress bar -->
      <div class="operation-progress-track">
        <div
          class="operation-progress-fill"
          :style="{ width: Math.min(100, Math.max(0, progressPercent || 0)) + '%' }"
        />
      </div>

      <div
        v-if="activePokemonInfo"
        class="operation-detail-row"
      >
        <span class="detail-label">ASIGNADO:</span>
        <span class="detail-val">{{ activePokemonInfo }}</span>
      </div>

      <div
        v-if="activeGuaranteedReward && (!rewardsList || rewardsList.length === 0)"
        class="operation-detail-row"
      >
        <span class="detail-label">BOTÍN FIJADO:</span>
        <span class="detail-val is-reward">{{ activeGuaranteedReward }}</span>
      </div>
    </div>

    <div class="reward-section">
      <!-- Multi-Reward Grid (e.g. Class Deployments) -->
      <div
        v-if="rewardsList && rewardsList.length > 0"
        class="rewards-multi-list"
      >
        <div class="rewards-header-label">
          RECOMPENSAS DETALLADAS
        </div>
        <div class="rewards-multi-grid">
          <PVTooltip
            v-for="(rew, rIdx) in rewardsList"
            :key="rIdx"
            :title="rew.tooltipTitle || rew.label"
            :description="rew.tooltipDesc || rew.val"
            position="top"
            style="width: 100%;"
          >
            <div class="reward-tag mini-tag">
              <div
                v-if="rew.isItem && rew.id && isItemId(rew.id)"
                class="reward-sprite-wrap"
              >
                <img
                  :src="getAssetUrl(ASSET_TYPES.ITEM, rew.id)"
                  :alt="rew.label"
                  class="reward-sprite-img pixelated"
                >
              </div>
              <span
                v-else
                class="emoji reward-icon"
              >{{ rew.icon || '🎁' }}</span>
              <div class="reward-info">
                <span class="label">{{ rew.label }}</span>
                <span class="val">{{ rew.val }}</span>
              </div>
            </div>
          </PVTooltip>
        </div>
      </div>

      <!-- Single Reward Tag (e.g. Daily Delivery Missions) -->
      <PVTooltip
        v-else
        :title="computedRewardTooltipTitle"
        :description="computedRewardTooltipDescription"
        position="top"
        style="width: 100%;"
      >
        <div class="reward-tag">
          <div
            v-if="rewardSpriteUrl"
            class="reward-sprite-wrap"
          >
            <img
              :src="rewardSpriteUrl"
              :alt="computedRewardTooltipTitle"
              class="reward-sprite-img pixelated"
            >
          </div>
          <span
            v-else
            class="emoji reward-icon"
          >{{ rewardIcon }}</span>
          <div class="reward-info">
            <span class="label">{{ rewardLabel }}</span>
            <span class="val">{{ rewardVal }}</span>
          </div>
        </div>
      </PVTooltip>

      <button 
        :id="'deliver-btn-' + (id || 'default')"
        class="btn-deliver"
        :disabled="btnDisabled"
        @click.stop="$emit('action')"
      >
        {{ btnText }}
      </button>
    </div>
  </div>
</template>

<style scoped src="./MissionCard.styles.scss" lang="scss"></style>

