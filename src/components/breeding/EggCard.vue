<script setup>
const props = defineProps({
  egg: { type: Object, required: true }
})

const emit = defineEmits(['collect'])

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        @click="emit('collect', egg)"
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
.egg-card-retro {
  background: #1c2128; 
  border: 1px solid rgba(255,255,255,0.06); 
  padding: 20px; 
  border-radius: 16px;
  display: flex; 
  gap: 15px; 
  position: relative;
  
  &:hover { border-color: rgba(255,255,255,0.12); }
  
  .egg-icon-box { 
    font-size: 32px; 
    width: 60px; 
    height: 60px; 
    background: rgba(0,0,0,0.3); 
    border-radius: 12px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
  }
  
  .egg-name { font-size: 12px; font-weight: 800; color: #fff; margin-bottom: 5px; }
  .egg-time { font-size: 9px; color: #64748b; margin-bottom: 12px; }
  
  .collect-btn-retro { 
    width: 100%; 
    padding: 10px; 
    background: #a855f7; 
    color: #fff; 
    border: none; 
    border-radius: 8px;
    font-family: 'Press Start 2P', monospace; 
    font-size: 7px; 
    cursor: pointer;
    box-shadow: 0 4px 0 #7e22ce;
    
    &:active { transform: translateY(2px); box-shadow: none; }
  }
  
  .scan-tag { 
    position: absolute; 
    top: -10px; 
    right: -10px; 
    background: #000; 
    border: 1px solid #a855f7; 
    color: #a855f7; 
    padding: 4px 8px; 
    border-radius: 8px; 
    font-size: 9px; 
    font-weight: bold; 
  }
}
</style>
