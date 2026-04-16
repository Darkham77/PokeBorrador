<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelectMode: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
  selectType: { type: String, default: null }, // 'rocket' | 'release'
  maxObeyLv: { type: Number, default: 100 }
})

const emit = defineEmits(['click', 'openDetail', 'openItem', 'sendToBox'])

const hpPct = computed(() => props.pokemon.hp / props.pokemon.maxHp)

const hpClass = computed(() => {
  if (hpPct.value > 0.5) return 'hp-green'
  if (hpPct.value > 0.2) return 'hp-yellow'
  return 'hp-red'
})

const tierInfo = computed(() => {
  if (typeof window.getPokemonTier === 'function') {
    return window.getPokemonTier(props.pokemon)
  }
  return { tier: '?', bg: '#333', color: '#fff' }
})

const disobeys = computed(() => props.pokemon.level > props.maxObeyLv)

const spriteUrl = computed(() => {
  if (typeof window.getSpriteUrl === 'function') {
    return window.getSpriteUrl(props.pokemon.id, props.pokemon.isShiny)
  }
  return ''
})

const cardClasses = computed(() => {
  const classes = ['team-card']
  if (props.pokemon.onMission) classes.push('on-mission')
  
  if (props.selectType === 'release') {
    classes.push(props.isSelected ? 'release-selected' : 'release-selectable')
  } else if (props.selectType === 'rocket') {
    classes.push(props.isSelected ? 'rocket-selected' : 'rocket-selectable')
  }
  
  if (props.pokemon.aura) classes.push(`aura-${props.pokemon.aura}-mini`)
  
  return classes
})

const handleClick = () => {
  if (props.pokemon.onMission && !props.isSelectMode) {
    if (typeof window.notify === 'function') {
      window.notify('¡Este Pokémon está en una misión!', '📋')
    }
    return
  }
  emit('click', props.index)
}
</script>

<template>
  <div
    :class="cardClasses"
    :draggable="!isSelectMode && !pokemon.onMission"
    @click="handleClick"
  >
    <!-- Checkmark para modos de selección -->
    <div
      v-if="isSelectMode && isSelected"
      :class="[selectType === 'release' ? 'release-check' : 'rocket-check']"
    >
      ✓
    </div>

    <!-- Held Item & Tags -->
    <div
      v-if="pokemon.heldItem || pokemon.tags?.length"
      class="badges-container"
    >
      <span v-if="pokemon.heldItem" class="item-icon">📦</span>
      <template v-for="tag in pokemon.tags" :key="tag">
        <span v-if="tag === 'fav'" class="tag-icon">⭐</span>
        <span v-if="tag === 'breed'" class="tag-icon">❤️</span>
        <span v-if="tag === 'iv31'" class="tag-icon">31</span>
      </template>
    </div>

    <!-- Obedience Warning -->
    <div v-if="disobeys" class="obedience-tag">
      NV ALTO
    </div>

    <!-- Mission Tag -->
    <div v-if="pokemon.onMission" class="mission-tag">
      📋 MISIÓN
    </div>

    <!-- Tier Tag -->
    <div
      class="tier-tag"
      :style="{ background: tierInfo.bg, color: tierInfo.color, borderColor: tierInfo.color + '44' }"
    >
      {{ tierInfo.tier }}
    </div>

    <div class="sprite-container">
      <img
        :src="spriteUrl"
        :alt="pokemon.name"
        class="pokemon-sprite"
      >
    </div>

    <div class="pokemon-info">
      <div class="pokemon-name">
        {{ pokemon.name }}{{ pokemon.isShiny ? ' ✨' : '' }}
      </div>
      <div class="pokemon-level">
        Nv. {{ pokemon.level }}
      </div>
      
      <div class="hp-bar-wrap">
        <div
          :class="['hp-bar', hpClass]"
          :style="{ width: (hpPct * 100) + '%' }"
        />
      </div>
      
      <div class="hp-text">
        {{ pokemon.hp }}/{{ pokemon.maxHp }} HP
      </div>
    </div>

    <!-- Quick Actions (solo si no estamos en modo selección) -->
    <div v-if="!isSelectMode" class="card-actions">
      <button
        class="action-btn item-btn"
        @click.stop="emit('openItem', index)"
      >
        🎒 OBJETO
      </button>
      <button
        class="action-btn data-btn"
        @click.stop="emit('openDetail', index)"
      >
        👁️ DATOS
      </button>
      <button
        class="action-btn box-btn"
        @click.stop="emit('sendToBox', index)"
      >
        📦 CAJA
      </button>
    </div>
  </div>
</template>

<style scoped>
.team-card {
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.team-card:hover {
  background: var(--card2);
  border-color: rgba(255, 255, 255, 0.1);
}

.on-mission { opacity: 0.6; cursor: not-allowed; }

.badges-container {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tag-icon { font-size: 10px; }
.item-icon { font-size: 12px; }

.obedience-tag {
  position: absolute;
  bottom: 120px;
  left: 8px;
  background: var(--red);
  color: white;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid white;
  z-index: 2;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

.mission-tag {
  position: absolute;
  top: 8px;
  right: 45px;
  background: #fbbf24;
  color: #000;
  border-radius: 6px;
  font-size: 6px;
  font-weight: bold;
  padding: 4px 6px;
  z-index: 3;
}

.tier-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid;
  z-index: 2;
}

.sprite-container {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.pokemon-sprite {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
}

.pokemon-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  margin-bottom: 4px;
}

.pokemon-level {
  font-size: 11px;
  color: var(--gray);
  margin-bottom: 8px;
}

.hp-bar-wrap {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 4px;
}

.hp-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.hp-green { background: var(--green); }
.hp-yellow { background: var(--yellow); }
.hp-red { background: var(--red); }

.hp-text {
  font-size: 11px;
  color: var(--gray);
}

.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 45%;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  border-radius: 8px;
  padding: 8px 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.item-btn { color: var(--green); background: rgba(107,203,119,0.1); border-color: rgba(107,203,119,0.2); }
.data-btn { color: var(--purple); background: rgba(199,125,255,0.1); border-color: rgba(199,125,255,0.2); }
.box-btn { color: var(--blue); background: rgba(59,139,255,0.1); border-color: rgba(59,139,255,0.2); min-width: 100%; }

.action-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }

/* Selection Styles */
.release-check, .rocket-check {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  background: var(--green);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
}

.release-selected { border-color: var(--red); background: rgba(255, 59, 59, 0.1); }
.rocket-selected { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
</style>
