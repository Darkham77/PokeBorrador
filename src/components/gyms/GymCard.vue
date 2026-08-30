<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGymsStore } from '@/stores/gyms'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import GymRewardPanel from './GymRewardPanel.vue'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import { GYM_DIFFICULTY_IDS, type Gym, type GymDifficultyId } from '@/data/world/gyms'

const GYM_CARD_HOVER_BG_OPACITY_PERCENT = 0.05
const GYM_CARD_HOVER_BTN_BG_OPACITY_PERCENT = 0.15
const GYM_CARD_HOVER_BTN_SCALE_BOOST = 1.05

interface Props {
  gym: Gym
  isDefeated?: boolean
  isLocked?: boolean
  isReaffirming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDefeated: false,
  isLocked: false,
  isReaffirming: false
})

const gymsStore = useGymsStore()
const selectedDifficulty = defineModel<GymDifficultyId>('difficulty', { default: 'easy' })
const cardRef = ref<HTMLElement | null>(null)

const GYM_CARD_MOUNT_OFFSET_Y = 20;
const GYM_CARD_HOVER_SCALE = 1.02;
const GYM_CARD_HOVER_OFFSET_Y = -4;

onMounted(() => {
  if (cardRef.value) {
    gsap.from(cardRef.value, {
      y: GYM_CARD_MOUNT_OFFSET_Y,
      duration: 0.8,
      ease: 'back.out(1.2)',
      delay: Math.random() * 0.4
    })
  }
})

const handleChallenge = () => {
  if (props.isLocked) return
  gymsStore.challengeGym(props.gym.id, selectedDifficulty.value)
}

const typeIcon = computed(() => {
  const icons: Partial<Record<PokemonType, string>> = {
    rock: '🪨', water: '💧', electric: '⚡', grass: '🌿',
    poison: '☠️', psychic: '🔮', fire: '🔥', ground: '🌍'
  }
  return icons[props.gym.type] || '🏆'
})

const leaderSpriteUrl = computed(() => {
  return getAssetUrl(ASSET_TYPES.TRAINER, props.gym.leader.toLowerCase())
})

const handleMouseEnter = () => {
  if (props.isLocked || !cardRef.value) return
  gsap.to(cardRef.value, {
    scale: GYM_CARD_HOVER_SCALE,
    y: GYM_CARD_HOVER_OFFSET_Y,
    duration: 0.4,
    ease: 'back.out(1.7)',
    borderColor: props.gym.typeColor,
    boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 15px ${props.gym.typeColor}33`
  })
  
  const sprite = cardRef.value.querySelector('.leader-sprite')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1.1,
      y: -5,
      filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.6))',
      duration: 0.4,
      ease: 'back.out(1.7)'
    })
  }
}

const handleMouseLeave = () => {
  if (props.isLocked || !cardRef.value) return
  gsap.to(cardRef.value, {
    scale: 1,
    y: 0,
    duration: 0.4,
    ease: 'power2.out',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: 'none'
  })
  
  const sprite = cardRef.value.querySelector('.leader-sprite')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1,
      y: 0,
      filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))',
      duration: 0.4,
      ease: 'power2.out'
    })
  }
}

const handleBtnEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: GYM_CARD_HOVER_BTN_SCALE_BOOST,
    backgroundColor: `rgba(255, 255, 255, ${GYM_CARD_HOVER_BTN_BG_OPACITY_PERCENT})`,
    duration: 0.3,
    ease: 'power2.out'
  })
}

const handleBtnLeave = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1,
    backgroundColor: `rgba(255, 255, 255, ${GYM_CARD_HOVER_BG_OPACITY_PERCENT})`,
    duration: 0.3,
    ease: 'power2.out'
  })
}
</script>

<template>
  <div
    ref="cardRef"
    class="pv-gym-card"
    :class="{ defeated: isDefeated, locked: isLocked }"
    :style="{ '--gym-color': gym.typeColor }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="pv-card-header"
      :style="{ background: `linear-gradient(180deg, ${gym.typeColor}15 0%, transparent 100%)` }"
    >
      <div class="header-main">
        <div class="leader-info">
          <div class="type-row">
            <span class="type-icon">{{ typeIcon }}</span>
            <span
              class="gym-tag"
              :style="{ color: gym.typeColor }"
            >{{ gym.name }}</span>
          </div>
          <div class="location">
            <span class="emoji-inline">📍</span> {{ gym.city }}
          </div>
          <div class="leader-title">
            Líder: <span>{{ gym.leader }}</span>
          </div>
          <div class="badges-row">
            <PokemonTypeTag
              :type="toPokemonType(gym.type)"
              size="md"
            />
          </div>
        </div>
        <div class="leader-sprite-box">
          <img
            :src="leaderSpriteUrl"
            :alt="gym.name"
            class="leader-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>
      </div>
      
      <!-- Panel de Recompensa de Medalla Destacada -->
      <GymRewardPanel
        :gym="gym"
        :difficulty="selectedDifficulty"
      />
    </div>

    <div class="pv-card-footer">
      <div class="preview-box">
        <div class="progress-txt">
          ESTADO: <span :class="{ 'text-won': isDefeated }">{{ isDefeated ? 'COMPLETADO' : 'PENDIENTE' }}</span>
        </div>
      </div>

      <div class="action-box">
        <div
          v-if="isLocked"
          class="locked-tag"
        >
          <span class="emoji-inline">🔒</span> BLOQUEADO ({{ gym.badgesRequired }} Medallas)
        </div>
        <div
          v-else
          class="challenge-group"
        >
          <!-- Selector de dificultad siempre disponible para permitir rematches en otros niveles -->
          <div class="diff-selector">
            <button 
              v-for="d in GYM_DIFFICULTY_IDS" 
              :key="d"
              class="diff-btn"
              :class="{ 
                active: selectedDifficulty === d, 
                [d]: true,
                'is-won': gymsStore.isDifficultyDefeated(gym.id, d)
              }"
              @click.stop="selectedDifficulty = d"
              @mouseenter="handleBtnEnter"
              @mouseleave="handleBtnLeave"
            >
              {{ d === 'easy' ? 'FÁCIL' : d === 'normal' ? 'NORMAL' : 'DIFÍCIL' }}
              <span
                v-if="gymsStore.isDifficultyDefeated(gym.id, d)"
                class="won-dot"
              ><span class="emoji-inline">✓</span></span>
            </button>
          </div>

          <div
            v-if="isDefeated"
            class="won-tag"
          >
            <span class="emoji-inline">✅</span> VICTORIA OBTENIDA en {{ selectedDifficulty === 'easy' ? 'FÁCIL' : selectedDifficulty === 'normal' ? 'NORMAL' : 'DIFÍCIL' }}
          </div>

          <button
            class="pv-challenge-btn"
            :style="{ 
              background: `Linear-Gradient(135deg, ${gym.typeColor} 0%, ${gym.typeColor}dd 100%)`,
              boxShadow: `0 8px 25px ${gym.typeColor}44`
            }"
            @click.stop="handleChallenge"
          >
            <span class="btn-emoji">⚔️</span> {{ isDefeated ? 'REAFIRMAR' : 'DESAFIAR LÍDER' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_gym-card.scss"></style>
