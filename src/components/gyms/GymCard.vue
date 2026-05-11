<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGymsStore } from '@/stores/gyms'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'

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

const estimatedRewards = computed(() => {
  if (!props.gym?.difficulties) return { money: 0, exp: 0 }
  
  const diff = props.gym.difficulties[selectedDifficulty.value as keyof typeof props.gym.difficulties] || props.gym.difficulties.easy
  if (!diff?.levels) return { money: 0, exp: 0 }

  const avgLevel = diff.levels.reduce((a, b) => a + b, 0) / diff.levels.length
  
  // Fórmulas de recompensa escaladas
  const mults: Record<string, number> = { easy: 1, normal: 2.2, hard: 4.5 }
  const mult = mults[selectedDifficulty.value] || 1
  
  return {
    money: Math.floor(avgLevel * 30 * mult),
    exp: Math.floor(avgLevel * 180 * mult)
  }
})

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
    borderColor: 'Rgba(255, 255, 255, 0.4)'
  })
  
  const sprite = cardRef.value.querySelector('.leader-sprite')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1.1,
      y: -5,
      filter: 'Drop-Shadow(0 8px 15px Rgba(0,0,0,0.6))',
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
    borderColor: 'Rgba(255, 255, 255, 0.15)'
  })
  
  const sprite = cardRef.value.querySelector('.leader-sprite')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1,
      y: 0,
      filter: 'Drop-Shadow(0 5px 10px Rgba(0,0,0,0.5))',
      duration: 0.4,
      ease: 'power2.out'
    })
  }
}

const handleBtnEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1.05,
    backgroundColor: 'Rgba(255, 255, 255, 0.15)',
    duration: 0.3,
    ease: 'power2.out'
  })
}

const handleBtnLeave = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1,
    backgroundColor: 'Rgba(255, 255, 255, 0.05)',
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
      :style="{ background: `Linear-Gradient(180deg, ${gym.typeColor}15 0%, transparent 100%)` }"
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
      <div class="medal-reward-box">
        <img 
          :src="getAssetUrl(ASSET_TYPES.BADGE, gym.id)" 
          :alt="gym.badgeName"
          class="reward-badge-img"
        >
        <div class="medal-detail">
          <span class="reward-title">RECOMPENSA DE VICTORIA</span>
          <span class="medal-name">{{ gym.badgeName }}</span>
          
          <div class="reward-grid">
            <span class="tm-reward">+ {{ gym.rewardTM }}</span>
            <div class="reward-extras">
              <span class="reward-pill exp">✨ {{ estimatedRewards.exp }} XP</span>
              <span class="reward-pill money">₱ {{ estimatedRewards.money }}</span>
            </div>
          </div>
        </div>
      </div>
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
            ✅ VICTORIA OBTENIDA en {{ selectedDifficulty.toUpperCase() }}
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pv-gym-card {
  @include shell-premium($radius: 24px);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;

  &.defeated {
    border-color: Rgba(107, 203, 119, 0.4);
    box-shadow: 0 10px 40px Rgba(34, 197, 94, 0.15);
  }

  &.locked {
    filter: Grayscale(1);
    will-change: filter;
    opacity: 0.5;
    pointer-events: none;
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: Rgba(0, 0, 0, 0.2);
    }
  }

  &:hover:not(.locked) {
    transform: Translatey(-6px);
    border-color: var(--gym-color);
    box-shadow: 0 20px 60px Rgba(0, 0, 0, 0.8), 0 0 15px Rgba(var(--gym-color), 0.2);
    
    .leader-sprite {
      transform: Scale(1.1) Translatey(-5px);
      filter: Drop-Shadow(0 15px 15px Rgba(0,0,0,0.6));
    }
  }
}

.pv-card-header {
  padding: 24px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.08);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: Linear-Gradient(90deg, transparent, Rgba(255, 255, 255, 0.1), transparent);
  }
}

.header-main {
  display: flex;
  gap: 20px;
  align-items: center;
}

.leader-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .type-icon { font-size: 20px; }
  .gym-tag {
    @include pixelated;
    font-size: 9px;
    letter-spacing: 0.5px;
    line-height: 1.4;
  }
}

.location { 
  font-size: 11px; 
  color: var(--gray); 
  opacity: 0.8;
  line-height: 1.4;
}

