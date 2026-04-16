<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  context: { type: String, default: 'box' }
})

const p = computed(() => props.pokemon)

const getHpPct = (cur, max) => (cur / max) * 100
const getHpClass = (pct) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

const getNatureInfo = (nature) => {
  return window.NATURE_DATA?.[nature] || { up: null, down: null }
}

const getAbilityDesc = (ability) => {
  return window.ABILITY_DATA?.[ability] || 'Habilidad especial de este Pokémon.'
}
</script>

<template>
  <div class="status-container">
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

    <!-- General Info Grid -->
    <div class="info-grid">
      <div class="info-card nature-card">
        <span class="label">Naturaleza</span>
        <div class="value-wrap tooltip-trigger">
          <span class="val">{{ p.nature || 'Serio' }} ❓</span>
          <div class="custom-tooltip">
            <strong>{{ p.nature || 'Serio' }}</strong>
            <p v-if="getNatureInfo(p.nature).up">
              <span class="up">⬆ +10% {{ getNatureInfo(p.nature).up }}</span><br>
              <span class="down">⬇ -10% {{ getNatureInfo(p.nature).down }}</span>
            </p>
            <p
              v-else
              class="neutral"
            >
              Sin efecto en estadísticas
            </p>
          </div>
        </div>
      </div>
      <div class="info-card ability-card">
        <span class="label">Habilidad</span>
        <div class="value-wrap tooltip-trigger">
          <span class="val">{{ p.ability || '—' }} ❓</span>
          <div class="custom-tooltip">
            <strong>{{ p.ability || '—' }}</strong>
            <p>{{ getAbilityDesc(p.ability) }}</p>
          </div>
        </div>
      </div>
      <div class="info-card vigor-card">
        <span class="label">Vigor</span>
        <span class="val vigor-val">⚡{{ p.vigor || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-inset {
  background: rgba(0,0,0,0.3);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
}

.bar-group { margin-bottom: 4px; }

.bar-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #ddd;
}

.progress-outer {
  height: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.progress-inner { height: 100%; transition: width 0.6s ease-out; }
.hp-high { background: linear-gradient(90deg, #10b981, #34d399); }
.hp-mid { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.hp-low { background: linear-gradient(90deg, #ef4444, #f87171); }

.exp-fill { background: linear-gradient(90deg, var(--purple), #a855f7); }

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.info-card {
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 12px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.05);
}

.info-card .label {
  display: block;
  font-size: 9px;
  color: var(--gray);
  text-transform: uppercase;
  margin-bottom: 6px;
  font-weight: 900;
}

.info-card .val {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}

.vigor-val { color: var(--yellow) !important; }

/* Tooltip System */
.tooltip-trigger { position: relative; cursor: help; }
.custom-tooltip {
  visibility: hidden;
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 12px;
  border-radius: 12px;
  width: 200px;
  z-index: 100;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

.tooltip-trigger:hover .custom-tooltip { visibility: visible; }
.custom-tooltip strong { color: var(--yellow); display: block; margin-bottom: 8px; font-size: 11px; }
.custom-tooltip p { font-size: 10px; color: #cbd5e1; line-height: 1.4; margin: 0; }
.up { color: #34d399; } .down { color: #f87171; } .neutral { color: #94a3b8; }

.mt-12 { margin-top: 12px; }
.max-text { color: var(--yellow); font-size: 10px; }
.exp-text { color: var(--purple-light); font-size: 10px; }
</style>
