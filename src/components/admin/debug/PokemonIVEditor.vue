<script setup lang="ts">
interface Props {
  ivs: Record<string, number>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:iv', stat: string, val: number): void
}>()
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
            @input="(e: Event) => emit('update:iv', stat as string, parseInt((e.target as HTMLInputElement).value))"
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
  gap: 6px;
  background: Rgba(255, 255, 255, 0.03);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .iv-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label { 
      font-size: 9px; 
      color: Rgba(255, 255, 255, 0.4); 
      text-align: center;
    }
    
    input { 
      width: 100%;
      padding: 6px 2px;
      background: Rgba(0, 0, 0, 0.4);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      color: var(--yellow);
      text-align: center;
      font-size: 11px;
      border-radius: 6px;
      outline: none;
      -moz-appearance: textfield;
      
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      &:focus {
        border-color: var(--vicio-primary);
      }
    }
  }
}
</style>