.leader-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--gray);
  line-height: 1.4;
  span { 
    color: var(--white);
    @include pixelated;
    font-size: 9px;
    margin-left: 5px;
    line-height: 1.4;
  }
}

.badges-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.leader-sprite-box {
  flex-shrink: 0;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 2px 10px Rgba(0, 0, 0, 0.5);

  .leader-sprite {
    height: 100px;
    width: auto;
    @include pixelated;
    filter: Drop-Shadow(0 5px 10px Rgba(0,0,0,0.5));
    will-change: filter, transform;
  }
}

/* Placa de Recompensa Destacada */
.medal-reward-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: inset 0 2px 8px Rgba(0, 0, 0, 0.4);
}

.reward-badge-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: Drop-Shadow(0 0 4px Rgba(255, 215, 0, 0.4));
}

.medal-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.reward-title {
  @include pixelated;
  font-size: 6px;
  color: var(--gray);
  opacity: 0.6;
  letter-spacing: 0.5px;
}

.medal-name {
  @include pixelated;
  font-size: 8px;
  color: $coin-gold;
  text-shadow: 0 0 8px Rgba(255, 214, 10, 0.3);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reward-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.tm-reward {
  @include pixelated;
  font-size: 6px;
  color: #fff;
  background: Rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  border: 1px solid Rgba(255, 255, 255, 0.05);
}

.reward-extras {
  display: flex;
  gap: 6px;
}

.reward-pill {
  font-size: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  @include pixelated;
  border: 1px solid transparent;

  &.exp {
    color: #4cc9f0;
    background: Rgba(76, 201, 240, 0.1);
    border-color: Rgba(76, 201, 240, 0.2);
  }

  &.money {
    color: #ffd700;
    background: Rgba(255, 215, 0, 0.1);
    border-color: Rgba(255, 215, 0, 0.2);
  }
}

.pv-card-footer {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: auto;
}

.progress-txt {
  font-size: 10px;
  color: var(--gray);
  @include pixelated;
  opacity: 0.7;
  
  .text-won {
    color: Rgba(34, 197, 94, 1);
    text-shadow: 0 0 8px Rgba(34, 197, 94, 0.3);
  }
}

.locked-tag {
  color: Rgba(239, 68, 68, 1);
  font-size: 10px;
  background: Rgba(239, 68, 68, 0.1);
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid Rgba(239, 68, 68, 0.2);
  text-align: center;
  @include pixelated;
}

.won-tag {
  color: Rgba(34, 197, 94, 1);
  font-size: 10px;
  font-weight: 700;
  background: Rgba(34, 197, 94, 0.1);
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid Rgba(34, 197, 94, 0.3);
  text-align: center;
  @include pixelated;
  margin-bottom: 12px;
}

.challenge-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.diff-selector {
  display: flex;
  gap: 6px;
  background: Rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
}

.diff-btn {
  flex: 1;
  @include pixelated;
  font-size: 7px;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--gray);
  cursor: pointer;

    &.active {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(255, 255, 255, 0.1);
    color: var(--white);
    box-shadow: 0 2px 10px Rgba(0, 0, 0, 0.3);
    
    &.easy { color: Rgba(34, 197, 94, 1); border-color: Rgba(34, 197, 94, 0.3); }
    &.normal { color: $coin-gold; border-color: Rgba(255, 215, 0, 0.3); }
    &.hard { color: Rgba(239, 68, 68, 1); border-color: Rgba(239, 68, 68, 0.3); }
  }
  
  .won-dot {
    margin-left: 4px;
    font-size: 8px;
    color: Rgba(34, 197, 94, 1);
  }
  
  &:hover:not(.active) {
    background: Rgba(255, 255, 255, 0.03);
    color: var(--white);
  }
}

.pv-challenge-btn {
  padding: 14px;
  border: 1px solid Rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  @include pixelated;
  font-size: 10px;
  color: var(--white);
  font-weight: 900;
  cursor: pointer;
  text-shadow: 0 2px 0 Rgba(0, 0, 0, 0.5);

  &:hover { 
    transform: Scale(1.02) Translatey(-2px);
    filter: Brightness(1.1);
    will-change: filter, transform;
    border-color: Rgba(255, 255, 255, 0.4);
  }
  
  &:active {
    transform: Scale(0.98) Translatey(1px);
  }
}
</style>
