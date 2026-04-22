<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, default: -1 },
  isPvp: { type: Boolean, default: false },
  maxObeyLv: { type: Number, default: 100 },
  // Permite configurar qué botones se muestran: 'item', 'details', 'box'
  actions: { type: Array, default: () => ['item', 'details', 'box'] }
})

const emit = defineEmits(['click', 'openDetail', 'openItem', 'sendToBox'])

const hpPct = computed(() => props.pokemon.hp / props.pokemon.maxHp)

const getHpClass = (pct) => {
  if (pct > 0.5) return 'hp-high'
  if (pct > 0.25) return 'hp-mid'
  return 'hp-low'
}

const BOX_TIER_CONFIG = {
  'S+': { min: 186, max: 186, color: '#FFD700', bg: 'rgba(255,215,0,0.25)', label: 'S+' },
  'S': { min: 168, max: 185, color: '#FFB800', bg: 'rgba(255,184,0,0.18)', label: 'S' },
  'A': { min: 140, max: 167, color: '#6BCB77', bg: 'rgba(107,203,119,0.18)', label: 'A' },
  'B': { min: 112, max: 139, color: '#3B8BFF', bg: 'rgba(59,139,255,0.18)', label: 'B' },
  'C': { min: 84, max: 111, color: '#C77DFF', bg: 'rgba(199,125,255,0.18)', label: 'C' },
  'D': { min: 56, max: 83, color: '#FF9632', bg: 'rgba(255,150,50,0.18)', label: 'D' },
  'F': { min: 0, max: 55, color: '#FF3B3B', bg: 'rgba(255,59,59,0.18)', label: 'F' },
}

const tierInfo = computed(() => {
  const ivs = props.pokemon.ivs || {}
  const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
                (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
  for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
    if (total >= cfg.min && total <= cfg.max) return { tier, total, ...cfg }
  }
  return { tier: 'F', total, ...BOX_TIER_CONFIG['F'] }
})

const disobeys = computed(() => props.pokemon.level > props.maxObeyLv)

const spriteUrl = computed(() => {
  return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
    isShiny: props.pokemon.isShiny 
  })
})

const cardClasses = computed(() => {
  const classes = ['pokemon-display-card']
  if (props.pokemon.onMission) classes.push('on-mission')
  if (props.pokemon.aura) classes.push(`aura-${props.pokemon.aura}-mini`)
  return classes
})

function renderGenderSymbol(gender) {
  if (gender === 'M') return '♂'
  if (gender === 'F') return '♀'
  return ''
}

function getGenderClass(gender) {
  if (gender === 'M') return 'gender-male'
  if (gender === 'F') return 'gender-female'
  return 'gender-none'
}

const hasBadges = computed(() => {
  return props.pokemon.heldItem || props.pokemon.isShiny || props.pokemon.tags?.includes('fav')
})
</script>

