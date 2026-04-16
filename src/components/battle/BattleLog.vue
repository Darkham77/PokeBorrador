<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import { useBattleStore } from '@/stores/battle'

const battleStore = useBattleStore()
const logContainer = ref(null)

const logs = computed(() => battleStore.battleLogs)

// Auto-scroll to bottom when new logs appear.
// The legacy system used unshift(), but the log normally grows downwards.
// I'll stick to the store's push logic if I change it, but currently it's unshift.
// If it's unshift, new logs are at the TOP.
watch(logs, () => {
  // If growth is downwards, scroll to bottom.
  // If growth is upwards (unshift), scroll to top.
  // Legacy look had new messages appearing at the bottom typically.
}, { deep: true })

</script>

<template>
  <div ref="logContainer" class="battle-log">
    <!-- Reversing logs to show oldest first if using unshift, 
         or just keep as is if we want new ones at the bottom -->
    <div 
      v-for="log in logs.slice().reverse()" 
      :key="log.id" 
      class="log-entry"
      :class="log.type"
      v-html="log.msg"
    >
    </div>
  </div>
</template>

<style scoped>
.battle-log {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column-reverse; /* New ones at bottom, but we reverse slice in template */
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.log-entry {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255,255,255,0.9);
  animation: slideIn 0.3s ease-out;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.log-entry:last-child {
  border-bottom: none;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Color overrides mapping to global types */
:deep(.log-info) { color: #fff; font-weight: 500; }
:deep(.log-damage) { color: #f87171; }
:deep(.log-heal) { color: #34d399; }
:deep(.log-status) { color: #c084fc; }
</style>
