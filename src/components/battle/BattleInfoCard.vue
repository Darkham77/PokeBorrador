<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  isPlayer: { type: Boolean, default: false },
  nickStyle: { type: String, default: '' }
})

const p = computed(() => props.pokemon)

const getHpPct = (cur, max) => (cur / max) * 100
const getHpClass = (pct) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

const getGenderText = (g) => ({ M: '♂', F: '♀' }[g] || '')
const getGenderCls = (g) => ({ M: 'gender-male', F: 'gender-female' }[g] || 'gender-none')
</script>

<template>
  <div 
    class="glass-card battle-info-card" 
    :class="isPlayer ? 'player-card' : 'enemy-card'"
  >
    <div class="card-header">
      <span 
        class="poke-name" 
        :class="isPlayer ? nickStyle : ''"
      >
        {{ p.name }} <span v-if="p.isShiny">✨</span>
      </span>
      <span
        class="gender-badge"
        :class="getGenderCls(p.gender)"
      >{{ getGenderText(p.gender) }}</span>
      <img
        v-if="!isPlayer && p.caught"
        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.webp"
        class="caught-icon"
      >
    </div>
    
    <div class="poke-level">
      Nv. {{ p.level }}
    </div>

    <div class="hp-status">
      <div class="hp-bar-outer">
        <div
          class="hp-bar-inner"
          :class="getHpClass(getHpPct(p.hp, p.maxHp))"
          :style="{ width: getHpPct(p.hp, p.maxHp) + '%' }"
        />
      </div>
      
      <!-- EXP Bar only for player -->
      <div
        v-if="isPlayer"
        class="exp-bar-outer"
      >
        <div
          class="exp-bar-inner"
          :style="{ width: (p.exp / p.expNeeded * 100) + '%' }"
        />
      </div>

      <div class="hp-values">
        HP: {{ Math.max(0, p.hp) }}/{{ p.maxHp }}
      </div>
    </div>

    <div
      v-if="p.status"
      class="status-badge"
    >
      {{ p.status.toUpperCase() }}
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  color: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.poke-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.poke-level {
  font-size: 11px;
  color: var(--yellow);
  font-weight: bold;
  margin-bottom: 8px;
}

.hp-bar-outer, .exp-bar-outer {
  width: 100%;
  height: 8px;
  background: rgba(0,0,0,0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
  border: 1px solid rgba(255,255,255,0.1);
}

.exp-bar-outer { height: 4px; }
.hp-bar-inner { height: 100%; transition: width 0.4s ease; }
.exp-bar-inner { height: 100%; background: var(--blue); transition: width 0.4s ease; }

.hp-high { background: linear-gradient(90deg, #10b981, #34d399); }
.hp-mid { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.hp-low { background: linear-gradient(90deg, #ef4444, #f87171); }

.hp-values {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  text-align: right;
  opacity: 0.8;
}

.status-badge {
  display: inline-block;
  margin-top: 5px;
  font-size: 8px;
  padding: 2px 6px;
  background: #444;
  border-radius: 4px;
  font-weight: bold;
}

.gender-male { color: #3b8bff; }
.gender-female { color: #ff6eff; }

.caught-icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
}
</style>
