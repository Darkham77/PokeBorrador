<script setup lang="ts">
import { computed } from 'vue';
import type { TradeOffer } from '@/types/stores';

const props = defineProps<{
  trade: TradeOffer;
  mode: 'incoming' | 'outgoing' | 'accepted';
}>();

const hasOffer = computed(() =>
  !!props.trade.offer_pokemon || props.trade.offer_money > 0 ||
  Object.values(props.trade.offer_items ?? {}).some(q => q > 0)
);

const hasRequest = computed(() =>
  !!props.trade.request_pokemon || props.trade.request_money > 0 ||
  Object.values(props.trade.request_items ?? {}).some(q => q > 0)
);

const offerItems = computed(() =>
  Object.entries(props.trade.offer_items ?? {}).filter(([, q]) => q > 0)
);
const requestItems = computed(() =>
  Object.entries(props.trade.request_items ?? {}).filter(([, q]) => q > 0)
);
</script>

<template>
  <div class="trade-assets-grid">
    <!-- Offer column -->
    <div class="asset-column offer">
      <span class="column-title">{{ mode === 'incoming' ? 'Ofrece:' : 'Ofreciste:' }}</span>
      <div class="assets-box">
        <div
          v-if="trade.offer_pokemon"
          class="asset-badge pokemon"
        >
          <span class="icon">🐾</span>
          <span class="badge-name">{{ trade.offer_pokemon.name }}</span>
          <span class="badge-level">Nv.{{ trade.offer_pokemon.level }}</span>
        </div>
        <div
          v-if="trade.offer_money > 0"
          class="asset-badge money"
        >
          <span class="icon">₽</span>
          <span class="badge-val">{{ trade.offer_money.toLocaleString() }}</span>
        </div>
        <div
          v-for="[name, qty] in offerItems"
          :key="name"
          class="asset-badge item"
        >
          <span class="icon">🎒</span>
          <span class="badge-name">{{ name }}</span>
          <span class="badge-qty">x{{ qty }}</span>
        </div>
        <div
          v-if="!hasOffer"
          class="no-assets"
        >
          Nada
        </div>
      </div>
    </div>

    <!-- Request column -->
    <div class="asset-column request">
      <span class="column-title">{{ mode === 'incoming' ? 'Pide a cambio:' : 'Pediste:' }}</span>
      <div class="assets-box">
        <div
          v-if="trade.request_pokemon"
          class="asset-badge pokemon requested"
        >
          <span class="icon">🐾</span>
          <span class="badge-name">{{ trade.request_pokemon.name }}</span>
          <span class="badge-level">Nv.{{ trade.request_pokemon.level }}</span>
        </div>
        <div
          v-if="trade.request_money > 0"
          class="asset-badge money requested"
        >
          <span class="icon">₽</span>
          <span class="badge-val">{{ trade.request_money.toLocaleString() }}</span>
        </div>
        <div
          v-for="[name, qty] in requestItems"
          :key="name"
          class="asset-badge item requested"
        >
          <span class="icon">🎒</span>
          <span class="badge-name">{{ name }}</span>
          <span class="badge-qty">x{{ qty }}</span>
        </div>
        <div
          v-if="!hasRequest"
          class="no-assets gift"
        >
          ¡Es un Regalo! 🎁
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.trade-assets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 500px) { grid-template-columns: 1fr; }
}

.asset-column {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .column-title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .assets-box {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 50px;
    justify-content: center;
  }
}

.asset-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 6px 8px;

  .icon { font-size: 11px; }

  .badge-name, .badge-val {
    font-size: 12px;
    font-weight: 600;
    color: var(--white);
  }

  .badge-level, .badge-qty {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-left: auto;
  }

  &.pokemon {
    background: rgba(168, 85, 247, 0.06);
    border-color: rgba(168, 85, 247, 0.12);
  }
  &.money {
    background: rgba(234, 179, 8, 0.06);
    border-color: rgba(234, 179, 8, 0.12);
    .icon { color: #facc15; }
    .badge-val { color: #facc15; font-weight: bold; }
  }
  &.item {
    background: rgba(59, 130, 246, 0.06);
    border-color: rgba(59, 130, 246, 0.12);
  }

  &.requested {
    &.pokemon { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.1); }
    &.money   { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.1); .icon, .badge-val { color: #fca5a5; } }
    &.item    { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.1); }
  }
}

.no-assets {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;

  &.gift { color: #4ade80; font-weight: bold; }
}
</style>
