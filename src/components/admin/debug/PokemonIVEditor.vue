<script setup>
import PVTooltip from '@/components/common/PVTooltip.vue'
const props = defineProps({
  ivs: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:iv'])

function updateIv(stat, val) {
  emit('update:iv', stat, val)
}
</script>

<template>
  <div class="iv-editor-section">
    <PVTooltip
      title="Valores individuales (IVs)"
      description="Potencial genético de cada estadística (rango 0-31)."
    >
      <div class="iv-grid">
        <div
          v-for="(val, stat) in ivs"
          :key="stat"
          class="iv-item"
        >
          <label>{{ stat.toUpperCase() }}</label>
          <input
            :value="val"
            type="number"
            min="0"
            max="31"
            @input="e => $emit('update:iv', stat, parseInt(e.target.value))"
          >
        </div>
      </div>
    </PVTooltip>
  </div>
</template>

<style lang="scss" scoped>
.iv-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .iv-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label { 
      font-size: 9px; 
      color: rgba(255, 255, 255, 0.4); 
      text-align: center;
    }
    
    input { 
      width: 100%;
      padding: 8px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--yellow);
      text-align: center;
      font-size: 10px;
      border-radius: 6px;
      outline: none;
      
      &:focus {
        border-color: var(--vicio-primary);
      }
    }
  }
}
</style>