<template>
  <div
    :class="cardClasses"
    @click="emit('openDetail', index)"
  >
    <!-- Top Row: Items/Tags + Tier -->
    <div class="top-row">
      <div
        v-if="hasBadges"
        class="badges-area"
      >
        <div
          v-if="pokemon.heldItem"
          class="item-badge"
          title="Objeto Equipado"
        >
          <span class="icon">🎒</span>
        </div>
        <span
          v-if="pokemon.isShiny || pokemon.tags?.includes('fav')"
          class="star-icon"
        >⭐</span>
      </div>
      <div
        v-else
        class="badges-spacer"
      />

      <div
        class="tier-badge"
        :style="{ background: tierInfo.bg, color: tierInfo.color, borderColor: tierInfo.color + '44' }"
      >
        {{ tierInfo.tier }}
      </div>
    </div>

    <!-- Sprite Section -->
    <div class="sprite-section">
      <img
        :src="spriteUrl"
        :alt="pokemon.name"
        class="pokemon-sprite"
        @error="e => e.target.style.display = 'none'"
      >
    </div>

    <!-- Info Section -->
    <div class="pokemon-info">
      <div class="name-line">
        <span class="pokemon-name">{{ pokemon.name }}</span>
        <div
          v-if="pokemon.gender"
          :class="['gender-pill', getGenderClass(pokemon.gender)]"
        >
          {{ renderGenderSymbol(pokemon.gender) }}
        </div>
      </div>
      
      <div class="level-line">
        Nv. {{ pokemon.level }}
      </div>

      <!-- Status Labels (Floating) -->
      <div class="status-labels">
        <span
          v-if="disobeys"
          class="status-tag obedience"
        >NV ALTO</span>
        <span
          v-if="pokemon.onMission"
          class="status-tag mission"
        >EN MISIÓN</span>
      </div>
      
      <div class="hp-container">
        <div class="hp-bar-outer">
          <div
            :class="['hp-bar-inner', getHpClass(hpPct)]"
            :style="{ width: (hpPct * 100) + '%' }"
          />
        </div>
        <div class="hp-stats">
          {{ pokemon.hp }} / {{ pokemon.maxHp }} HP
        </div>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="card-footer">
      <div class="action-grid">
        <button
          v-if="actions.includes('item')"
          class="footer-btn item-btn"
          @click.stop="emit('openItem', index)"
        >
          <span class="emoji">🎒</span> OBJETO
        </button>
        <button
          v-if="actions.includes('details')"
          class="footer-btn data-btn"
          @click.stop="emit('openDetail', index)"
        >
          <span class="emoji">📊</span> DATOS
        </button>
        <button
          v-if="actions.includes('box') && !isPvp"
          class="footer-btn box-btn"
          @click.stop="emit('sendToBox', index)"
        >
          <span class="emoji">📦</span> CAJA
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pokemon-display-card {
  width: 100%;
  @include glass(rgba(30, 41, 59, 0.4), 12px);
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.05);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
    pointer-events: none;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
    border-color: rgba(255, 214, 10, 0.4);
    transform: TranslateY(-6px);
    box-shadow: 
      0 20px 50px rgba(0, 0, 0, 0.8),
      0 0 25px rgba(10, 132, 255, 0.1);

    &::before {
      background: radial-gradient(circle at 50% 0%, rgba(10, 132, 255, 0.1) 0%, transparent 70%);
    }

    .pokemon-sprite {
      transform: TranslateY(-25%) Scale(1.2); 
      filter: Drop-shadow(0 25px 45px rgba(0,0,0,0.9));
      image-rendering: pixelated;
    }
  }
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  position: relative;
  z-index: 3;
}

.badges-area {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .item-badge .icon { font-size: 14px; }
  .star-icon { font-size: 15px; color: var(--yellow); }
}

.badges-spacer { height: 24px; }

.tier-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Press Start 2P', monospace;
  font-size: 18px; // Larger tier letter
  border: 1.5px solid;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;

  &:hover { transform: Scale(1.1); filter: Brightness(1.2); }
}

.sprite-section {
  height: 50px; // Very short to force overflow and collapse space
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 35px 0 0 0;
  position: relative;
  z-index: 1;
  pointer-events: none;

  .pokemon-sprite {
    width: 180px; // Larger sprite
    height: 180px;
    image-rendering: pixelated;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    filter: Drop-shadow(0 10px 20px rgba(0,0,0,0.6));
    transform: TranslateY(-20%); 
    will-change: transform;
  }
}

.pokemon-info {
  text-align: center;
  margin-bottom: 15px;
  margin-top: -20px; // Pull up to collapse the transparent padding of the sprite
  position: relative;
  z-index: 2;

  .name-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;

    .pokemon-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 11px;
      color: $white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0,0,0,0.5);
    }

    .gender-pill {
      @include gender-badge(20px, 15px);
      &:hover { transform: Scale(1.1); }
    }
  }

  .level-line {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: var(--yellow);
    margin-bottom: 12px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }
}

.hp-container {
  margin-top: 10px;

  .hp-bar-outer {
    height: 8px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .hp-bar-inner {
    height: 100%;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    
    &.hp-high { background: linear-gradient(90deg, #22c55e, #86efac); }
    &.hp-mid { background: linear-gradient(90deg, #eab308, #fde047); }
    &.hp-low { background: linear-gradient(90deg, #ef4444, #fca5a5); }
  }

  .hp-stats {
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 6px;
  }
}

.status-labels {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;

  .status-tag {
    font-family: 'Press Start 2P', monospace;
    font-size: 6px;
    padding: 4px 6px;
    border-radius: 4px;
    
    &.obedience { background: var(--red); color: $white; }
    &.mission { background: #fbbf24; color: $black; }
  }
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  .footer-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    padding: 10px 4px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: $white;
    cursor: pointer;
    transition: all 0.2s;

    .emoji { font-size: 10px; }

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 214, 10, 0.4);
      transform: Scale(1.03);
    }

    &.item-btn { color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }
    &.data-btn { color: #c084fc; border-color: rgba(192, 132, 252, 0.3); }
    &.box-btn { grid-column: span 2; color: #60a5fa; border-color: rgba(96, 165, 250, 0.3); }
  }
}

.on-mission { opacity: 0.6; filter: Grayscale(0.5); }
</style>
