<script setup lang="ts">
import { POKEMON_STAT_KEYS, type PokemonIVs, type PokemonStatKey } from '@/types/pokemon/pokemon'

interface Props {
  ivs: PokemonIVs
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:iv', stat: PokemonStatKey, val: number): void
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
          v-for="stat in POKEMON_STAT_KEYS"
          :key="stat"
          class="iv-item"
        >
          <label>{{ stat }}</label>
          <input
            :id="`debug-iv-${stat}`"
            :value="ivs[stat]"
            type="number"
            min="0"
            max="31"
            @input="(e: Event) => emit('update:iv', stat, parseInt((e.target as HTMLInputElement).value))"
          >
        </div>
      </div>
    </PVTooltip>
  </div>
</template>

<style lang="scss" scoped>
.iv-grid {
  display: grid;
  gap: $spacing-sm-alt;
  grid-template-columns: repeat(3, 1fr);
  padding: 8px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 3%);

  .iv-item {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    label {
      color: Rgb(255 255 255 / 40%); 
      font-size: var(--font-9); 
      text-align: center; 
      text-transform: uppercase;
    }
    
    input { 
      width: 100%;
      padding: 6px 2px;
      border: 1px solid Rgb(255 255 255 / 10%);
      border-radius: $radius-md;
      background: Rgb(0 0 0 / 40%);
      color: var(--yellow);
      font-size: var(--font-11);
      text-align: center;
      outline: none;
      appearance: textfield;
      
      &:focus {
        border-color: var(--vicio-primary);
      }
      
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        margin: 0;
        appearance: none;
      }
    }
  }
}
</style>
