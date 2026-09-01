<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getNatureInfo } from '@/data/battle/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getVigor, getMaxVigor } from '@/logic/pokemon/pokemonUtils'
import { getFriendshipTooltipDetails } from '@/logic/pokemon/friendshipLogic'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'

interface Props {
  pokemon: Pokemon
  context?: string
}

const props = withDefaults(defineProps<Props>(), {
  context: 'box'
})

const p = computed(() => props.pokemon)

const friendshipDetails = computed(() => getFriendshipTooltipDetails(p.value))
const friendshipSeal = computed(() => friendshipDetails.value.seal)
const friendshipPct = computed(() => (friendshipDetails.value.currentValue / 255) * 100)

const friendshipTooltipDesc = computed(() => {
  const d = friendshipDetails.value
  const quote = `«${d.evaluatorQuote}»`
  const evo = `🚀 ${d.evolutionMessage}`
  const battle = `⚔️ Retribución: ${d.returnPower} BP | Frustración: ${d.frustrationPower} BP`
  const perks = `⭐ ${d.combatPerksSummary}`
  return `${quote}\n\n${evo}\n${battle}\n${perks}`
})

const HP_HIGH_THRESHOLD_PCT = 50
const HP_MID_THRESHOLD_PCT = 25

const getHpPct = (cur: number, max: number) => (cur / max) * 100
const getHpClass = (pct: number) => {
  if (pct > HP_HIGH_THRESHOLD_PCT) return 'hp-high'
  if (pct > HP_MID_THRESHOLD_PCT) return 'hp-mid'
  return 'hp-low'
}

const getLevelPct = (level: number) => Math.min(100, Math.max(0, (level / MAX_POKEMON_LEVEL) * 100))

const getAbilityDesc = (ability: string) => {
  if (!ability) return 'Habilidad especial de este Pokémon.'
  const data = pokemonDataProvider.getAbilityData(ability)
  return data ? data.desc : 'Habilidad especial de este Pokémon.'
}

const getAbilityName = (ability: string) => {
  if (!ability) return '—'
  const data = pokemonDataProvider.getAbilityData(ability)
  return data ? data.name : ability
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
          >{{ getNatureInfo(p.nature).name || p.nature || 'Seria' }}</span>
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
          >{{ getAbilityName(p.ability || '') }}</span>
        </div>
      </PVTooltip>

      <PVTooltip
        title="VIGOR"
        :description="p.obtainedMethod === 'egg' ? 'Determina cuántas veces puede reproducirse este Pokémon en la Guardería. Se consume al criar y NO se recupera de forma natural. Las crías nacidas de huevo comienzan con vigor inicial reducido a la mitad por desgaste genético, pero puede aumentarse usando Caramelos de Vigor.' : 'Determina cuántas veces puede reproducirse este Pokémon en la Guardería. Se consume al criar y NO se recupera.'"
        position="top"
        class="info-card vigor-card"
      >
        <span class="label">Vigor</span>
        <span class="val vigor-val"><span class="emoji">⚡</span><span>{{ getVigor(p) }}/{{ getMaxVigor(p) }}</span></span>
      </PVTooltip>
    </div>

    <!-- Egg Born Badge -->
    <div
      v-if="p.obtainedMethod === 'egg'"
      class="egg-born-badge pixelated"
    >
      <span class="emoji">🥚</span> Nacido de Huevo (Cría)
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

      <!-- BARRA DE NIVEL -->
      <PVTooltip
        tag="div"
        class="level-tooltip-block mt-12"
        :title="`NIVEL ${p.level} / ${MAX_POKEMON_LEVEL}`"
        :description="p.level >= MAX_POKEMON_LEVEL ? 'Este Pokémon ha alcanzado el nivel máximo permitido.' : `Nivel actual: ${p.level}. Faltan ${MAX_POKEMON_LEVEL - p.level} niveles para alcanzar el nivel máximo (${MAX_POKEMON_LEVEL}).`"
        position="top"
        :touch-instant="true"
      >
        <div class="bar-group level-group">
          <div class="bar-header">
            <span>NIVEL</span>
            <span
              v-if="p.level >= MAX_POKEMON_LEVEL"
              class="max-text"
            >Nv. {{ p.level }} / {{ MAX_POKEMON_LEVEL }} (MAX)</span>
            <span
              v-else
              class="level-text"
            >Nv. {{ p.level }} / {{ MAX_POKEMON_LEVEL }}</span>
          </div>
          <div class="progress-outer level">
            <div 
              class="progress-inner level-fill" 
              :style="{ width: getLevelPct(p.level) + '%' }"
            />
          </div>
        </div>
      </PVTooltip>

      <!-- BARRA DE EXPERIENCIA -->
      <div class="bar-group mt-12">
        <div class="bar-header">
          <span>EXPERIENCIA</span>
          <span
            v-if="p.level >= MAX_POKEMON_LEVEL"
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
            :style="{ width: (p.level >= MAX_POKEMON_LEVEL ? 100 : (p.exp / p.expNeeded * 100)) + '%' }"
          />
        </div>
      </div>

      <!-- AMISTAD / VÍNCULO BAR -->
      <PVTooltip
        tag="div"
        class="friendship-tooltip-block mt-12"
        :title="`${friendshipSeal.iconEmoji} ${friendshipSeal.label} (${friendshipDetails.currentValue}/255)`"
        :description="friendshipTooltipDesc"
        position="top"
        :touch-instant="true"
      >
        <div class="bar-group friendship-group">
          <div class="bar-header">
            <span>AMISTAD ({{ friendshipSeal.label }})</span>
            <span class="friendship-val">
              <span class="emoji">{{ friendshipSeal.iconEmoji }}</span>
              <span>{{ friendshipDetails.currentValue }} / 255</span>
            </span>
          </div>
          <div class="progress-outer friendship">
            <div 
              class="progress-inner" 
              :class="friendshipSeal.barGradientClass"
              :style="{ width: friendshipPct + '%' }"
            />
          </div>
        </div>
      </PVTooltip>
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

.friendship-tooltip-block,
.level-tooltip-block {
  display: block !important;
  width: 100%;
  cursor: help;
}

.bar-group { 
  margin-bottom: 12px; 
  
  &.friendship-group,
  &.level-group {
    margin-bottom: 0;
  }
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  @include pixelated;
  font-size: 10px;
  margin-bottom: 6px;
  color: var(--white);
  opacity: 0.9;
}

.friendship-val {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;

  .seal-emoji {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    line-height: 1;
  }
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

.level-fill {
  background: linear-gradient(90deg, #0ea5e9, #38bdf8, #60a5fa);
  color: #38bdf8;
  @include will-animate(width);
}

.friendship-distrust {
  background: linear-gradient(90deg, #475569, #64748b);
  color: #64748b;
}

.friendship-sprout {
  background: linear-gradient(90deg, #16a34a, #4ade80);
  color: #22c55e;
}

.friendship-comrade {
  background: linear-gradient(90deg, #2563eb, #60a5fa);
  color: #3b82f6;
}

.friendship-radiant {
  background: linear-gradient(90deg, #c026d3, #f472b6);
  color: #e879f9;
}

.friendship-best-friends {
  background: linear-gradient(90deg, #d97706, #fbbf24, #fef08a);
  color: #fbbf24;
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

.info-card .val.vigor-val,
.vigor-val { 
  color: var(--yellow) !important; 
  text-shadow: 0 0 10px Rgba(255, 214, 10, 0.3) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px;
  line-height: 1;

  .vigor-icon {
    font-size: 10px;
  }
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
.level-text { color: #38bdf8; font-size: 8px; }
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
