<script setup lang="ts">
import { computed } from 'vue';
import { useTradeStore } from '@/stores/trade';
import { useSocialStore } from '@/stores/social';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/TrainerAvatar.vue';
import type { TradeOffer } from '@/types/stores';

type CardMode = 'incoming' | 'outgoing' | 'accepted';

const props = defineProps<{
  trade: TradeOffer;
  mode: CardMode;
  canFulfill?: { can: boolean; reason?: string };
}>();

const emit = defineEmits<{
  accepted: [];
  claimed: [];
}>();

const tradeStore = useTradeStore();
const socialStore = useSocialStore();
const authStore = useAuthStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const getCosmetics = (userId: string) => {
  if (userId === authStore.user?.id) {
    return {
      username: gameStore.state.trainer || 'Tú',
      playerClass: gameStore.state.playerClass || 'entrenador',
      level: gameStore.state.trainerLevel || 1,
      avatar_style: gameStore.state.avatar_style || '',
      nick_style: gameStore.state.nick_style || '',
    };
  }
  const friend = socialStore.friends.find(f => f.id === userId);
  if (friend) {
    return {
      username: friend.username,
      playerClass: friend.playerClass || 'entrenador',
      level: friend.level,
      avatar_style: friend.avatar_style || '',
      nick_style: friend.nick_style || '',
    };
  }
  return { username: 'Entrenador', playerClass: 'entrenador', level: 1, avatar_style: '', nick_style: '' };
};

const participantId = computed(() =>
  props.mode === 'incoming' ? props.trade.sender_id : props.trade.receiver_id
);
const cosmetics = computed(() => getCosmetics(participantId.value));

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

function openProfile() {
  uiStore.open('TrainerProfile', { userId: participantId.value });
}

async function onAccept() {
  const ok = await tradeStore.acceptTrade(props.trade.id);
  if (ok) emit('accepted');
}

function onReject() {
  tradeStore.rejectTrade(props.trade.id);
}

function onCancel() {
  tradeStore.rejectTrade(props.trade.id);
}

async function onClaim() {
  await tradeStore.claimTrade(props.trade.id);
  emit('claimed');
}
</script>

<template>
  <div
    class="trade-card"
    :class="mode"
  >
    <!-- HEADER -->
    <div class="trade-card-header">
      <div class="participant-info">
        <TrainerAvatar
          :player-class="cosmetics.playerClass"
          :level="cosmetics.level"
          :avatar-style="cosmetics.avatar_style || undefined"
          :size="36"
          class="clickable-avatar"
          @click.stop="openProfile"
        />
        <div class="trainer-texts">
          <span
            v-gsap-nick="cosmetics.nick_style || 'normal'"
            class="username clickable-username"
            :class="cosmetics.nick_style || 'normal'"
            @click.stop="openProfile"
          >{{ cosmetics.username }}</span>

          <span
            v-if="mode === 'incoming'"
            class="meta"
          >te ofrece un trato</span>
          <span
            v-else-if="mode === 'outgoing'"
            class="meta"
          >esperando respuesta...</span>
          <span
            v-else-if="mode === 'accepted'"
            class="meta text-success"
          >¡ACEPTÓ TU OFERTA! 🎉</span>
        </div>
      </div>
      <span
        v-if="mode === 'outgoing'"
        class="waiting-badge"
      >⏳ ENVIADA</span>
    </div>

    <!-- ACCEPTED NOTICE -->
    <div
      v-if="mode === 'accepted'"
      class="success-notice"
    >
      Los activos del intercambio han sido enviados a la subpestaña de <strong>RECLAMOS</strong>.
    </div>

    <!-- ASSETS GRID (incoming/outgoing) -->
    <div
      v-if="mode !== 'accepted'"
      class="trade-assets-grid"
    >
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

    <!-- MESSAGE BUBBLE -->
    <div
      v-if="trade.message && mode !== 'accepted'"
      class="trade-message-bubble"
    >
      <span class="bubble-quote">"</span>
      <span class="msg-text">{{ trade.message }}</span>
      <span class="bubble-quote">"</span>
    </div>

    <!-- VALIDATION WARNING -->
    <div
      v-if="mode === 'incoming' && canFulfill && !canFulfill.can"
      class="trade-warning-banner"
    >
      ⚠️ {{ canFulfill.reason }}
    </div>

    <!-- ACTIONS -->
    <div class="trade-card-actions">
      <!-- Incoming -->
      <template v-if="mode === 'incoming'">
        <button
          class="btn-vicio-success btn-vicio-sm accept-btn"
          :disabled="!canFulfill?.can"
          @click.stop="onAccept"
        >
          ACEPTAR
        </button>
        <button
          class="btn-vicio-danger btn-vicio-sm"
          @click.stop="onReject"
        >
          RECHAZAR
        </button>
      </template>

      <!-- Outgoing -->
      <template v-else-if="mode === 'outgoing'">
        <button
          class="btn-vicio-danger btn-vicio-sm cancel-btn"
          @click.stop="onCancel"
        >
          CANCELAR OFERTA
        </button>
      </template>

      <!-- Accepted — dismiss card -->
      <template v-else-if="mode === 'accepted'">
        <button
          class="btn-vicio-success btn-vicio-sm claim-notif-btn"
          @click.stop="onClaim"
        >
          ENTENDIDO
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.trade-card {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.03);
    border-color: Rgba(199, 125, 255, 0.15);
  }

  &.accepted {
    border-left: 4px solid #22c55e;
    background: Rgba(34, 197, 94, 0.03);
    border-color: Rgba(34, 197, 94, 0.1);
  }

  &.incoming { border-left: 4px solid var(--purple-light); }
  &.outgoing  { border-left: 4px solid #64748b; }
}

