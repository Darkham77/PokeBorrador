<script setup lang="ts">
import { computed } from 'vue'
import { useTradeStore } from '@/stores/trade'
import { useGameStore } from '@/stores/game'
import type { TradeOffer } from '@/types/system/stores'

const tradeStore = useTradeStore()
const gameStore = useGameStore()

const getOfferSummary = (t: TradeOffer) => {
  const parts: string[] = [] // text-ok
  if (t.offer_pokemon) parts.push(t.offer_pokemon.name)
  if (t.offer_items) {
    Object.entries(t.offer_items).forEach(([name, qty]) => {
      if (qty !== undefined && qty > 0) parts.push(`${name} x${qty}`)
    })
  }
  if (t.offer_money > 0) parts.push(`₽${t.offer_money.toLocaleString()}`)
  return parts.length > 0 ? parts.join(', ') : 'Nada'
}

const getRequestSummary = (t: TradeOffer) => {
  const parts: string[] = [] // text-ok
  if (t.request_pokemon) parts.push(t.request_pokemon.name)
  if (t.request_items) {
    Object.entries(t.request_items).forEach(([name, qty]) => {
      if (qty !== undefined && qty > 0) parts.push(`${name} x${qty}`)
    })
  }
  if (t.request_money > 0) parts.push(`₽${t.request_money.toLocaleString()}`)
  return parts.length > 0 ? parts.join(', ') : 'Nada (Regalo)'
}

const canFulfillTrade = (t: TradeOffer): { can: boolean; reason?: string } => {
  // 1. Check Pokémon
  if (t.request_pokemon) {
    const team = gameStore.state.team || []
    const box = gameStore.state.box || []
    const hasPoke = [...team, ...box].some(
      p => p && p.uid === t.request_pokemon!.uid
    )
    if (!hasPoke) {
      return { can: false, reason: `No tienes el Pokémon solicitado: ${t.request_pokemon.name}` }
    }
  }

  // 2. Check Money
  if (t.request_money > 0 && gameStore.state.money < t.request_money) {
    return { can: false, reason: `Créditos insuficientes (tienes ₱${gameStore.state.money.toLocaleString()} de ₱${t.request_money.toLocaleString()})` }
  }

  // 3. Check Items
  if (t.request_items) {
    for (const [name, qty] of Object.entries(t.request_items)) {
      if (qty !== undefined && qty > 0) {
        const ownedQty = gameStore.state.inventory?.[name] || 0
        if (ownedQty < qty) {
          return { can: false, reason: `Objeto insuficiente: ${name} (tienes ${ownedQty}/${qty})` }
        }
      }
    }
  }

  return { can: true }
}

const validationMap = computed(() => {
  const result: Record<string, { can: boolean; reason?: string }> = {}
  tradeStore.pendingIncoming.forEach(t => {
    result[t.id] = canFulfillTrade(t)
  })
  return result
})
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
      
      <div class="offer-details">
        <div class="detail-section">
          <span class="detail-label">Ofrece:</span>
          <span class="detail-val">{{ getOfferSummary(t) }}</span>
        </div>
        <div class="detail-section">
          <span class="detail-label">Pide:</span>
          <span class="detail-val">{{ getRequestSummary(t) }}</span>
        </div>
        <div
          v-if="t.message"
          class="detail-section message-text"
        >
          <span class="detail-label">Mensaje:</span>
          <span class="detail-val italic">"{{ t.message }}"</span>
        </div>
      </div>

      <!-- Warning if contract cannot be met -->
      <div
        v-if="!validationMap[t.id]?.can"
        class="notif-warning"
      >
        ⚠️ {{ validationMap[t.id]?.reason }}
      </div>

      <div class="notif-actions">
        <button
          class="notif-btn accept"
          :disabled="!validationMap[t.id]?.can"
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

.offer-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  background: Rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .detail-label {
      @include pixelated;
      font-size: 6px;
      color: Rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
    }

    .detail-val {
      @include pixelated;
      font-size: 8px;
      color: var(--white);
      word-break: break-word;

      &.italic {
        font-style: italic;
        color: var(--yellow);
      }
    }
  }
}

.notif-warning {
  @include pixelated;
  font-size: 7px;
  color: #ef4444;
  background: Rgba(239, 68, 68, 0.1);
  border: 1px dashed Rgba(239, 68, 68, 0.3);
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 12px;
  line-height: 1.4;
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
  
  &.accept { 
    background: Rgba(34, 197, 94, 1); 
    color: var(--white); 
    
    &:disabled {
      background: Rgba(255, 255, 255, 0.05) !important;
      border: 1px solid Rgba(255, 255, 255, 0.1);
      color: Rgba(255, 255, 255, 0.2);
      cursor: not-allowed;
    }
  }
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
