<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useTradeStore } from '@/stores/trade';
import { useGameStore } from '@/stores/game';
import { gsap } from 'gsap';
import TradeCard from '@/components/social/TradeCard.vue';
import ClaimCard from '@/components/social/ClaimCard.vue';
import type { TradeOffer } from '@/types/system/stores';
import type { ClaimItem } from '@/types/system/game';
import { isItemId, getItemById } from '@/data/inventory/items';

type SubTab = 'received' | 'sent' | 'claims';

const TRADE_CARD_INITIAL_OPACITY = 0;
const TRADE_CARD_INITIAL_X_OFFSET = -20;
const TRADE_CARD_INITIAL_SCALE = 0.95;
const TRADE_CARD_ANIM_DURATION_SEC = 0.4;
const TRADE_CARD_ANIM_STAGGER_SEC = 0.05;

const tradeStore = useTradeStore();
const gameStore = useGameStore();

const subTab = ref<SubTab>('received');
const listRef = ref<HTMLElement | null>(null);

/* ── Validation map for incoming offers ── */
const validationMap = computed(() => {
  const result: Record<string, { can: boolean; reason?: string }> = {};
  tradeStore.pendingIncoming.forEach((t: TradeOffer) => {
    result[t.id] = canFulfill(t);
  });
  return result;
});

function canFulfill(t: TradeOffer): { can: boolean; reason?: string } {
  if (t.request_pokemon) {
    const all = [...(gameStore.state.team ?? []), ...(gameStore.state.box ?? [])];
    if (!all.some(p => p && p.uid === t.request_pokemon!.uid)) {
      return { can: false, reason: `No tenés el Pokémon solicitado: ${t.request_pokemon.name}` };
    }
  }
  if (t.request_money > 0 && gameStore.state.money < t.request_money) {
    return {
      can: false,
      reason: `Créditos insuficientes (tenés ₱${gameStore.state.money.toLocaleString()} de ₱${t.request_money.toLocaleString()})`,
    };
  }

  if (t.request_items) {
    for (const [id, qty] of Object.entries(t.request_items)) {
      if (isItemId(id) && qty !== undefined && qty > 0) {
        const owned = gameStore.state.inventory?.[id] ?? 0;
        if (owned < qty) {
          const item = getItemById(id);
          return { can: false, reason: `Objeto insuficiente: ${item.name} (tenés ${owned}/${qty})` };
        }
      }
    }
  }
  return { can: true };
}

/* ── Animation ── */
function animateCards() {
  nextTick(() => {
    if (!listRef.value) return;
    const cards = listRef.value.querySelectorAll('.trade-card, .claim-card');
    if (!cards.length) return;
    listRef.value.classList.add('tab-mounting');
    gsap.killTweensOf(cards);
    gsap.from(cards, {
      opacity: TRADE_CARD_INITIAL_OPACITY,
      x: TRADE_CARD_INITIAL_X_OFFSET,
      scale: TRADE_CARD_INITIAL_SCALE,
      duration: TRADE_CARD_ANIM_DURATION_SEC,
      stagger: TRADE_CARD_ANIM_STAGGER_SEC,
      ease: 'back.out(1.2)',
      clearProps: 'all',
      onComplete: () => listRef.value?.classList.remove('tab-mounting'),
    });
  });
}

function switchSubTab(target: SubTab) {
  subTab.value = target;
  animateCards();
}

/* ── Auto-switch to claims when an incoming trade is accepted ── */
function onTradeAccepted() {
  subTab.value = 'claims';
  animateCards();
}

/* ── Claims typed list ── */
const claimQueue = computed(() => (gameStore.state.claimQueue ?? []) as ClaimItem[]);

/* ── Reactive badge counts ── */
const receivedCount = computed(() => tradeStore.pendingIncoming.length);
const sentCount = computed(() => tradeStore.pendingOutgoing.length + tradeStore.pendingAccepted.length);
const claimsCount = computed(() => claimQueue.value.length);

onMounted(async () => {
  await tradeStore.refreshPendingTrades();
  if (receivedCount.value > 0) {
    subTab.value = 'received';
  } else if (claimsCount.value > 0) {
    subTab.value = 'claims';
  } else if (sentCount.value > 0) {
    subTab.value = 'sent';
  }
  animateCards();
});

watch(
  [subTab, () => tradeStore.pendingIncoming, () => tradeStore.pendingOutgoing, () => tradeStore.pendingAccepted, claimQueue],
  animateCards,
  { deep: true }
);
</script>