/* ── Header ── */
.trade-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participant-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.trainer-texts {
  display: flex;
  flex-direction: column;
  gap: 3px;

  .username {
    font-size: 14px;
    font-weight: 700;
    color: var(--white);
    line-height: 1.2;
  }

  .meta {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.4);
    line-height: 1.2;

    &.text-success { color: #4ade80; font-weight: bold; }
  }
}

.waiting-badge {
  @include pixelated;
  font-size: 8px;
  background: #1e293b;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: #facc15;
  padding: 4px 8px;
  border-radius: 6px;
}

/* ── Assets grid ── */
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
    color: Rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .assets-box {
    background: Rgba(0, 0, 0, 0.2);
    border: 1px solid Rgba(255, 255, 255, 0.03);
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
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
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
    color: Rgba(255, 255, 255, 0.5);
    margin-left: auto;
  }

  &.pokemon {
    background: Rgba(168, 85, 247, 0.06);
    border-color: Rgba(168, 85, 247, 0.12);
  }
  &.money {
    background: Rgba(234, 179, 8, 0.06);
    border-color: Rgba(234, 179, 8, 0.12);
    .icon { color: #facc15; }
    .badge-val { color: #facc15; font-weight: bold; }
  }
  &.item {
    background: Rgba(59, 130, 246, 0.06);
    border-color: Rgba(59, 130, 246, 0.12);
  }

  &.requested {
    &.pokemon { background: Rgba(239, 68, 68, 0.05); border-color: Rgba(239, 68, 68, 0.1); }
    &.money   { background: Rgba(239, 68, 68, 0.05); border-color: Rgba(239, 68, 68, 0.1); .icon, .badge-val { color: #fca5a5; } }
    &.item    { background: Rgba(239, 68, 68, 0.05); border-color: Rgba(239, 68, 68, 0.1); }
  }
}

.no-assets {
  font-size: 11px;
  color: Rgba(255, 255, 255, 0.3);
  text-align: center;

  &.gift { color: #4ade80; font-weight: bold; }
}

/* ── Message bubble ── */
.trade-message-bubble {
  background: Rgba(168, 85, 247, 0.04);
  border: 1px solid Rgba(168, 85, 247, 0.08);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  gap: 4px;
  align-items: flex-start;

  .bubble-quote {
    font-family: 'Courier New', Courier, monospace;
    font-size: 16px;
    font-weight: bold;
    color: var(--purple-light);
    line-height: 1;
  }
  .msg-text {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.85);
    font-style: italic;
    line-height: 1.3;
  }
}

/* ── Warning banner ── */
.trade-warning-banner {
  font-size: 11px;
  color: #f87171;
  background: Rgba(239, 68, 68, 0.06);
  border: 1px dashed Rgba(239, 68, 68, 0.25);
  padding: 8px 10px;
  border-radius: 8px;
  line-height: 1.4;
}

/* ── Success notice ── */
.success-notice {
  background: Rgba(34, 197, 94, 0.05);
  border: 1px solid Rgba(34, 197, 94, 0.1);
  padding: 10px 12px;
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 11px;
  line-height: 1.4;

  strong { color: #4ade80; }
}

/* ── Actions ── */
.trade-card-actions {
  display: flex;
  gap: 8px;

  button { flex: 1; font-weight: bold; }

  .accept-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: Rgba(255, 255, 255, 0.05) !important;
    border-color: Rgba(255, 255, 255, 0.1) !important;
    color: Rgba(255, 255, 255, 0.2) !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .cancel-btn, .claim-notif-btn { flex: none; width: 100%; }
}

/* ── Interactivity ── */
.clickable-avatar {
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
  &:hover { transform: Scale(1.08); filter: Brightness(1.15); }
}

.clickable-username {
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { text-decoration: underline; opacity: 0.85; }
}
</style>
