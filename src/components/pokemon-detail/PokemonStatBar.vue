<script setup>

defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, default: 255 },
  color: { type: String, default: '#fff' },
  iv: { type: Number, default: null }
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
</script>

<template>
  <div class="vicio-stat-bar-row">
    <div class="stat-info">
      <span class="stat-label pixelated">{{ label }}</span>
      <span class="stat-value pixelated">{{ value }}</span>
    </div>

    <div class="stat-visuals">
      <!-- Main Stat Bar (Real Value) -->
      <div class="track main-track">
        <div 
          class="fill main-fill" 
          :style="{ 
            width: Math.min((value/max*100), 100) + '%', 
            background: color,
            '--glow': color + '66'
          }"
        />
      </div>

      <!-- IV Bar (Genetic Potential) -->
      <div
        v-if="iv !== null"
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
      v-if="iv !== null"
      class="stat-meta"
    >
      <span
        class="grade"
        :style="{ color: getStatGrade(iv).color }"
      >{{ getStatGrade(iv).label }}</span>
      <span
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
  gap: 24px;
  width: 100%;
  margin-bottom: 16px;
  position: relative;
}

.stat-info {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 130px;

  .stat-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #94a3b8;
    width: 55px;
    image-rendering: pixelated;
  }
  .stat-value {
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    color: #fff;
    font-weight: bold;
    min-width: 50px;
    text-align: right;
    image-rendering: pixelated;
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
}
.main-fill {
  box-shadow: 0 0 15px var(--glow);
}
.iv-track {
  height: 10px;
  border-radius: 5px;
  margin-top: 2px;
}
.iv-fill {
  box-shadow: inset 0 0 5px rgba(255,255,255,0.2);
}

.stat-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 100px;
  justify-content: flex-end;

  .grade {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px; // Much larger grade
    font-weight: bold;
    text-shadow: 0 0 5px currentColor;
    image-rendering: pixelated;
  }
  .iv-num {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px; // Larger IV label
    opacity: 0.9;
    image-rendering: pixelated;
  }
}

.pixelated {
  image-rendering: pixelated;
}
</style>
