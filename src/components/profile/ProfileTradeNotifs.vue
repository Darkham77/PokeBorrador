<script setup lang="ts">
import { computed } from 'vue'
import { useTradeStore } from '@/stores/trade'
import { useGameStore } from '@/stores/game'
import type { TradeOffer } from '@/types/system/stores'
import { isItemId, getItemById } from '@/data/inventory/items'

const tradeStore = useTradeStore()
const gameStore = useGameStore()

const getOfferSummary = (t: TradeOffer) => {
  const parts: string[] = [] // text-ok: UI text display localization string
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
  const parts: string[] = [] // text-ok: UI text display localization string
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
    const hasPoke = !!gameStore.getPokemonByUid(t.request_pokemon.uid)
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
    for (const [id, qty] of Object.entries(t.request_items)) {
      if (isItemId(id) && qty !== undefined && qty > 0) {
        const ownedQty = gameStore.state.inventory?.[id] || 0
        if (ownedQty < qty) {
          const item = getItemById(id)
          return { can: false, reason: `Objeto insuficiente: ${item.name} (tienes ${ownedQty}/${qty})` }
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
        <span class="emoji">✅</span> ¡OFERTA ACEPTADA!
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
        <span class="emoji">🔄</span> NUEVA OFERTA
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
        <span class="emoji">⚠️</span> {{ validationMap[t.id]?.reason }}
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

  color: var(--white);
  font-size: 9px;
  text-shadow: 1px 1px 0 rgb(0 0 0 / 100%), -1px -1px 0 rgb(0 0 0 / 100%), 1px -1px 0 rgb(0 0 0 / 100%), -1px 1px 0 rgb(0 0 0 / 100%);
  margin-bottom: 12px;
}

.trade-notif-card-legacy {
  padding: 16px;
  border-radius: 14px;
  background: rgb(0 0 0 / 30%);
  margin-bottom: 10px;
  border-left: 4px solid $muted;
  
  &.accepted { border-left-color: rgb(34 197 94 / 100%); }
  &.pending { border-left-color: rgb(250 204 21 / 100%); }
}

.notif-header {
  @include pixelated;

  color: var(--white);
  font-size: 8px;
  margin-bottom: 12px;
}

.offer-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 8px;
  background: rgb(0 0 0 / 20%);
  margin-bottom: 12px;

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .detail-label {
      @include pixelated;

      color: rgb(255 255 255 / 40%);
      font-size: 6px;
      text-transform: uppercase;
    }

    .detail-val {
      @include pixelated;

      color: var(--white);
      font-size: 8px;
      overflow-wrap: break-word;

      &.italic {
        color: var(--yellow);
        font-style: italic;
      }
    }
  }
}

.notif-warning {
  @include pixelated;

  padding: 8px;
  border: 1px dashed rgb(239 68 68 / 30%);
  border-radius: 8px;
  background: rgb(239 68 68 / 10%);
  color: #ef4444;
  font-size: 7px;
  line-height: 1.4;
  margin-bottom: 12px;
}

.notif-actions {
  display: flex;
  gap: 8px;
}

.notif-btn {
  @include pixelated;

  padding: 8px;
  border: none;
  border-radius: 8px;
  font-size: 6px;
  flex: 1;
  cursor: pointer;
  
  &.accept { 
    background: rgb(34 197 94 / 100%); 
    color: var(--white); 
    
    &:disabled {
      border: 1px solid rgb(255 255 255 / 10%);
      background: rgb(255 255 255 / 5%) !important;
      color: rgb(255 255 255 / 20%);
      cursor: not-allowed;
    }
  }
  &.reject { background: rgb(239 68 68 / 100%); color: var(--white); }
}

.notif-action-btn {
  @include pixelated;

  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: rgb(34 197 94 / 100%);
  color: var(--white);
  font-size: 8px;
  cursor: pointer;
}
</style>
