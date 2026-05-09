<script setup lang="ts">

import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { Temporal } from '@js-temporal/polyfill'

const uiStore = useUIStore()

import type { NotificationItem } from '@/types/game'

interface Props {
  history?: NotificationItem[]
}

defineProps<Props>()

const formatTime = (ts: string | number) => {
  try {
    const val = Number(ts)
    if (isNaN(val)) return '---'
    const instant = Temporal.Instant.fromEpochMilliseconds(val)
    return instant.toZonedDateTimeISO('UTC').toLocaleString()
  } catch {
    return '---'
  }
}

const isHistoryOpen = computed({
  get: () => uiStore.isHistoryOpen,
  set: (val: boolean) => { uiStore.isHistoryOpen = val }
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
        @click.stop="isHistoryOpen = !isHistoryOpen"
      >
        Ver ultimas 10 ({{ history.length }})
      </button>
    </div>
    
    <div
      v-show="isHistoryOpen"
      class="history-container-legacy custom-scrollbar"
    >
      <div
        v-for="n in history.slice().reverse()"
        :key="n.id"
        class="notification-entry-legacy"
      >
        <span class="notif-icon">{{ (n.meta?.icon as string) || '🔔' }}</span>
        <div class="notif-body">
          <div class="notif-text">
            <strong>{{ n.title }}</strong>: {{ n.message }}
          </div>
          <div class="notif-time">
            {{ formatTime(n.timestamp) }}
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
  color: Rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

.notifications-header-legacy {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-btn-legacy {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 12px;
  color: Rgba(250, 204, 21, 1);
  @include pixelated;
  font-size: 6px;
  cursor: pointer;
  &:hover { background: Rgba(255, 255, 255, 0.08); }
}

.history-container-legacy {
  background: Rgba(0, 0, 0, 0.2);
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
  border-bottom: 1px solid Rgba(255, 255, 255, 0.03);
  &:last-child { border-bottom: none; }
  
  .notif-icon { font-size: 16px; }
  .notif-body { flex: 1; }
  .notif-text { font-size: 12px; color: Rgba(203, 213, 225, 1); line-height: 1.4; }
  .notif-time { font-size: 9px; color: Rgba(71, 85, 105, 1); margin-top: 4px; }
}

.empty-notif-legacy {
  padding: 20px;
  text-align: center;
  font-size: 11px;
  color: Rgba(71, 85, 105, 1);
}

</style>
