<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { NATURE_DATA } from '@/data/battle/natures'
import { ABILITY_DATA } from '@/data/battle/abilities'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  pokemon: Pokemon
  context?: string
}

const props = withDefaults(defineProps<Props>(), {
  context: 'box'
})

const p = computed(() => props.pokemon)

const getHpPct = (cur: number, max: number) => (cur / max) * 100
const getHpClass = (pct: number) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

const getNatureInfo = (nature: string) => {
  if (!nature) return { up: null, down: null, desc: 'Sin datos de naturaleza.' }
  const data = NATURE_DATA as Record<string, { up: string | null; down: string | null; desc: string }>
  const entry = data[nature] || Object.entries(data).find(([k]) => k.toLowerCase() === nature.toLowerCase())?.[1]
  return entry || { up: null, down: null, desc: 'Naturaleza desconocida.' }
}

const getAbilityDesc = (ability: string) => {
  if (!ability) return 'Habilidad especial de este Pokémon.'
  const data = ABILITY_DATA as Record<string, string | { desc: string }>
  const entry = data[ability] || Object.entries(data).find(([k]) => k.toLowerCase() === ability.toLowerCase())?.[1]
  if (!entry) return 'Habilidad especial de este Pokémon.'
  return typeof entry === 'string' ? entry : (entry.desc || 'Habilidad especial de este Pokémon.')
}

const natureStyle = computed(() => {
  const info = getNatureInfo(p.value.nature)
  if (!info.up) return { color: '$gray' } // Neutral gray
  
  const colors: Record<string, string> = {
    'Ataque': '$red',
    'Defensa': '$yellow',
    'At. Esp': 'Rgba(59, 139, 255, 1)',
    'Def. Esp': '$green',
    'Velocidad': '$purple'
  }
  return { color: colors[info.up] || '$white' }
})

const abilityStyle = computed(() => ({
  color: '$green' // Special interactive green
}))
</script>

<template>
  <div class="status-container">
    <!-- General Info Grid -->
    <div class="info-grid">
      <PVTooltip
        title="NATURALEZA"
        :description="getNatureInfo(p.nature).desc"
        position="top"
        class="info-card nature-card"
      >
        <span class="label">Naturaleza</span>
        <div class="value-wrap">
          <span
            class="val interactive-val m-interactive-label"
            :style="natureStyle"
          >{{ p.nature || 'Serio' }}</span>
        </div>
      </PVTooltip>

      <PVTooltip
        title="HABILIDAD"
        :description="getAbilityDesc(p.ability || '')"
        position="top"
        class="info-card ability-card"
      >
        <span class="label">Habilidad</span>
        <div class="value-wrap">
          <span
            class="val interactive-val m-interactive-label"
            :style="abilityStyle"
          >{{ p.ability || '—' }}</span>
        </div>
      </PVTooltip>

      <PVTooltip
        title="VIGOR"
        :description="p.obtainedMethod === 'egg' ? 'Determina cuántas veces puede reproducirse este Pokémon en la Guardería. Se consume al criar y NO se recupera de forma natural. Las crías nacidas de huevo comienzan con vigor inicial reducido a la mitad por desgaste genético, pero puede aumentarse usando Caramelos de Vigor.' : 'Determina cuántas veces puede reproducirse este Pokémon en la Guardería. Se consume al criar y NO se recupera.'"
        position="top"
        class="info-card vigor-card"
      >
        <span class="label">Vigor</span>
        <span class="val vigor-val"><span class="vigor-icon">⚡</span>{{ p.vigor !== undefined ? p.vigor : 0 }}/{{ p.maxVigor !== undefined ? p.maxVigor : 10 }}</span>
      </PVTooltip>
    </div>

    <!-- Egg Born Badge -->
    <div
      v-if="p.obtainedMethod === 'egg'"
      class="egg-born-badge pixelated"
    >
      🥚 Nacido de Huevo (Cría)
    </div>

    <!-- HP & EXP -->
    <div class="status-section glass-inset">
      <div class="bar-group">
        <div class="bar-header">
          <span>HP</span>
          <span>{{ p.hp }} / {{ p.maxHp }}</span>
        </div>
        <div class="progress-outer">
          <div 
            class="progress-inner" 
            :class="getHpClass(getHpPct(p.hp, p.maxHp))"
            :style="{ width: getHpPct(p.hp, p.maxHp) + '%' }"
          />
        </div>
      </div>
      <div
        v-if="context === 'team'"
        class="bar-group mt-12"
      >
        <div class="bar-header">
          <span>EXPERIENCIA</span>
          <span
            v-if="p.level >= 100"
            class="max-text"
          >MAX</span>
          <span
            v-else
            class="exp-text"
          >{{ p.exp || 0 }} / {{ p.expNeeded || 0 }}</span>
        </div>
        <div class="progress-outer exp">
          <div 
            class="progress-inner exp-fill" 
            :style="{ width: (p.level >= 100 ? 100 : (p.exp / p.expNeeded * 100)) + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-inset {
  padding: 0; // Remove padding
  margin-bottom: 0; // Standardized gap handled by parent or previous element
  background: none; // Remove frame
  border: none; // Remove frame
  box-shadow: none; // Remove frame
}

