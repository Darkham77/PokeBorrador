<script setup lang="ts">
import { computed } from 'vue';
import type { TradeOffer, TradeCardMode } from '@/types/system/stores';

const props = defineProps<{
  trade: TradeOffer;
  mode: TradeCardMode;
}>();

const hasOffer = computed(
  () =>
    !!props.trade.offer_pokemon ||
    props.trade.offer_money > 0 ||
    Object.values(props.trade.offer_items ?? {}).some((q) => q !== undefined && q > 0)
);

const hasRequest = computed(
  () =>
    !!props.trade.request_pokemon ||
    props.trade.request_money > 0 ||
    Object.values(props.trade.request_items ?? {}).some((q) => q !== undefined && q > 0)
);

const offerItems = computed(() =>
  Object.entries(props.trade.offer_items ?? {}).filter(
    (entry): entry is [string, number] => entry[1] !== undefined && entry[1] > 0
  )
);
const requestItems = computed(() =>
  Object.entries(props.trade.request_items ?? {}).filter(
    (entry): entry is [string, number] => entry[1] !== undefined && entry[1] > 0
  )
);
</script>

<template>
  <div class="trade-assets-grid">
    <!-- Offer column -->
    <div class="asset-column offer">
      <span class="column-title">{{ mode === 'incoming' ? 'Ofrece:' : 'Ofreciste:' }}</span>
      <div class="assets-box">
        <div v-if="trade.offer_pokemon" class="asset-badge pokemon">
          <span class="emoji">🐾</span>
          <span class="badge-name">{{ trade.offer_pokemon.name }}</span>
          <span class="badge-level">Nv.{{ trade.offer_pokemon.level }}</span>
        </div>
        <div v-if="trade.offer_money > 0" class="asset-badge money">
          <span class="icon">₽</span>
          <span class="badge-val">{{ trade.offer_money.toLocaleString() }}</span>
        </div>
        <div v-for="[name, qty] in offerItems" :key="name" class="asset-badge item">
          <span class="emoji">🎒</span>
          <span class="badge-name">{{ name }}</span>
          <span class="badge-qty">x{{ qty }}</span>
        </div>
        <div v-if="!hasOffer" class="no-assets">Nada</div>
      </div>
    </div>

    <!-- Request column -->
    <div class="asset-column request">
      <span class="column-title">{{ mode === 'incoming' ? 'Pide a cambio:' : 'Pediste:' }}</span>
      <div class="assets-box">
        <div v-if="trade.request_pokemon" class="asset-badge pokemon requested">
          <span class="emoji">🐾</span>
          <span class="badge-name">{{ trade.request_pokemon.name }}</span>
          <span class="badge-level">Nv.{{ trade.request_pokemon.level }}</span>
        </div>
        <div v-if="trade.request_money > 0" class="asset-badge money requested">
          <span class="icon">₽</span>
          <span class="badge-val">{{ trade.request_money.toLocaleString() }}</span>
        </div>
        <div v-for="[name, qty] in requestItems" :key="name" class="asset-badge item requested">
          <span class="emoji">🎒</span>
          <span class="badge-name">{{ name }}</span>
          <span class="badge-qty">x{{ qty }}</span>
        </div>
        <div v-if="!hasRequest" class="no-assets gift">
          ¡Es un Regalo! <span class="emoji">🎁</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;

.trade-assets-grid {
  display: grid;
  gap: $spacing-md;
  grid-template-columns: 1fr 1fr;

  @media (width <= 500px) {
    grid-template-columns: 1fr;
  }
}

.asset-column {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;

  .column-title {
    color: Rgb(255 255 255 / 40%);
    font-size: var(--font-11);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .assets-box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: $spacing-sm-alt;
    min-height: 50px;
    padding: 8px;
    border: 1px solid Rgb(255 255 255 / 3%);
    border-radius: $radius-lg-alt;
    background: Rgb(0 0 0 / 20%);
  }
}

.asset-badge {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 6px 8px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-lg;
  background: Rgb(255 255 255 / 3%);

  .icon {
    font-size: var(--font-11);
  }

  .badge-name,
  .badge-val {
    color: var(--white);
    font-size: var(--font-12);
    font-weight: 600;
  }

  .badge-level,
  .badge-qty {
    color: Rgb(255 255 255 / 50%);
    font-size: var(--font-11);
    margin-left: auto;
  }

  &.pokemon {
    background: Rgb(168 85 247 / 6%);
    border-color: Rgb(168 85 247 / 12%);
  }
  &.money {
    background: Rgb(234 179 8 / 6%);
    border-color: Rgb(234 179 8 / 12%);
    .icon {
      color: var(--amber-400);
    }
    .badge-val {
      color: var(--amber-400);
      font-weight: bold;
    }
  }
  &.item {
    background: Rgb(59 130 246 / 6%);
    border-color: Rgb(59 130 246 / 12%);
  }

  &.requested {
    &.pokemon {
      background: Rgb(239 68 68 / 5%);
      border-color: Rgb(239 68 68 / 10%);
    }
    &.money {
      background: Rgb(239 68 68 / 5%);
      border-color: Rgb(239 68 68 / 10%);
      .icon,
      .badge-val {
        color: var(--red-300);
      }
    }
    &.item {
      background: Rgb(239 68 68 / 5%);
      border-color: Rgb(239 68 68 / 10%);
    }
  }
}

.no-assets {
  color: Rgb(255 255 255 / 30%);
  font-size: var(--font-11);
  text-align: center;

  &.gift {
    color: var(--green-light);
    font-weight: bold;
  }
}
</style>
