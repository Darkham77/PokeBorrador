<script setup lang="ts">
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { getItemById } from '@/data/inventory/items'
import PVTooltip from '@/components/common/PVTooltip.vue'

const cardRef = ref<HTMLElement | null>(null)

const props = defineProps<{
  id?: string
  avatar: string
  isAvatarUrl?: boolean
  title: string
  dialogue: string
  rewardIcon: string
  rewardLabel: string
  rewardVal: string
  btnText: string
  btnDisabled: boolean
  isCompleted: boolean
  completedBadgeText?: string
  rewardId?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()

const rewardTooltipTitle = computed(() => {
  if (props.rewardId) {
    const item = getItemById(props.rewardId)
    if (item) return item.name
  }
  return props.rewardLabel
})

const rewardTooltipDescription = computed(() => {
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
  gsap.to(cardRef.value, {
    scale: MISSION_CARD_HOVER_SCALE_BOOST,
    y: -4,
    duration: 0.4,
    ease: 'back.out(1.7)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.1)'
  })

  const sprite = cardRef.value.querySelector('.trainer-avatar img')
  if (sprite) {
    gsap.to(sprite, {
      scale: GSAP_HOVER_SPRITE_SCALE,
      y: GSAP_HOVER_SPRITE_Y_OFFSET_PX,
      filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.6))',
      duration: 0.4,
      ease: 'back.out(1.7)'
    })
  }
}

const handleMouseLeave = () => {
  if (!cardRef.value) return
  gsap.to(cardRef.value, {
    scale: 1,
    y: 0,
    duration: 0.4,
    ease: 'power2.out',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: 'none'
  })

  const sprite = cardRef.value.querySelector('.trainer-avatar img')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1,
      y: 0,
      filter: 'none',
      duration: 0.4,
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
    :class="{ completed: isCompleted }"
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
        >👤</span>
      </div>
      <div class="dialogue-box">
        <span class="trainer-name">{{ title }}</span>
        <p class="dialogue">
          " {{ dialogue }} "
        </p>
      </div>
    </div>

    <div class="reward-section">
      <PVTooltip
        :title="rewardTooltipTitle"
        :description="rewardTooltipDescription"
        position="top"
        style="width: 100%;"
      >
        <div class="reward-tag">
          <span class="reward-icon">{{ rewardIcon }}</span>
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
  
  &.completed {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.02);
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

.reward-section {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-tag {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;

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
    gap: 4px;
    .label { font-size: 8px; color: $muted; text-transform: uppercase; letter-spacing: 0.5px; }
    .val { font-size: 9px; color: Rgba(34, 197, 94, 1); font-weight: 800; }
  }
}

.btn-deliver {
  width: 100%;
  @include btn-vicio('primary', 'sm', true);
}
</style>