<template>
  <div class="social-tab-content">
    <!-- Sub-navigation -->
    <div class="trades-sub-nav">
      <button
        :class="{ active: subTab === 'received' }"
        @click.stop="switchSubTab('received')"
      >
        RECIBIDOS
        <span
          v-if="receivedCount > 0"
          class="sub-badge"
        >{{ receivedCount }}</span>
      </button>
      <button
        :class="{ active: subTab === 'sent' }"
        @click.stop="switchSubTab('sent')"
      >
        ENVIADOS
        <span
          v-if="sentCount > 0"
          class="sub-badge gray"
        >{{ sentCount }}</span>
      </button>
      <button
        :class="{ active: subTab === 'claims' }"
        @click.stop="switchSubTab('claims')"
      >
        RECLAMOS
        <span
          v-if="claimsCount > 0"
          class="sub-badge orange"
        >{{ claimsCount }}</span>
      </button>
    </div>

    <!-- Empty states -->
    <div
      v-if="subTab === 'received' && receivedCount === 0"
      class="empty-state"
    >
      <div class="icon emoji">
        📥
      </div>
      <p>No tenés ofertas de intercambio recibidas.</p>
    </div>
    <div
      v-else-if="subTab === 'sent' && sentCount === 0"
      class="empty-state"
    >
      <div class="icon emoji">
        📤
      </div>
      <p>No tenés ofertas de intercambio enviadas en espera.</p>
    </div>
    <div
      v-else-if="subTab === 'claims' && claimsCount === 0"
      class="empty-state"
    >
      <div class="icon emoji">
        📦
      </div>
      <p>No tenés reclamos pendientes.</p>
    </div>

    <!-- Card lists -->
    <div
      v-else
      ref="listRef"
      class="trades-list"
    >
      <!-- RECIBIDOS -->
      <template v-if="subTab === 'received'">
        <TradeCard
          v-for="t in tradeStore.pendingIncoming"
          :key="t.id"
          :trade="t"
          mode="incoming"
          :can-fulfill="validationMap[t.id]"
          @accepted="onTradeAccepted"
        />
      </template>

      <!-- ENVIADOS -->
      <template v-else-if="subTab === 'sent'">
        <TradeCard
          v-for="t in tradeStore.pendingAccepted"
          :key="t.id"
          :trade="t"
          mode="accepted"
          @claimed="onTradeAccepted"
        />
        <TradeCard
          v-for="t in tradeStore.pendingOutgoing"
          :key="t.id"
          :trade="t"
          mode="outgoing"
        />
      </template>

      <!-- RECLAMOS -->
      <template v-else-if="subTab === 'claims'">
        <ClaimCard
          v-for="claim in claimQueue"
          :key="claim.id"
          :claim="claim"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

/* ── Sub-navigation ──
   FIX: border is always 1px solid transparent so switching to .active
   (which sets a colored border) never changes the element's box-model
   height → no layout jump.                                              */
.trades-sub-nav {
  display: flex;
  background: Rgba(0, 0, 0, 0.25);
  border: 1px solid Rgba(199, 125, 255, 0.1);
  padding: 4px;
  border-radius: 12px;
  gap: 6px;
  margin-bottom: 18px;

  button {
    flex: 1;
    background: transparent;
    /* KEY FIX: transparent border prevents height shift on .active */
    border: 1px solid transparent;
    padding: 8px 12px;
    color: Rgba(255, 255, 255, 0.5);
    @include pixelated;
    font-size: 8px;
    cursor: pointer;
    border-radius: 8px;
    
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: bold;

    &:hover:not(.active) {
      background: Rgba(255, 255, 255, 0.03);
      color: Rgba(255, 255, 255, 0.8);
    }

    &.active {
      background: Rgba(168, 85, 247, 0.12);
      color: var(--purple-light);
      border-color: Rgba(168, 85, 247, 0.25);
    }

    .sub-badge {
      background: #ef4444;
      color: white;
      border-radius: 6px;
      font-size: 8px;
      min-width: 12px;
      height: 12px;
      padding: 0 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 6px Rgba(239, 68, 68, 0.4);

      &.gray   { background: #475569; box-shadow: none; color: #e2e8f0; }
      &.orange { background: #f59e0b; box-shadow: 0 0 6px Rgba(245, 158, 11, 0.4); color: #1e293b; }
    }
  }
}

/* ── Cards list ── */
.trades-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.tab-mounting :deep(.trade-card),
  &.tab-mounting :deep(.claim-card) {
    
  }
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  color: Rgba(148, 163, 184, 0.6);

  .icon {
    font-size: 40px;
    margin-bottom: 15px;
    filter: Drop-Shadow(0 0 8px Rgba(168, 85, 247, 0.15));
  }

  p { font-size: 14px; margin-bottom: 0; }
}
</style>
