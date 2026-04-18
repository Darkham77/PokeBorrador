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

const getHpClass = (pct) => {
  if (pct > 0.5) return 'hp-green'
  if (pct > 0.2) return 'hp-yellow'
  return 'hp-red'
}

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
    :style="{ cursor: pokemon.onMission ? 'not-allowed' : 'pointer' }"
    @click="handleClick"
  >
    <!-- Checkmark para modos de selección -->
    <div
      v-if="isSelectMode && isSelected"
      class="release-check"
    >
      ✓
    </div>

    <!-- Held Item & Tags -->
    <div
      v-if="pokemon.heldItem || pokemon.tags?.length"
      class="badges-container"
    >
      <span
        v-if="pokemon.heldItem"
        class="item-icon"
      >📦</span>
      <template
        v-for="tag in pokemon.tags"
        :key="tag"
      >
        <span
          v-if="tag === 'fav'"
          class="tag-icon"
        >⭐</span>
        <span
          v-if="tag === 'breed'"
          class="tag-icon"
        >❤️</span>
        <span
          v-if="tag === 'iv31'"
          class="tag-icon"
        >31</span>
      </template>
    </div>

    <!-- Obedience Warning -->
    <div
      v-if="disobeys"
      class="obedience-tag"
    >
      NV ALTO
    </div>

    <!-- Mission Tag -->
    <div
      v-if="pokemon.onMission"
      class="mission-tag"
    >
      📋 MISIÓN
    </div>

    <!-- Tier Tag -->
    <div
      class="tier-tag"
      :style="{ background: tierInfo.bg, color: tierInfo.color, borderColor: tierInfo.color + '44' }"
    >
      {{ tierInfo.tier }}
    </div>

    <!-- Sprite -->
    <div class="sprite-section">
      <img
        :src="spriteUrl"
        :alt="pokemon.name"
        class="pixelated pokemon-sprite"
      >
    </div>

    <!-- Info Section -->
    <div class="pokemon-info">
      <div class="name-row">
        <span class="pokemon-name">{{ pokemon.name }}{{ pokemon.isShiny ? ' ✨' : '' }}</span>
        <span class="pokemon-level">NV. {{ pokemon.level }}</span>
      </div>
      
      <div class="hp-section">
        <div class="hp-bar-outer">
          <div
            :class="['hp-bar-inner', getHpClass(hpPct)]"
            :style="{ width: (hpPct * 100) + '%' }"
          />
        </div>
        <div class="hp-text">
          {{ pokemon.hp }}/{{ pokemon.maxHp }} HP
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS -->
    <div
      v-if="!isSelectMode"
      class="card-actions"
    >
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

<style scoped lang="scss">
.team-card {
  background: #1a1a1a;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
  padding: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
}

.on-mission { opacity: 0.6; }

/* Badges */
.badges-container {
  position: absolute;
  top: 5px;
  left: 5px;
  background: rgba(0, 0, 0, 0.7);
  padding: 3px 6px;
  border: 2px solid #333;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 5;
}

.tag-icon { font-size: 10px; }
.item-icon { font-size: 12px; }

/* Status Tags */
.obedience-tag {
  position: absolute;
  bottom: 80px;
  left: 5px;
  background: #ff3b3b;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 3px 6px;
  border: 1px solid #fff;
  z-index: 10;
  animation: pulse 1s infinite;
}

.mission-tag {
  position: absolute;
  top: 5px;
  right: 45px;
  background: #fbbf24;
  color: #000;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 3px 6px;
  border: 1px solid #000;
  z-index: 10;
}

.tier-tag {
  position: absolute;
  top: 5px;
  right: 5px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 3px 6px;
  border: 1px solid;
  z-index: 5;
}

/* Sprite Section */
.sprite-section {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pokemon-sprite {
  width: 72px;
  height: 72px;
  filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5));
}

/* Info Section */
.pokemon-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pokemon-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  text-transform: uppercase;
}

.pokemon-level {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: #aaa;
}

/* HP Bar */
.hp-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hp-bar-outer {
  height: 10px;
  background: #000;
  border: 2px solid #333;
}

.hp-bar-inner {
  height: 100%;
  transition: width 0.3s steps(10);
}

.hp-green { background: #66ff66; }
.hp-yellow { background: #ffcc00; }
.hp-red { background: #ff4d4d; }

.hp-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: #888;
  text-align: right;
}

/* Actions */
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.action-btn {
  flex: 1;
  min-width: 45%;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 6px 2px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid #333;
}

.item-btn { color: #66ff66; background: rgba(102, 255, 102, 0.1); border-color: rgba(102, 255, 102, 0.2); }
.data-btn { color: #c77dff; background: rgba(199, 125, 255, 0.1); border-color: rgba(199, 125, 255, 0.2); }
.box-btn { color: #3b8bff; background: rgba(59, 139, 255, 0.1); border-color: rgba(59, 139, 255, 0.2); min-width: 100%; }

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #555;
}

/* Modes Selection */
.release-check {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  background: #66ff66;
  color: black;
  border: 3px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  z-index: 20;
}

.release-selected { border-color: #ff3b3b; background: rgba(255, 59, 59, 0.1); }
.rocket-selected { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }

@keyframes pulse {
  0% { transform: Scale(1.0); opacity: 0.8; }
  50% { transform: Scale(1.05); opacity: 1; }
  100% { transform: Scale(1.0); opacity: 0.8; }
}

.pixelated {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: pixelated;
  image-rendering: optimize-speed;
}
</style>
