<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useGymsStore } from '@/stores/gyms'
import { getItemById } from '@/data/inventory/items'
import type { Gym } from '@/data/world/gyms'
import type { BattleDifficulty } from '@/types/battle/battle'

const props = defineProps<{
  gym: Gym
  difficulty: BattleDifficulty
}>()

// Expose to template
const _getAssetUrl = getAssetUrl

const gymsStore = useGymsStore()

const isGymDefeated = computed(() => gymsStore.isGymDefeated(props.gym.id))
const isDifficultyDefeated = computed(() => gymsStore.isDifficultyDefeated(props.gym.id, props.difficulty))

const GYM_REWARD_BASE_MONEY_FACTOR = 30
const GYM_REWARD_BASE_EXP_FACTOR = 180

const estimatedRewards = computed(() => {
  if (!props.gym?.difficulties) return { money: 0, exp: 0 }
  
  const diff = props.gym.difficulties[props.difficulty]
  if (!diff?.levels) return { money: 0, exp: 0 }

  const avgLevel = diff.levels.reduce((a, b) => a + b, 0) / diff.levels.length
  
  // Fórmulas de recompensa escaladas
  const mults: Record<BattleDifficulty, number> = { easy: 1, normal: 2.2, hard: 4.5 }
  const mult = mults[props.difficulty]
  
  return {
    money: Math.floor(avgLevel * GYM_REWARD_BASE_MONEY_FACTOR * mult),
    exp: Math.floor(avgLevel * GYM_REWARD_BASE_EXP_FACTOR * mult)
  }
})

const tmName = computed(() => {
  try {
    return getItemById(props.gym.rewardTM)?.name || props.gym.rewardTM;
  } catch {
    return props.gym.rewardTM;
  }
});

const tmRewardText = computed(() => {
  if (!isGymDefeated.value) {
    return `+ ${tmName.value} (Garantizado 1ª vez)`
  }
  if (props.difficulty === 'normal') {
    return `+ ${tmName.value} (3% Prob. Rematch)`
  }
  if (props.difficulty === 'hard') {
    return `+ ${tmName.value} (5% Prob. Rematch)`
  }
  return `+ ${tmName.value} (0% Prob. Rematch)`
})
</script>

<template>
  <div class="medal-reward-box">
    <img 
      :src="_getAssetUrl(ASSET_TYPES.BADGE, gym.id)" 
      :alt="gym.badgeName"
      class="reward-badge-img"
      :class="{ 'claimed-badge': isGymDefeated }"
    >
    <div class="medal-detail">
      <span class="reward-title">RECOMPENSA DE VICTORIA</span>
      <span class="medal-name">{{ gym.badgeName }}</span>

      <div class="reward-grid">
        <span 
          class="tm-reward" 
          :class="{ 
            'tm-claimed': isGymDefeated, 
            'tm-chance-normal': isGymDefeated && difficulty === 'normal',
            'tm-chance-hard': isGymDefeated && difficulty === 'hard'
          }"
        >
          {{ tmRewardText }}
        </span>
        <div class="reward-extras">
          <template v-if="!isDifficultyDefeated">
            <span class="reward-pill exp"><span class="emoji">✨</span> {{ estimatedRewards.exp }} XP (Bono 1ª vez)</span>
            <span class="reward-pill money">₽ {{ estimatedRewards.money }} (Bono 1ª vez)</span>
          </template>
          <template v-else>
            <span
              class="reward-pill exp claimed"
              title="Bono ya reclamado. Solo recompensa estándar de combate."
            >
              <s><span class="emoji">✨</span> {{ estimatedRewards.exp }} XP</s> (Reclamado)
            </span>
            <span
              class="reward-pill money claimed"
              title="Bono ya reclamado. Solo recompensa estándar de combate."
            >
              <s>₽ {{ estimatedRewards.money }}</s> (Reclamado)
            </span>
          </template>
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
  padding: 10px 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 12px;
  background: Rgb(0 0 0 / 35%);
  box-shadow: inset 0 2px 8px Rgb(0 0 0 / 40%);
}

.reward-badge-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: Drop-Shadow(0 0 4px Rgb(255 215 0 / 40%));
  will-change: filter;

  &.claimed-badge {
    filter: Drop-Shadow(0 0 6px Rgb(255 215 0 / 75%));
  }
}

.medal-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.reward-title {
  @include pixelated;

  color: var(--gray);
  font-size: 6px;
  opacity: 0.6;
  letter-spacing: 0.5px;
}

.medal-name {
  @include pixelated;

  color: $coin-gold;
  font-size: 8px;
  line-height: 1.4;
  text-shadow: 0 0 8px Rgb(255 214 10 / 30%);
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

  padding: 2px 6px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 4px;
  background: Rgb(255 255 255 / 10%);
  color: #fff;
  font-size: 6px;
  align-self: flex-start;

  &.tm-claimed {
    background: Rgb(255 255 255 / 3%);
    color: #aaa;
    opacity: 0.5;
  }

  &.tm-chance-normal {
    border: 1px dashed Rgb(76 201 240 / 30%);
    background: Rgb(76 201 240 / 5%);
    color: #4cc9f0;
    opacity: 1;
  }

  &.tm-chance-hard {
    border: 1px dashed Rgb(255 215 0 / 30%);
    background: Rgb(255 215 0 / 5%);
    color: #ffd700;
    opacity: 1;
  }
}

.reward-extras {
  display: flex;
  gap: 6px;
}

.reward-pill {
  @include pixelated;

  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 6px;

  &.exp {
    background: Rgb(76 201 240 / 10%);
    color: #4cc9f0;
    border-color: Rgb(76 201 240 / 20%);
  }

  &.money {
    background: Rgb(255 215 0 / 10%);
    color: #ffd700;
    border-color: Rgb(255 215 0 / 20%);
  }

  &.claimed {
    background: Rgb(255 255 255 / 3%);
    color: #888;
    opacity: 0.55;
    border-color: Rgb(255 255 255 / 5%);
    
    s {
      opacity: 0.7;
    }
  }
}
</style>

