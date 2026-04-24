<script setup>
import PVTooltip from '@/components/common/PVTooltip.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, default: 255 },
  color: { type: String, default: '$white' },
  iv: { type: Number, default: null },
  mode: { type: String, default: 'full' } // 'full', 'stat', 'iv'
})

const getIvColor = (val) => {
  if (val >= 28) return '#6BCB77' 
  if (val >= 15) return '#FFD93D' 
  if (val >= 8) return '#FF9F43' 
  return '#FF5959' 
}

const getStatGrade = (iv) => {
  if (iv === 31) return { label: 'S', color: '#ffef3d' }
  if (iv >= 25) return { label: 'A', color: '#34d399' }
  if (iv >= 15) return { label: 'B', color: '#60a5fa' }
  if (iv >= 5) return { label: 'C', color: '#f59e0b' }
  return { label: 'D', color: '#94a3b8' }
}

const getStatLabel = (key) => {
  const map = {
    'HP': { name: 'Puntos de Salud', desc: 'Determina cuánto daño puede recibir el Pokémon antes de debilitarse.' },
    'ATK': { name: 'Ataque Físico', desc: 'Aumenta el daño de los movimientos de categoría Física.' },
    'DEF': { name: 'Defensa Física', desc: 'Reduce el daño recibido por movimientos de categoría Física.' },
    'SPA': { name: 'Ataque Especial', desc: 'Aumenta el daño de los movimientos de categoría Especial.' },
    'SPD': { name: 'Defensa Especial', desc: 'Reduce el daño recibido por movimientos de categoría Especial.' },
    'SPE': { name: 'Velocidad', desc: 'Determina qué Pokémon ataca primero en cada turno.' }
  }
  return map[key] || { name: key, desc: '' }
}
</script>

<template>
  <div
    class="vicio-stat-bar-row"
    :class="['mode-' + mode]"
  >
    <div class="stat-info">
      <PVTooltip
        :title="getStatLabel(label).name"
        :description="getStatLabel(label).desc"
        position="left"
      >
        <span class="stat-label pixelated">{{ label }}</span>
      </PVTooltip>
      <span class="stat-value pixelated">{{ value }}</span>
    </div>

    <div class="stat-visuals">
      <!-- Main Stat Bar (Real Value or IV) -->
      <div class="track main-track">
        <div 
          class="fill main-fill" 
          :style="{ 
            width: Math.min((value/max*100), 100) + '%', 
            background: mode === 'iv' ? getIvColor(value) : color,
            '--glow': (mode === 'iv' ? getIvColor(value) : color) + '66'
          }"
        />
      </div>

      <!-- Secondary IV Bar (only in full mode) -->
      <div
        v-if="mode === 'full' && iv !== null"
        class="track iv-track"
      >
        <div 
          class="fill iv-fill" 
          :style="{ 
            width: (iv/31*100) + '%', 
            background: getIvColor(iv)
          }"
        />
      </div>
    </div>

    <!-- Meta Info (Right Side) -->
    <div
      v-if="mode !== 'stat' && (iv !== null || mode === 'iv')"
      class="stat-meta"
    >
      <span
        class="grade"
        :style="{ color: getStatGrade(mode === 'iv' ? value : iv).color }"
      >{{ getStatGrade(mode === 'iv' ? value : iv).label }}</span>
      <span
        v-if="mode === 'full'"
        class="iv-num"
        :style="{ color: getIvColor(iv) }"
      >{{ iv }} IV</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vicio-stat-bar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  margin-bottom: 16px;
  position: relative;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 20px;
  }
}

.stat-info {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 130px;

  @media (max-width: 480px) {
    min-width: 0;
    width: 100%;
    justify-content: flex-start;
    gap: 10px;
  }

  .stat-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #94a3b8;
    width: 55px;
    image-rendering: pixelated;
    @media (max-width: 480px) { font-size: 8px; width: 45px; }
  }
  .stat-value {
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    color: $white;
    font-weight: bold;
    min-width: 50px;
    text-align: right;
    image-rendering: pixelated;
    @media (max-width: 480px) { font-size: 12px; min-width: 40px; }
  }
}

.stat-visuals {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px; 
  position: relative;
  min-width: 0; 
  padding: 2px 0;

  @media (max-width: 480px) {
    width: 100%;
    order: 3;
  }
}

.track {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;
}

.fill {
  height: 100%;
  border-radius: inherit;
  transition: width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.main-track {
  height: 18px;
  border-radius: 9px;
  @media (max-width: 480px) { height: 12px; }
}
.main-fill {
  box-shadow: 0 0 15px var(--glow);
}
.iv-track {
  height: 10px;
  border-radius: 5px;
  margin-top: 2px;
  @media (max-width: 480px) { height: 8px; }
}
.iv-fill {
  box-shadow: inset 0 0 5px rgba(255,255,255,0.2);
}

.stat-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 45px;
  justify-content: center;

  @media (max-width: 480px) {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 0;
    gap: 8px;
  }

  .grade {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 0 0 5px currentColor;
    image-rendering: pixelated;
    @media (max-width: 480px) { font-size: 10px; }
  }
  .iv-num {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    opacity: 0.9;
    image-rendering: pixelated;
    @media (max-width: 480px) { font-size: 8px; }
  }
}

.pixelated {
  image-rendering: pixelated;
}
</style>