.bar-group { margin-bottom: 12px; }

.bar-header {
  display: flex;
  justify-content: space-between;
  @include pixelated;
  font-size: 10px;
  margin-bottom: 14px;
  color: var(--white);
  opacity: 0.9;
  @include pixelated;
}

.progress-outer {
  height: 16px;
  background: Rgba(0,0,0,0.4);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid Rgba(255,255,255,0.1);
  box-shadow: inset 0 2px 4px Rgba(0,0,0,0.3);
}

.progress-inner { 
  height: 100%; 
  
  box-shadow: 0 0 10px currentColor;
  @include will-animate(width);
}
.hp-high { background: Linear-Gradient(90deg, Rgba(16, 185, 129, 1), Rgba(52, 211, 153, 1)); color: Rgba(16, 185, 129, 1); }
.hp-mid { background: Linear-Gradient(90deg, Rgba(245, 158, 11, 1), Rgba(251, 191, 36, 1)); color: Rgba(245, 158, 11, 1); }
.hp-low { background: Linear-Gradient(90deg, Rgba(239, 68, 68, 1), Rgba(248, 113, 113, 1)); color: Rgba(239, 68, 68, 1); }

.exp-fill { 
  background: Linear-Gradient(90deg, Rgba(139, 92, 246, 1), Rgba(168, 85, 247, 1)); 
  color: Rgba(139, 92, 246, 1);
  @include will-animate(width);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.info-card {
  background: Rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 16px 8px; // Slightly less horizontal padding to allow more space
  display: flex !important; // Override PVTooltip inline-flex
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px solid Rgba(255, 255, 255, 0.08);
  
  cursor: help;
  min-height: 70px; // Ensure consistent height

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    transform: Translatey(-2px);
  }
}

.info-card .label {
  display: block;
  @include pixelated;
  font-size: 8px; // Slightly smaller to prevent overlap
  color: var(--gray);
  text-transform: uppercase;
  margin-bottom: 8px; // Good separation
  opacity: 0.8;
  @include pixelated;
}

.info-card .val {
  display: block;
  @include pixelated;
  font-size: 10px; // Standardized size for all values
  color: var(--white);
  @include pixelated;
  
  &.interactive-val {
    display: inline-block; // To keep the dotted border tight
  }
}

.value-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.vigor-val { 
  color: var(--yellow) !important; 
  text-shadow: 0 0 10px Rgba(255, 214, 10, 0.3) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.vigor-icon {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
  display: inline-block !important;
  vertical-align: middle !important;
  position: relative !important;
  top: -3px !important;
  font-size: 10px;
  line-height: 1;
}

.egg-born-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: Rgba(16, 185, 129, 0.12);
  border: 1px solid Rgba(16, 185, 129, 0.3);
  color: #34d399;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  margin: 0 auto 16px auto;
  width: fit-content;
  text-shadow: 0 0 5px Rgba(52, 211, 153, 0.3);
  box-shadow: 0 0 10px Rgba(52, 211, 153, 0.1);
  font-weight: bold;
  @include pixelated;
}

.mt-12 { margin-top: 12px; }
.max-text { color: var(--yellow); font-size: 8px; }
.exp-text { color: var(--purple-light); font-size: 8px; }

@media (max-width: 480px) {
  .glass-inset { margin-bottom: 24px; }
  .bar-header { font-size: 8px; margin-bottom: 8px; }
  .progress-outer { height: 10px; }
  
  .info-grid { gap: 8px; }
  .info-card { padding: 12px 8px; }
  .info-card .label { font-size: 8px; margin-bottom: 8px; }
  .info-card .val { font-size: 10px; }
}
</style>
