<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useTradeStore } from '@/stores/trade';
import { useGameStore } from '@/stores/game';
import { gsap } from 'gsap';
import TradeCard from '@/components/social/TradeCard.vue';
import ClaimCard from '@/components/social/ClaimCard.vue';
import SocialTradesSubNav from '@/components/social/SocialTradesSubNav.vue';
import type { TradeOffer } from '@/types/system/stores';
import type { ClaimItem } from '@/types/system/game';
import {
  type TradeSubTab,
  canFulfillTradeOffer,
  resolveTradeEmptyState
} from './socialTradesHelper';

const TRADE_CARD_INITIAL_OPACITY = 0;
const TRADE_CARD_INITIAL_X_OFFSET = -20;
const TRADE_CARD_INITIAL_SCALE = 0.95;
const TRADE_CARD_ANIM_DURATION_SEC = 0.4;
const TRADE_CARD_ANIM_STAGGER_SEC = 0.05;

const tradeStore = useTradeStore();
const gameStore = useGameStore();

const subTab = ref<TradeSubTab>('received');
const listRef = ref<HTMLElement | null>(null);

/* ── Validation map for incoming offers ── */
const validationMap = computed(() => {
  const result: Record<string, { can: boolean; reason?: string }> = {};
  const context = {
    team: gameStore.state.team,
    box: gameStore.state.box,
    money: gameStore.state.money,
    inventory: gameStore.state.inventory
  };
  tradeStore.pendingIncoming.forEach((t: TradeOffer) => {
    result[t.id] = canFulfillTradeOffer(t, context);
  });
  return result;
});

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

function switchSubTab(target: TradeSubTab) {
  subTab.value = target;
  animateCards();
}

/* ── Auto-switch to claims when an incoming trade is accepted ── */
function onTradeAccepted() {
  subTab.value = 'claims';
  animateCards();
}

/* ── Claims typed list (trade claims only) ── */
const tradeClaims = computed(() =>
  (gameStore.state.claimQueue ?? []).filter(
    (c: ClaimItem) => c.source_type === 'trade' || c.source_type === 'trade_refund'
  ) as ClaimItem[]
);

/* ── Reactive badge counts ── */
const receivedCount = computed(() => tradeStore.pendingIncoming.length);
const sentCount = computed(() => tradeStore.pendingOutgoing.length + tradeStore.pendingAccepted.length);
const claimsCount = computed(() => tradeClaims.value.length);
const currentEmptyState = computed(() =>
  resolveTradeEmptyState(subTab.value, receivedCount.value, sentCount.value, claimsCount.value)
);

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
  [subTab, () => tradeStore.pendingIncoming, () => tradeStore.pendingOutgoing, () => tradeStore.pendingAccepted, tradeClaims],
  animateCards,
  { deep: true }
);
</script>

<template>
  <div class="social-tab-content">
    <!-- Sub-navigation -->
    <SocialTradesSubNav
      :sub-tab="subTab"
      :received-count="receivedCount"
      :sent-count="sentCount"
      :claims-count="claimsCount"
      @switch-sub-tab="switchSubTab"
    />

    <!-- Empty states -->
    <div
      v-if="currentEmptyState"
      class="empty-state"
    >
      <div class="icon emoji">
        {{ currentEmptyState.icon }}
      </div>
      <p>{{ currentEmptyState.message }}</p>
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
          v-for="claim in tradeClaims"
          :key="claim.id"
          :claim="claim"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

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
