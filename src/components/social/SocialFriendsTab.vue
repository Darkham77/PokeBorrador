<script setup lang="ts">
import type { DisplayText } from '@francogp/auditor';
import { gsap } from 'gsap';
import { computed, onMounted, ref, watch, nextTick } from 'vue';

import PVTooltip from '@/components/common/PVTooltip.vue';
import { useModalStore } from '@/stores/modals';
import { useChatStore } from '@/stores/social/chat';
import { useSocialStore } from '@/stores/social/social';
import type { Friend } from '@/stores/social/social';
import { useTradeStore } from '@/stores/trade';
import { useUIStore } from '@/stores/ui';

import TrainerCard from './TrainerCard.vue';

const FRIEND_CARD_INITIAL_OPACITY = 0;
const FRIEND_CARD_INITIAL_X_OFFSET = -20;
const FRIEND_CARD_INITIAL_SCALE = 0.95;
const FRIEND_CARD_ANIM_DURATION_SEC = 0.45;
const FRIEND_CARD_ANIM_STAGGER_SEC = 0.06;

const socialStore = useSocialStore();
const chatStore = useChatStore();
const tradeStore = useTradeStore();
const uiStore = useUIStore();
const modalStore = useModalStore();

function openTrainerProfile(userId: string): void {
  uiStore.open('TrainerProfile', { userId });
}

function openPvPChallenge(friend: Friend): void {
  modalStore.open('PvPChallenge', { friend });
}

const listRef = ref<HTMLElement | null>(null);

const filteredFriends = computed(() => socialStore.friends);

function openChat(friend: Friend): void {
  chatStore.openChat(friend.id, friend.username);
}

function isChatActive(friendId: string): boolean {
  return Boolean(
    chatStore.activeChatId === friendId &&
    chatStore.privateChats[friendId] &&
    !chatStore.privateChats[friendId].isCollapsed
  );
}

function openTrade(friend: Friend): void {
  tradeStore.openTradeModal(friend.id, friend.username);
}

function confirmRemoveFriend(friend: Friend): void {
  uiStore.openConfirm({
    title: 'ELIMINAR AMIGO',
    message: `¿Estás seguro de que querés eliminar a ${friend.username} de tu lista de amigos?`,
    confirmText: 'ELIMINAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    onConfirm: () => {
      socialStore.removeFriend(friend.id);
    }
  });
}

const getUnreadCount = (friendId: string | number): number => {
  return chatStore.privateChats[String(friendId) as DisplayText]?.unreadCount || 0;
};

async function animateCards(): Promise<void> {
  await nextTick();
  if (!listRef.value) return;
  const cards = listRef.value.querySelectorAll('.trainer-card');
  if (cards.length > 0) {
    gsap.killTweensOf(cards);
    gsap.from(cards, {
      opacity: FRIEND_CARD_INITIAL_OPACITY,
      x: FRIEND_CARD_INITIAL_X_OFFSET,
      scale: FRIEND_CARD_INITIAL_SCALE,
      duration: FRIEND_CARD_ANIM_DURATION_SEC,
      stagger: FRIEND_CARD_ANIM_STAGGER_SEC,
      ease: 'back.out(1.2)',
      clearProps: 'opacity,x,scale'
    });
  }
}

onMounted(() => {
  animateCards();
});

watch(
  () => filteredFriends.value.map((f: Friend) => f.id).join(','),
  () => {
    animateCards();
  }
);

defineEmits<{
  (e: 'search-tab'): void;
}>();
</script>

<template>
  <div class="social-tab-content">
    <div v-if="socialStore.friends.length === 0" class="empty-state">
      <div class="icon emoji">👥</div>
      <p>Aún no tenés amigos agregados.</p>
      <button
        id="social-friends-tab-btn-buscar-entrenadores"
        class="btn-vicio-secondary"
        @click.stop="$emit('search-tab')"
      >
        Buscar Entrenadores
      </button>
    </div>

    <div v-else ref="listRef" class="friends-list">
      <TrainerCard
        v-for="friend in filteredFriends"
        id="social-friends-tab-trainercard-1"
        :key="friend.id"
        :profile="friend"
        :avatar-size="44"
        @click-profile="openTrainerProfile"
      >
        <template #avatar-overlay>
          <div class="status-dot" :class="{ online: friend.isOnline }" />
        </template>

        <template #actions>
          <div class="friend-actions">
            <PVTooltip title="CHAT" description="Enviar mensaje privado." position="top">
              <button
                v-gsap-hover
                class="action-btn chat"
                :disabled="isChatActive(friend.id)"
                @click.stop="openChat(friend)"
              >
                <span class="emoji">💬</span>
                <span v-if="getUnreadCount(friend.id) > 0" class="hud-notification-badge">{{
                  getUnreadCount(friend.id)
                }}</span>
              </button>
            </PVTooltip>

            <PVTooltip title="INTERCAMBIO" description="Solicitar comercio Pokémon." position="top">
              <button v-gsap-hover class="action-btn trade" @click.stop="openTrade(friend)">
                <span class="emoji">🔄</span>
              </button>
            </PVTooltip>

            <PVTooltip
              :title="friend.isOnline ? 'DESAFÍO PVP' : 'DESAFÍO (DESCONECTADO)'"
              :description="
                friend.isOnline
                  ? 'Desafiar a un combate PvP en tiempo real.'
                  : 'El entrenador debe estar conectado para combatir.'
              "
              position="top"
            >
              <button
                v-gsap-hover
                class="action-btn battle"
                :disabled="!friend.isOnline"
                @click.stop="openPvPChallenge(friend)"
              >
                <span class="emoji">⚔️</span>
              </button>
            </PVTooltip>

            <PVTooltip title="ELIMINAR" description="Quitar de tu lista de amigos." position="top">
              <button
                v-gsap-hover
                class="action-btn remove"
                @click.stop="confirmRemoveFriend(friend)"
              >
                ×
              </button>
            </PVTooltip>
          </div>
        </template>
      </TrainerCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/components/social-friends-tab';
</style>
