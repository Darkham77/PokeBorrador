<script setup>
import { computed } from 'vue'

const props = defineProps({
  compatibility: { type: Object, required: true },
  compatText: { type: Object, required: true }
})

const compatStyle = computed(() => props.compatText[props.compatibility.level] || props.compatText[0])
</script>

<template>
  <div
    class="compat-panel-retro"
    :style="{ '--compat-color': compatStyle.color }"
  >
    <div class="compat-header">
      <span class="compat-icon">{{ compatibility.level > 0 ? '🧬' : '🔎' }}</span>
      <span class="compat-label">{{ compatStyle.label.toUpperCase() }}</span>
      <span
        v-if="compatibility.reason"
        class="compat-reason"
      >({{ compatibility.reason.toUpperCase() }})</span>
    </div>
    <div class="compat-bar-bg">
      <div
        class="compat-fill"
        :style="{ width: (compatibility.level / 3 * 100) + '%' }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.compat-panel-retro {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 30px;

  .compat-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 15px;
    .compat-icon { font-size: 20px; }
    .compat-label { 
      font-family: 'Press Start 2P', monospace; font-size: 9px; 
      color: var(--compat-color); text-shadow: 0 0 8px var(--compat-color);
    }
    .compat-reason { font-size: 10px; color: #475569; }
  }

  .compat-bar-bg { height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; }
  .compat-fill { height: 100%; background: var(--compat-color); box-shadow: 0 0 15px var(--compat-color); transition: width 0.8s; }
}
</style>
