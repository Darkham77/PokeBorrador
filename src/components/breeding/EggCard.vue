<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill'

interface Props {
  egg: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'collect', egg: any): void
}>()

const formatDate = (dateStr: string) => {
  const date = Temporal.Instant.from(dateStr)
  return date.toZonedDateTimeISO('UTC').toLocaleString()
}
</script>

<template>
  <div class="egg-card-retro">
    <div class="egg-icon-box">
      🥚
    </div>
    <div class="egg-info">
      <div class="egg-name">
        HUEVO DE {{ egg.species.toUpperCase() }}
      </div>
      <div class="egg-time">
        GENERADO: {{ formatDate(egg.created_at) }}
      </div>
      <button
        class="collect-btn-retro"
        @click.stop="emit('collect', egg)"
      >
        RECOGER
      </button>
    </div>
    <div
      v-if="egg.inherited_ivs?._scanned"
      class="scan-tag"
    >
      🔍 {{ egg.inherited_ivs._predictedTotalIV }}/186
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.egg-card-retro {
  background: $card-dark; 
  border: 1px solid Rgba(255,255,255,0.06); 
  padding: 20px; 
  border-radius: 16px;
  display: flex; 
  gap: 15px; 
  position: relative;
  
  &:hover { border-color: Rgba(255,255,255,0.12); }
  
  .egg-icon-box { 
    font-size: 32px; 
    width: 60px; 
    height: 60px; 
    background: Rgba(0,0,0,0.3); 
    border-radius: 12px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
  }
  
  .egg-name { font-size: 12px; font-weight: 800; color: $white; margin-bottom: 5px; }
  .egg-time { font-size: 9px; color: $muted; margin-bottom: 12px; }
  
  .collect-btn-retro { 
    width: 100%; 
    padding: 10px; 
    background: Rgba(168, 85, 247, 1); 
    color: $white; 
    border: none; 
    border-radius: 8px;
    @include pixelated; 
    font-size: 7px; 
    cursor: pointer;
    box-shadow: 0 4px 0 #7e22ce;
    
    &:active { transform: Translatey(2px); box-shadow: 0 2px 0 #7e22ce; }
  }
  
  .scan-tag { 
    position: absolute; 
    top: -10px; 
    right: -10px; 
    background: $black; 
    border: 1px solid Rgba(168, 85, 247, 1); 
    color: Rgba(168, 85, 247, 1); 
    padding: 4px 8px; 
    border-radius: 8px; 
    font-size: 9px; 
    font-weight: bold; 
  }
}
</style>
