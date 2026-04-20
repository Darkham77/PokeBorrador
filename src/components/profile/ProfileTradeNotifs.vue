<script setup>
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
        @click="tradeStore.claimTrade(t.id)"
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
          @click="tradeStore.acceptTrade(t.id)"
        >
          ACEPTAR
        </button>
        <button
          class="notif-btn reject"
          @click="tradeStore.rejectTrade(t.id)"
        >
          RECHAZAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.trade-notifs-section-legacy {
  margin-bottom: 24px;
}

.info-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: #fff;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  margin-bottom: 12px;
}

.trade-notif-card-legacy {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 10px;
  border-left: 4px solid #64748b;
  
  &.accepted { border-left-color: #22c55e; }
  &.pending { border-left-color: #facc15; }
}

.notif-header {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
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
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  cursor: pointer;
  
  &.accept { background: #22c55e; color: #fff; }
  &.reject { background: #ef4444; color: #fff; }
}

.notif-action-btn {
  width: 100%;
  background: #22c55e;
  border: none;
  border-radius: 8px;
  padding: 10px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}
</style>
