<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGymsStore } from '@/stores/gyms'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import GymRewardPanel from './GymRewardPanel.vue'

interface GymDifficulty {
  pokemon: string[];
  levels: number[];
}

interface Gym {
  id: string;
  name: string;
  city: string;
  leader: string;
  type: string;
  typeColor: string;
  badge: string;
  badgeName: string;
  rewardTM: string;
  badgesRequired: number;
  difficulties: {
    easy: GymDifficulty;
    normal: GymDifficulty;
    hard: GymDifficulty;
  };
}

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
const selectedDifficulty = defineModel<string>('difficulty', { default: 'easy' })
const cardRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (cardRef.value) {
    gsap.from(cardRef.value, {
      y: 20,
      duration: 0.8,
      ease: 'back.out(1.2)',
      delay: Math.random() * 0.4
    })
  }
})

const handleChallenge = () => {
  if (props.isLocked) return
  gymsStore.challengeGym(props.gym.id, selectedDifficulty.value as 'easy' | 'normal' | 'hard')
}

const typeIcon = computed(() => {
  const icons: Record<string, string> = {
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
    scale: 1.02,
    y: -4,
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
    scale: 1.05,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    duration: 0.3,
    ease: 'power2.out'
  })
}

const handleBtnLeave = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
            📍 {{ gym.city }}
          </div>
          <div class="leader-title">
            Líder: <span>{{ gym.leader }}</span>
          </div>
          <div class="badges-row">
            <PokemonTypeTag
              :type="gym.type"
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
          🔒 BLOQUEADO ({{ gym.badgesRequired }} Medallas)
        </div>
        <div
          v-else
          class="challenge-group"
        >
          <!-- Selector de dificultad siempre disponible para permitir rematches en otros niveles -->
          <div class="diff-selector">
            <button 
              v-for="d in ['easy', 'normal', 'hard']" 
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
              >✓</span>
            </button>
          </div>

          <div
            v-if="isDefeated"
            class="won-tag"
          >
            ✅ VICTORIA OBTENIDA en {{ selectedDifficulty === 'easy' ? 'FÁCIL' : selectedDifficulty === 'normal' ? 'NORMAL' : 'DIFÍCIL' }}
          </div>

          <button
            class="pv-challenge-btn"
            :style="{ 
              background: `Linear-Gradient(135deg, ${gym.typeColor} 0%, ${gym.typeColor}dd 100%)`,
              boxShadow: `0 8px 25px ${gym.typeColor}44`
            }"
            @click.stop="handleChallenge"
          >
            ⚔️ {{ isDefeated ? 'REAFIRMAR' : 'DESAFIAR LÍDER' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_gym-card.scss"></style>
