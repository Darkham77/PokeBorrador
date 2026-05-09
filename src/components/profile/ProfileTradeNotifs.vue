<script setup lang="ts">
import { useTradeStore } from '@/stores/trade'

const tradeStore = useTradeStore()
</script>

<template>
  <div
    v-if="tradeStore.pendingIncoming.length > 0 || tradeStore.pendingAccepted.length > 0"
    class="trade-notifs-section-legacy"
  >
    <div class="info-label">
      INTERCAMBIOS PENDIENTES
    </div>
    
    <div
      v-for="t in tradeStore.pendingAccepted"
      :key="t.id"
      class="trade-notif-card-legacy accepted"
    >
      <div class="notif-header">
        ✅ ¡OFERTA ACEPTADA!
      </div>
      <button
        class="notif-action-btn"
        @click.stop="tradeStore.claimTrade(t.id)"
      >
        ENTENDIDO
      </button>
    </div>

    <div
      v-for="t in tradeStore.pendingIncoming"
      :key="t.id"
      class="trade-notif-card-legacy pending"
    >
      <div class="notif-header">
        🔄 NUEVA OFERTA
      </div>
      <div class="notif-actions">
        <button
          class="notif-btn accept"
          @click.stop="tradeStore.acceptTrade(t.id)"
        >
          ACEPTAR
        </button>
        <button
          class="notif-btn reject"
          @click.stop="tradeStore.rejectTrade(t.id)"
        >
          RECHAZAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.trade-notifs-section-legacy {
  margin-bottom: 24px;
}

.info-label {
  @include pixelated;
  font-size: 9px;
  color: var(--white);
  text-shadow: 1px 1px 0 Rgba(0, 0, 0, 1), -1px -1px 0 Rgba(0, 0, 0, 1), 1px -1px 0 Rgba(0, 0, 0, 1), -1px 1px 0 Rgba(0, 0, 0, 1);
  margin-bottom: 12px;
}

.trade-notif-card-legacy {
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 10px;
  border-left: 4px solid $muted;
  
  &.accepted { border-left-color: Rgba(34, 197, 94, 1); }
  &.pending { border-left-color: Rgba(250, 204, 21, 1); }
}

.notif-header {
  @include pixelated;
  font-size: 8px;
  color: var(--white);
  margin-bottom: 12px;
}

.notif-actions {
  display: flex;
  gap: 8px;
}

.notif-btn {
  flex: 1;
  border: none;
  border-radius: 8px;
  padding: 8px;
  @include pixelated;
  font-size: 6px;
  cursor: pointer;
  
  &.accept { background: Rgba(34, 197, 94, 1); color: var(--white); }
  &.reject { background: Rgba(239, 68, 68, 1); color: var(--white); }
}

.notif-action-btn {
  width: 100%;
  background: Rgba(34, 197, 94, 1);
  border: none;
  border-radius: 8px;
  padding: 10px;
  color: var(--white);
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
}
</style>
