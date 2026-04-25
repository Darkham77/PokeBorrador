<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

defineProps({
  history: { type: Array, default: () => [] }
})

const isHistoryOpen = computed({
  get: () => uiStore.isHistoryOpen,
  set: (val) => { uiStore.isHistoryOpen = val }
})
</script>

<template>
  <div class="legacy-info-row">
    <div class="notifications-header-legacy">
      <div class="info-label">
        NOTIFICACIONES
      </div>
      <button
        class="history-btn-legacy"
        @click="isHistoryOpen = !isHistoryOpen"
      >
        Ver ultimas 10 ({{ history.length }})
      </button>
    </div>
    
    <div
      v-show="isHistoryOpen"
      class="history-container-legacy custom-scrollbar"
    >
      <div
        v-for="(n, i) in history.slice().reverse()"
        :key="i"
        class="notification-entry-legacy"
      >
        <span class="notif-icon">{{ n.icon || '🔔' }}</span>
        <div class="notif-body">
          <div class="notif-text">
            {{ n.msg }}
          </div>
          <div class="notif-time">
            {{ new Date(n.ts).toLocaleTimeString() }}
          </div>
        </div>
      </div>
      <div
        v-if="!history.length"
        class="empty-notif-legacy"
      >
        Sin notificaciones recientes.
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.legacy-info-row {
  margin-bottom: 24px;
}

.info-label {
  @include pixelated;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

.notifications-header-legacy {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-btn-legacy {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 12px;
  color: #facc15;
  @include pixelated;
  font-size: 6px;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.08); }
}

.history-container-legacy {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
  min-height: 0;
}

.notification-entry-legacy {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  &:last-child { border-bottom: none; }
  
  .notif-icon { font-size: 16px; }
  .notif-body { flex: 1; }
  .notif-text { font-size: 12px; color: #cbd5e1; line-height: 1.4; }
  .notif-time { font-size: 9px; color: #475569; margin-top: 4px; }
}

.empty-notif-legacy {
  padding: 20px;
  text-align: center;
  font-size: 11px;
  color: #475569;
}

</style>
