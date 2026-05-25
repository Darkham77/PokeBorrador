<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

interface GymDifficulty {
  pokemon: string[];
  levels: number[];
}

interface Gym {
  id: string;
  name: string;
  badgeName: string;
  rewardTM: string;
  difficulties: {
    easy: GymDifficulty;
    normal: GymDifficulty;
    hard: GymDifficulty;
  };
}

const props = defineProps<{
  gym: Gym
  difficulty: string
}>()

// Expose to template
const _ASSET_TYPES = ASSET_TYPES
const _getAssetUrl = getAssetUrl

const estimatedRewards = computed(() => {
  if (!props.gym?.difficulties) return { money: 0, exp: 0 }
  
  const diff = props.gym.difficulties[props.difficulty as keyof typeof props.gym.difficulties] || props.gym.difficulties.easy
  if (!diff?.levels) return { money: 0, exp: 0 }

  const avgLevel = diff.levels.reduce((a, b) => a + b, 0) / diff.levels.length
  
  // Fórmulas de recompensa escaladas
  const mults: Record<string, number> = { easy: 1, normal: 2.2, hard: 4.5 }
  const mult = mults[props.difficulty] || 1
  
  return {
    money: Math.floor(avgLevel * 30 * mult),
    exp: Math.floor(avgLevel * 180 * mult)
  }
})
</script>

<template>
  <div class="medal-reward-box">
    <img 
      :src="_getAssetUrl(_ASSET_TYPES.BADGE, gym.id)" 
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
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

/* Placa de Recompensa Destacada */
.medal-reward-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
}

.reward-badge-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: Drop-Shadow(0 0 4px rgba(255, 215, 0, 0.4));
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
  text-shadow: 0 0 8px rgba(255, 214, 10, 0.3);
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
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.05);
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
    background: rgba(76, 201, 240, 0.1);
    border-color: rgba(76, 201, 240, 0.2);
  }

  &.money {
    color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
    border-color: rgba(255, 215, 0, 0.2);
  }
}
</style>
