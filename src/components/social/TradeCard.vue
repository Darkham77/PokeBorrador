<script setup lang="ts">
import { computed } from 'vue';
import { useTradeStore } from '@/stores/trade';
import { useSocialStore } from '@/stores/social/social';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import TradeAssetsGrid from './TradeAssetsGrid.vue';
import type { TradeOffer, TradeCardMode } from '@/types/system/stores';

const props = defineProps<{
  trade: TradeOffer;
  mode: TradeCardMode;
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
      gender: gameStore.state.gender || 'h',
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
      gender: friend.gender || 'h',
    };
  }
  return { username: 'Entrenador', playerClass: 'entrenador', level: 1, avatar_style: '', nick_style: '', gender: 'h' };
};

const participantId = computed(() =>
  props.mode === 'incoming' ? props.trade.sender_id : props.trade.receiver_id
);
const cosmetics = computed(() => getCosmetics(participantId.value));

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
          :gender="cosmetics.gender || 'h'"
          class="clickable-avatar"
          @click.stop="openProfile"
        />
        <div class="trainer-texts">
          <span
            :id="`trade-card-username-${trade.id}`"
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
          >¡ACEPTÓ TU OFERTA! <span class="emoji">🎉</span></span>
        </div>
      </div>
      <span
        v-if="mode === 'outgoing'"
        class="waiting-badge"
      ><span class="emoji">⏳</span> ENVIADA</span>
    </div>

    <!-- ACCEPTED NOTICE -->
    <div
      v-if="mode === 'accepted'"
      class="success-notice"
    >
      Los activos del intercambio han sido enviados a la subpestaña de <strong>RECLAMOS</strong>.
    </div>

    <!-- ASSETS GRID (incoming/outgoing) -->
    <TradeAssetsGrid
      v-if="mode !== 'accepted'"
      :trade="trade"
      :mode="mode"
    />

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
      <span class="emoji">⚠️</span> {{ canFulfill.reason }}
    </div>

    <!-- ACTIONS -->
    <div class="trade-card-actions">
      <!-- Incoming -->
      <template v-if="mode === 'incoming'">
        <button
          :id="`trade-card-accept-btn-${trade.id}`"
          class="btn-vicio-success btn-vicio-sm accept-btn"
          :disabled="!canFulfill?.can"
          @click.stop="onAccept"
        >
          ACEPTAR
        </button>
        <button
          :id="`trade-card-reject-btn-${trade.id}`"
          class="btn-vicio-danger btn-vicio-sm"
          @click.stop="onReject"
        >
          RECHAZAR
        </button>
      </template>

      <!-- Outgoing -->
      <template v-else-if="mode === 'outgoing'">
        <button
          :id="`trade-card-cancel-btn-${trade.id}`"
          class="btn-vicio-danger btn-vicio-sm cancel-btn"
          @click.stop="onCancel"
        >
          CANCELAR OFERTA
        </button>
      </template>

      <!-- Accepted — dismiss card -->
      <template v-else-if="mode === 'accepted'">
        <button
          :id="`trade-card-claim-btn-${trade.id}`"
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 16px;
  background: Rgb(255 255 255 / 2%);
  

  &:hover {
    background: Rgb(255 255 255 / 3%);
    border-color: Rgb(199 125 255 / 15%);
  }

  &.accepted {
    background: Rgb(34 197 94 / 3%);
    border-left: 4px solid #22c55e;
    border-color: Rgb(34 197 94 / 10%);
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
    color: var(--white);
    font-size: 14px;
    font-weight: 700;
    line-height: 1.2;
  }

  .meta {
    color: Rgb(255 255 255 / 40%);
    font-size: 11px;
    line-height: 1.2;

    &.text-success { color: #4ade80; font-weight: bold; }
  }
}

.waiting-badge {
  @include pixelated;

  padding: 4px 8px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 6px;
  background: #1e293b;
  color: #facc15;
  font-size: 8px;
}

/* ── Message bubble ── */
.trade-message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid Rgb(168 85 247 / 8%);
  border-radius: 12px;
  background: Rgb(168 85 247 / 4%);

  .bubble-quote {
    color: var(--purple-light);
    font-family: 'Courier New', Courier, monospace;
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }
  .msg-text {
    color: Rgb(255 255 255 / 85%);
    font-size: 11px;
    line-height: 1.3;
    font-style: italic;
  }
}

/* ── Warning banner ── */
.trade-warning-banner {
  padding: 8px 10px;
  border: 1px dashed Rgb(239 68 68 / 25%);
  border-radius: 8px;
  background: Rgb(239 68 68 / 6%);
  color: #f87171;
  font-size: 11px;
  line-height: 1.4;
}

/* ── Success notice ── */
.success-notice {
  padding: 10px 12px;
  border: 1px solid Rgb(34 197 94 / 10%);
  border-radius: 10px;
  background: Rgb(34 197 94 / 5%);
  color: #e2e8f0;
  font-size: 11px;
  line-height: 1.4;

  strong { color: #4ade80; }
}

/* ── Actions ── */
.trade-card-actions {
  display: flex;
  gap: 8px;

  button { font-weight: bold; flex: 1; }

  .accept-btn:disabled {
    background: Rgb(255 255 255 / 5%) !important;
    color: Rgb(255 255 255 / 20%) !important;
    opacity: 0.4;
    transform: none;
    cursor: not-allowed;
    border-color: Rgb(255 255 255 / 10%) !important;
    box-shadow: none !important;
  }

  .cancel-btn, .claim-notif-btn { width: 100%; flex: none; }
}

/* ── Interactivity ── */
.clickable-avatar {
  cursor: pointer;
  
  &:hover { transform: Scale(1.08); filter: Brightness(1.15); }
}

.clickable-username {
  cursor: pointer;
  
  &:hover { opacity: 0.85; text-decoration: underline; }
}
</style>
