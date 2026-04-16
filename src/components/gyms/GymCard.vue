<script setup>
import { computed } from 'vue'
import { useGymsStore } from '@/stores/gyms'

const props = defineProps({
  gym: { type: Object, required: true },
  isDefeated: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false }
})

const gymsStore = useGymsStore()
const selectedDifficulty = defineModel('difficulty', { default: 'easy' })

const handleChallenge = () => {
  if (props.isLocked) return
  gymsStore.challengeGym(props.gym.id, selectedDifficulty.value)
}

const typeIcon = computed(() => {
  const icons = {
    rock: '🪨', water: '💧', electric: '⚡', grass: '🌿',
    poison: '☠️', psychic: '🔮', fire: '🔥', ground: '🌍'
  }
  return icons[props.gym.type] || '🏆'
})
</script>

<template>
  <div
    class="gym-card"
    :class="{ defeated: isDefeated, locked: isLocked }"
    :style="{ '--gym-color': gym.typeColor }"
  >
    <!-- Badge & Leader Header -->
    <div class="gym-header">
      <div class="badge-icon">
        {{ gym.badge }}
      </div>
      <div class="gym-info">
        <div class="gym-name">
          {{ gym.name }}
        </div>
        <div class="gym-city">
          {{ gym.city }}
        </div>
      </div>
      <div
        v-if="isDefeated"
        class="defeat-badge"
      >
        DEFROTADO ✓
      </div>
    </div>

    <!-- Leader Sprite & Quote -->
    <div class="gym-body">
      <div class="leader-wrap">
        <img
          :src="gym.sprite"
          :alt="gym.leader"
          class="leader-sprite"
        >
        <div class="leader-name">
          Líder {{ gym.leader }}
        </div>
      </div>
      <div class="gym-quote">
        "{{ isDefeated ? gym.victoryQuote : gym.quote }}"
      </div>
    </div>

    <!-- Difficulty & Action -->
    <div class="gym-footer">
      <div class="difficulty-selector">
        <button
          v-for="d in ['easy', 'normal', 'hard']"
          :key="d"
          class="diff-btn"
          :class="{ active: selectedDifficulty === d, [d]: true }"
          @click="selectedDifficulty = d"
        >
          {{ d === 'easy' ? 'Fácil' : d === 'normal' ? 'Normal' : 'Difícil' }}
        </button>
      </div>
      
      <button
        class="challenge-btn"
        :disabled="isLocked"
        @click="handleChallenge"
      >
        {{ isLocked ? `Requiere ${gym.badgesRequired} Medallas` : (isDefeated ? 'REAFIRMAR' : 'DESAFIAR') }}
      </button>
    </div>
    
    <div class="gym-type-tag">
      {{ typeIcon }} {{ gym.type.toUpperCase() }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.gym-card {
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: translateY(-5px);
    border-color: var(--gym-color);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  }

  &.defeated {
    border-color: var(--green);
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, transparent, rgba(var(--green-rgb), 0.05));
      pointer-events: none;
    }
  }

  &.locked {
    filter: #{'grayscale(0.8)'};
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.gym-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
}

.badge-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 10px var(--gym-color));
}

.gym-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #fff;
}

.gym-city {
  font-size: 11px;
  color: var(--gray);
  margin-top: 4px;
}

.defeat-badge {
  margin-left: auto;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  background: var(--green);
  color: #000;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 900;
}

.gym-body {
  padding: 12px 16px;
  display: flex;
  gap: 16px;
  flex: 1;
}

.leader-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.leader-sprite {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.5));
}

.leader-name {
  font-size: 10px;
  font-weight: 800;
  margin-top: 8px;
  color: var(--gym-color);
}

.gym-quote {
  font-size: 13px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  display: flex;
  align-items: center;
}

.gym-footer {
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.difficulty-selector {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 10px;
}

.diff-btn {
  border: none;
  background: transparent;
  color: var(--gray);
  font-size: 10px;
  font-weight: 700;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: #fff;
    color: #000;
    &.easy { background: var(--green); }
    &.normal { background: var(--yellow); }
    &.hard { background: var(--red); }
  }
}

.challenge-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--gym-color);
  background: transparent;
  color: var(--gym-color);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--gym-color);
    color: #fff;
    box-shadow: 0 0 20px var(--gym-color);
  }
  
  &:disabled {
    border-color: var(--gray);
    color: var(--gray);
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.gym-type-tag {
  position: absolute;
  top: 10px;
  right: -30px;
  background: var(--gym-color);
  color: #fff;
  font-size: 8px;
  font-weight: 900;
  padding: 4px 40px;
  transform: rotate(45deg);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
</style>
