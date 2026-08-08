<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  label: string
  value: number
  max?: number
  color?: string
  iv?: number | null
  mode?: 'full' | 'stat' | 'iv'
}

const DEFAULT_MAX_BASE_STAT = 255

withDefaults(defineProps<Props>(), {
  max: DEFAULT_MAX_BASE_STAT,
  color: '$white',
  iv: null,
  mode: 'full'
})

const getIvColor = (val: number) => {
  if (val >= 28) return 'Rgba(107, 203, 119, 1)' 
  if (val >= 15) return 'Rgba(255, 217, 61, 1)' 
  if (val >= 8) return 'Rgba(255, 159, 67, 1)' 
  return 'Rgba(255, 89, 89, 1)' 
}

const getStatGrade = (iv: number) => {
  if (iv === 31) return { label: 'S', color: 'Rgba(255, 239, 61, 1)' }
  if (iv >= 25) return { label: 'A', color: 'Rgba(52, 211, 153, 1)' }
  if (iv >= 15) return { label: 'B', color: 'Rgba(96, 165, 250, 1)' }
  if (iv >= 5) return { label: 'C', color: 'Rgba(245, 158, 11, 1)' }
  return { label: 'D', color: 'Rgba(148, 163, 184, 1)' }
}

const getStatLabel = (key: string) => {
  const map: Record<string, { name: string, desc: string }> = {
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
            width: ((iv as number)/31*100) + '%', 
            background: getIvColor(iv as number)
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
        :style="{ color: getStatGrade(mode === 'iv' ? (value || 0) : (iv || 0)).color }"
      >{{ getStatGrade(mode === 'iv' ? (value || 0) : (iv || 0)).label }}</span>
      <span
        v-if="mode === 'full'"
        class="iv-num"
        :style="{ color: getIvColor(iv || 0) }"
      >{{ iv }} IV</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
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
    @include pixelated;
    font-size: 10px;
    color: Rgba(148, 163, 184, 1);
    width: 55px;
    @include pixelated;
    @media (max-width: 480px) { font-size: 8px; width: 45px; }
  }
  .stat-value {
    @include pixelated;
    font-size: 16px;
    color: var(--white);
    font-weight: bold;
    min-width: 50px;
    text-align: right;
    @include pixelated;
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
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;
}

.fill {
  height: 100%;
  border-radius: inherit;
  
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
  box-shadow: inset 0 0 5px Rgba(255,255,255,0.2);
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
    @include pixelated;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 0 0 5px currentColor;
    @include pixelated;
    @media (max-width: 480px) { font-size: 10px; }
  }
  .iv-num {
    @include pixelated;
    font-size: 9px;
    opacity: 0.9;
    @include pixelated;
    @media (max-width: 480px) { font-size: 8px; }
  }
}

.pixelated {
  @include pixelated;
}
</style>
