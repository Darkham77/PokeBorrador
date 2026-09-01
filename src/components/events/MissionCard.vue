<script setup lang="ts">
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { getItemById, isItemId } from '@/data/inventory/items'
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
  unmetRequirement?: string
  availableRequirement?: string
  isAvailable?: boolean
  rewardIcon?: string
  rewardLabel?: string
  rewardVal?: string
  rewardId?: string
  rewardTooltipTitle?: string
  rewardTooltipDescription?: string
  rewardsList?: readonly DetailedMissionReward[]
  btnText: string
  btnDisabled: boolean
  isCompleted: boolean
  completedBadgeText?: string
}>(), {
  id: '',
  isAvatarUrl: false,
  rulesText: '',
  unmetRequirement: '',
  availableRequirement: '',
  isAvailable: false,
  rewardIcon: '🎁',
  rewardLabel: 'Recompensa',
  rewardVal: '',
  rewardId: '',
  rewardTooltipTitle: '',
  rewardTooltipDescription: '',
  rewardsList: () => [],
  completedBadgeText: ''
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
  if (props.rewardId) {
    const item = getItemById(props.rewardId)
    if (item) return item.name
  }
  return props.rewardLabel
})

const computedRewardTooltipDescription = computed(() => {
  if (props.rewardTooltipDescription) return props.rewardTooltipDescription
  if (props.rewardId) {
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

    <!-- Full-width Rules & Requirements Box -->
    <div
      v-if="rulesText"
      class="rules-box"
    >
      <span class="rules-badge">REGLAS / REQUISITOS</span>
      <p class="rules-desc">
        {{ rulesText }}
      </p>
    </div>

    <!-- Unmet requirement banner -->
    <div
      v-if="unmetRequirement && !isCompleted"
      class="requirement-banner is-unmet"
    >
      <span class="emoji req-icon">⚠️</span>
      <span class="req-text">{{ unmetRequirement }}</span>
    </div>

    <!-- Available requirement banner -->
    <div
      v-else-if="availableRequirement && isAvailable && !isCompleted"
      class="requirement-banner is-available-req"
    >
      <span class="emoji req-icon">✨</span>
      <span class="req-text">{{ availableRequirement }}</span>
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

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.mission-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  will-change: transform, border-color, box-shadow;

  &.is-available {
    background: radial-gradient(circle at 50% 0%, Rgba(250, 204, 21, 0.08) 0%, transparent 60%), linear-gradient(180deg, #1e1810 0%, #12131a 100%);
    border: 1.5px solid Rgba(250, 204, 21, 0.45);
    box-shadow: 0 4px 18px Rgba(0, 0, 0, 0.5), 0 0 14px Rgba(250, 204, 21, 0.08), inset 0 1px 0 Rgba(255, 235, 130, 0.2);

    .trainer-avatar {
      border: 1px solid Rgba(250, 204, 21, 0.3);
      box-shadow: 0 0 10px Rgba(250, 204, 21, 0.15);
    }

    .rules-box {
      border-color: Rgba(250, 204, 21, 0.25);
      background: Rgba(30, 24, 16, 0.6);
    }
  }

  &.is-locked {
    background: Rgba(15, 23, 42, 0.85);
    border: 1.5px dashed Rgba(96, 165, 250, 0.45);
    box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);

    .trainer-avatar {
      border: 1px solid Rgba(59, 130, 246, 0.25);
    }

    .rules-box {
      border-color: Rgba(96, 165, 250, 0.2);
      background: Rgba(15, 23, 42, 0.6);
    }

    .btn-deliver {
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      color: Rgba(255, 255, 255, 0.35);
      cursor: not-allowed;
      box-shadow: none;
    }
  }
  
  &.completed {
    border: 1.5px solid Rgba(34, 197, 94, 0.4);
    background: linear-gradient(180deg, Rgba(16, 28, 20, 0.9) 0%, Rgba(10, 15, 12, 0.95) 100%);
    box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);

    .trainer-avatar {
      border: 1px solid Rgba(34, 197, 94, 0.3);
    }
  }
}

.requirement-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  box-sizing: border-box;
  width: 100%;

  .req-icon {
    font-size: 13px;
    line-height: 1 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
    flex-shrink: 0;
  }

  .req-text {
    font-size: 8px;
    line-height: 1.35;
    font-weight: 700;
    @include pixelated;
  }

  &.is-unmet {
    background: Rgba(239, 68, 68, 0.12);
    border: 1px solid Rgba(239, 68, 68, 0.4);

    .req-text {
      color: #fca5a5;
    }
  }

  &.is-available-req {
    background: Rgba(250, 204, 21, 0.1);
    border: 1px solid Rgba(250, 204, 21, 0.35);

    .req-text {
      color: #fef08a;
    }
  }
}

.completed-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: Rgba(34, 197, 94, 1);
  color: white;
  font-size: 9px;
  @include pixelated;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #000000;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.trainer-section {
  display: flex;
  gap: 16px;
  
  .trainer-avatar {
    width: 96px;
    height: 96px;
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    overflow: visible; // Allow image zoom shadow/scaling to overflow slightly within bounds

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      @include pixelated;
      will-change: transform, filter;
    }

    .avatar-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      line-height: 1 !important;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
    }

    .pixelated { @include pixelated; }
  }
  
  .dialogue-box {
    flex: 1;
    .trainer-name { 
      font-size: 8px; 
      color: Rgba(255, 255, 255, 0.4); 
      text-transform: uppercase; 
      margin-bottom: 6px; 
      display: block; 
      letter-spacing: 0.5px;
    }
    .dialogue { 
      font-size: 9px; 
      color: white; 
      line-height: 1.8; 
      font-style: italic; 
    }
  }
}

.rules-box {
  width: 100%;
  box-sizing: border-box;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .rules-badge {
    font-size: 7px;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 800;
    @include pixelated;
  }

  .rules-desc {
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.85);
    line-height: 1.4;
  }
}

.reward-section {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rewards-multi-list {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .rewards-header-label {
    font-size: 7px;
    color: Rgba(255, 255, 255, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
    @include pixelated;
  }

  .rewards-multi-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}

.reward-tag {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;

  &.mini-tag {
    padding: 8px 10px;
    border-radius: 8px;
    gap: 10px;

    .reward-sprite-wrap {
      width: 20px;
      height: 20px;

      .reward-sprite-img {
        width: 20px;
        height: 20px;
      }
    }

    .reward-icon {
      font-size: 18px;
      width: 20px;
      height: 20px;
    }

    .reward-info {
      gap: 4px;
      .label { 
        font-size: 8px; 
        line-height: 1.35;
        display: block;
        color: Rgba(255, 255, 255, 0.5);
      }
      .val { 
        font-size: 9px; 
        line-height: 1.35;
        display: block;
        color: #4ade80;
      }
    }
  }

  .reward-sprite-wrap {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .reward-sprite-img {
      width: 24px;
      height: 24px;
      object-fit: contain;
      @include pixelated;
      filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));
    }
  }

  .reward-icon {
    font-size: 24px;
    width: 24px;
    height: 24px;
    line-height: 1 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
  }
  .reward-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
    justify-content: center;
    min-width: 0;
    
    .label { 
      font-size: 8px; 
      color: $muted; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      line-height: 1.35;
      display: block;
    }
    .val { 
      font-size: 9px; 
      color: Rgba(34, 197, 94, 1); 
      font-weight: 800; 
      line-height: 1.35;
      display: block;
    }
  }
}

.btn-deliver {
  width: 100%;
  @include btn-vicio('primary', 'sm', true);
}
</style>
