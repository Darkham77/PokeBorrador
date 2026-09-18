<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'
import type { ItemId } from '@/data/inventory/items'
import MissionCardRulesBox from './MissionCardRulesBox.vue'
import MissionCardActiveOperation from './MissionCardActiveOperation.vue'
import MissionCardRewards from './MissionCardRewards.vue'
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
          :alt="title || 'Avatar de misión'"
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
    <MissionCardRulesBox
      :activation-req="activationReq"
      :reward-conditions="rewardConditions"
      :rules-text="rulesText"
    />

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
    <MissionCardActiveOperation
      :is-active-mission="isActiveMission"
      :is-completed="isCompleted"
      :remaining-time-text="remainingTimeText"
      :progress-percent="progressPercent"
      :active-pokemon-info="activePokemonInfo"
      :active-guaranteed-reward="activeGuaranteedReward"
      :has-rewards-list="Boolean(rewardsList && rewardsList.length > 0)"
    />

    <div class="reward-section">
      <MissionCardRewards
        :rewards-list="rewardsList"
        :reward-id="rewardId"
        :reward-icon="rewardIcon"
        :reward-label="rewardLabel"
        :reward-val="rewardVal"
        :reward-tooltip-title="rewardTooltipTitle"
        :reward-tooltip-description="rewardTooltipDescription"
      />

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

