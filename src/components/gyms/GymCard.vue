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
    class="gym-card-legacy"
    :class="{ defeated: isDefeated, locked: isLocked }"
    :style="{ '--gym-color': gym.typeColor }"
  >
    <!-- LEGACY HEADER: Gradient + Info -->
    <div
      class="card-header-legacy"
      :style="{ background: `linear-gradient(135deg, ${gym.typeColor}22, ${gym.typeColor}08)` }"
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
            <span class="type-badge">{{ gym.type.toUpperCase() }}</span>
            <span class="medal-name">{{ gym.badge }} {{ gym.badgeName }}</span>
          </div>
        </div>
        <div class="leader-sprite-box">
          <img
            :src="gym.sprite"
            :alt="gym.name"
            class="pixel-sprite"
          >
        </div>
      </div>
    </div>

    <!-- LEGACY FOOTER: Preview + Action -->
    <div class="card-footer-legacy">
      <div class="preview-box">
        <div class="progress-txt">
          PROGRESOS: {{ gymsStore.isGymDefeated(gym.id) ? '1/1' : '0/1' }}
        </div>
        <!-- Team preview logic could go here if we had it, but following legacy 21_events.js style -->
      </div>

      <div class="action-box">
        <div
          v-if="isLocked"
          class="locked-tag"
        >
          🔒 Requiere {{ gym.badgesRequired }} medallas
        </div>
        <div
          v-else-if="isDefeated && !isReaffirming"
          class="won-tag"
        >
          ✅ GANADO HOY
        </div>
        <div
          v-else
          class="challenge-group"
        >
          <!-- Difficulty Tiny Buttons -->
          <div class="diff-selector">
            <button 
              v-for="d in ['easy', 'normal', 'hard']" 
              :key="d"
              class="diff-btn-retro"
              :class="{ active: selectedDifficulty === d, [d]: true }"
              @click="selectedDifficulty = d"
            >
              {{ d === 'easy' ? 'FÁCIL' : d === 'normal' ? 'NORMAL' : 'DIFÍCIL' }}
            </button>
          </div>
          <button
            class="retro-challenge-btn"
            :style="{ background: `linear-gradient(135deg, ${gym.typeColor}, ${gym.typeColor}cc)`, boxShadow: `0 4px 14px ${gym.typeColor}66` }"
            @click="handleChallenge"
          >
            ⚔️ {{ isDefeated ? 'REAFIRMAR' : 'DESAFIAR' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "sass:string";

.gym-card-legacy {
  background: #1c2128;
  border-radius: 20px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;

  &.defeated {
    border-color: rgba(107, 203, 119, 0.5);
  }

  &.locked {
    filter: string.unquote("grayScale(100%)");
    opacity: 0.6;
  }

  &:hover:not(.locked) {
    border-color: var(--gym-color);
    transform: translateY(-3px);
  }
}

.card-header-legacy {
  padding: 16px 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.leader-info {
  flex: 1;
  min-width: 0;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  .type-icon { font-size: 18px; }
  .gym-tag {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
  }
}

.location { font-size: 11px; color: #888; margin-bottom: 2px; }
.leader-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  span { color: #eee; }
}

.badges-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;

  .type-badge {
    background: var(--gym-color);
    color: #fff;
    font-size: 9px;
    padding: 3px 10px;
    border-radius: 10px;
    font-weight: 700;
  }
  .medal-name {
    font-size: 11px;
    color: #ffd700;
  }
}

.leader-sprite-box {
  flex-shrink: 0;
  width: 90px;
  text-align: center;

  .pixel-sprite {
    height: 90px;
    width: auto;
    image-rendering: pixelated;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
  }
}

.card-footer-legacy {
  padding: 12px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.progress-txt {
  font-size: 9px;
  color: #888;
  font-weight: 700;
}

.action-box {
  margin-left: auto;
}

.locked-tag {
  color: #ef4444;
  font-size: 10px;
  background: rgba(239, 68, 68, 0.1);
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.won-tag {
  color: #22c55e;
  font-size: 10px;
  font-weight: 700;
  background: rgba(34, 197, 94, 0.1);
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.challenge-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.diff-selector {
  display: flex;
  gap: 4px;
}

.diff-btn-retro {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #888;
  cursor: pointer;

  &.active {
    border-color: var(--gym-color);
    background: rgba(var(--gym-color), 0.2);
    color: #fff;
    
    &.easy { color: #22c55e; }
    &.normal { color: #ffd700; }
    &.hard { color: #ef4444; }
  }
}

.retro-challenge-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 20px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { transform: string.unquote("scale(#{1.05})"); }
}
</style>
