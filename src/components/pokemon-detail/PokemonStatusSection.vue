<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  context: { type: String, default: 'box' }
})

const p = computed(() => props.pokemon)

const activeTooltip = ref(null) // 'nature', 'ability', null
const tooltipPos = ref({ x: 0, y: 0 })

const showTooltip = (type, event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  activeTooltip.value = type
  tooltipPos.value = {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 8
  }
}

const hideTooltip = () => {
  activeTooltip.value = null
}

// Ensure cleanup
onUnmounted(() => hideTooltip())

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
      <div
        class="info-card nature-card"
        @mouseenter="showTooltip('nature', $event)"
        @mouseleave="hideTooltip"
      >
        <span class="label">Naturaleza</span>
        <div class="value-wrap">
          <span class="val">{{ p.nature || 'Serio' }} ❓</span>
        </div>
      </div>
      <div
        class="info-card ability-card"
        @mouseenter="showTooltip('ability', $event)"
        @mouseleave="hideTooltip"
      >
        <span class="label">Habilidad</span>
        <div class="value-wrap">
          <span class="val">{{ p.ability || '—' }} ❓</span>
        </div>
      </div>
      <div class="info-card vigor-card">
        <span class="label">Vigor</span>
        <span class="val vigor-val">⚡{{ p.vigor || 0 }}</span>
      </div>
    </div>

    <!-- GLOBAL TOOLTIP (Teleported to body to avoid clipping) -->
    <Teleport to="body">
      <Transition name="fade-v">
        <div 
          v-if="activeTooltip" 
          class="vicio-global-tooltip"
          :style="{ 
            left: tooltipPos.x + 'px', 
            top: tooltipPos.y + 'px'
          }"
        >
          <template v-if="activeTooltip === 'nature'">
            <div class="tooltip-content">
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
          </template>
          
          <template v-if="activeTooltip === 'ability'">
            <div class="tooltip-content">
              <strong>{{ p.ability || '—' }}</strong>
              <p>{{ getAbilityDesc(p.ability) }}</p>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-inset {
  padding: 0; // Remove padding
  margin-bottom: 40px; // More space
  background: none; // Remove frame
  border: none; // Remove frame
  box-shadow: none; // Remove frame
}

.bar-group { margin-bottom: 12px; }

.bar-header {
  display: flex;
  justify-content: space-between;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  margin-bottom: 12px;
  color: $white;
  opacity: 0.9;
  @include pixelated;
}

.progress-outer {
  height: 12px;
  background: rgba(0,0,0,0.4);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.progress-inner { 
  height: 100%; 
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px currentColor;
}
.hp-high { background: linear-gradient(90deg, #10b981, #34d399); color: #10b981; }
.hp-mid { background: linear-gradient(90deg, #f59e0b, #fbbf24); color: #f59e0b; }
.hp-low { background: linear-gradient(90deg, #ef4444, #f87171); color: #ef4444; }

.exp-fill { 
  background: linear-gradient(90deg, #8b5cf6, #a855f7); 
  color: #8b5cf6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.info-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: TranslateY(-2px);
  }
}

.info-card .label {
  display: block;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px; // 6px causes blur
  color: var(--gray);
  text-transform: uppercase;
  margin-bottom: 8px;
  opacity: 0.8;
  @include pixelated;
}

.info-card .val {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: $white;
  text-shadow: none; // Shadows cause blur
  @include pixelated;
}

.vigor-val { 
  color: var(--yellow) !important; 
  text-shadow: 0 0 10px rgba(255, 214, 10, 0.3) !important;
}

/* Tooltip System (Global Teleported) */
.vicio-global-tooltip {
  position: fixed;
  transform: translateX(-50%);
  background: rgba(10, 15, 30, 0.98); // Deep glass
  backdrop-filter: Blur(20px);
  border: 1px solid rgba(255,255,255,0.15);
  padding: 40px;
  max-height: 85vh;
  min-height: 0; // Prevent flex collapse
  overflow-y: auto;
  z-index: var(--z-tooltip); // Standardized layer
  box-shadow: 0 15px 40px rgba(0,0,0,0.8);
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-bottom-color: rgba(255,255,255,0.15);
  }
}

.tooltip-content strong { 
  font-family: 'Press Start 2P', monospace;
  color: var(--yellow); 
  display: block; 
  margin-bottom: 10px; 
  font-size: 8px; 
  @include pixelated;
}
.tooltip-content p { font-size: 11px; color: #ddd; line-height: 1.5; margin: 0; }
.up { color: #34d399; font-weight: bold; } 
.down { color: #f87171; font-weight: bold; } 
.neutral { color: #94a3b8; }

/* Transition */
.fade-v-enter-active, .fade-v-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-v-enter-from, .fade-v-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.mt-12 { margin-top: 12px; }
.max-text { color: var(--yellow); font-size: 8px; }
.exp-text { color: var(--purple-light); font-size: 8px; }
</style>
