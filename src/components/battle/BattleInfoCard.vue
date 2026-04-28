<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'

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
        {{ p.name }}
      </span>
      <div
        v-if="p.gender"
        class="m-badge-gender"
        :class="getGenderCls(p.gender)"
      >
        {{ getGenderText(p.gender) }}
      </div>
      <img
        v-if="!isPlayer && p.caught"
        :src="getAssetUrl(ASSET_TYPES.ITEM, 'poke-ball')"
        class="caught-icon"
        @error="e => e.target.style.display = 'none'"
      >
    </div>
    
    <div class="level-row">
      <div class="poke-level m-badge-level">
        Nv. {{ p.level }}
      </div>
      <PokemonTypePills 
        :pokemon="p" 
        size="sm"
        class="poke-types"
      />
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-card {
  background: Rgba(15, 23, 42, 0.7);
  -webkit-backdrop-filter: Blur(12px); backdrop-filter: Blur(12px);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5);
  color: $white;
  @include gpu-layer;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.poke-name {
  @include pixelated;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.poke-level {
  margin-bottom: 0;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hp-bar-outer, .exp-bar-outer {
  width: 100%;
  height: 8px;
  background: Rgba(0,0,0,0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
  border: 1px solid Rgba(255,255,255,0.1);
}

.exp-bar-outer { height: 4px; }
.hp-bar-inner { 
  height: 100%; 
  transition: width 0.4s ease; 
  @include will-animate(width);
}
.exp-bar-inner { 
  height: 100%; 
  background: var(--blue); 
  transition: width 0.4s ease; 
  @include will-animate(width);
}

.hp-high { background: Linear-Gradient(90deg, Rgba(16, 185, 129, 1), Rgba(52, 211, 153, 1)); }
.hp-mid { background: Linear-Gradient(90deg, Rgba(245, 158, 11, 1), Rgba(251, 191, 36, 1)); }
.hp-low { background: Linear-Gradient(90deg, Rgba(239, 68, 68, 1), Rgba(248, 113, 113, 1)); }

.hp-values {
  @include pixelated;
  font-size: 8px;
  text-align: right;
  opacity: 0.8;
}

.status-badge {
  display: inline-block;
  margin-top: 5px;
  @include pixelated;
  font-size: 8px;
  padding: 2px 6px;
  background: Rgba(68, 68, 68, 1);
  border-radius: 4px;
  font-weight: bold;
}

.gender-male { color: Rgba(59, 139, 255, 1); }
.gender-female { color: Rgba(255, 110, 255, 1); }

.caught-icon {
  width: 16px;
  height: 16px;
  @include sprite-render;
}
</style>
