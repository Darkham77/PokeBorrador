<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useChatStore } from '@/stores/chat'
import { useTradeStore } from '@/stores/trade'
import { useUIStore } from '@/stores/ui'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { gsap } from 'gsap'

import type { Friend } from '@/stores/social'

const socialStore = useSocialStore()
const chatStore = useChatStore()
const tradeStore = useTradeStore()
const uiStore = useUIStore()

function openTrainerProfile(userId: string) {
  uiStore.open('TrainerProfile', { userId })
}

const listRef = ref<HTMLElement | null>(null)

const filteredFriends = computed(() => socialStore.friends)

function openChat(friend: Friend) {
  chatStore.openChat(friend.id, friend.username)
}

function isChatActive(friendId: string) {
  return chatStore.activeChatId === friendId && chatStore.privateChats[friendId] && !chatStore.privateChats[friendId].isCollapsed
}

function openTrade(friend: Friend) {
  tradeStore.openTradeModal(friend.id, friend.username)
}

function confirmRemoveFriend(friend: Friend) {
  uiStore.openConfirm({
    title: 'ELIMINAR AMIGO',
    message: `¿Estás seguro de que querés eliminar a ${friend.username} de tu lista de amigos?`,
    confirmText: 'ELIMINAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    onConfirm: () => {
      socialStore.removeFriend(friend.id)
    }
  })
}

const getUnreadCount = (friendId: string | number) => {
  return chatStore.privateChats[friendId]?.unreadCount || 0
}

function animateCards() {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.friend-card')
    if (cards.length > 0) {
      listRef.value.classList.add('tab-mounting')
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: -20,
        scale: 0.95,
        duration: 0.45,
        stagger: 0.06,
        ease: 'back.out(1.2)',
        clearProps: 'all',
        onComplete: () => {
          listRef.value?.classList.remove('tab-mounting')
        }
      })
    }
  })
}

onMounted(() => {
  animateCards()
})

watch(() => filteredFriends.value.map(f => f.id).join(','), () => {
  animateCards()
})

defineEmits<{
  (e: 'search-tab'): void
}>()
</script>

<template>
  <div class="social-tab-content">
    <div
      v-if="socialStore.friends.length === 0"
      class="empty-state"
    >
      <div class="icon">
        👥
      </div>
      <p>Aún no tenés amigos agregados.</p>
      <button
        class="btn-vicio-secondary"
        @click.stop="$emit('search-tab')"
      >
        Buscar Entrenadores
      </button>
    </div>

    <div
      v-else
      ref="listRef"
      class="friends-list"
    >
      <div
        v-for="friend in filteredFriends"
        :key="friend.id"
        class="friend-card"
      >
        <div class="friend-main">
          <TrainerAvatar 
            :player-class="friend.playerClass" 
            :level="friend.level" 
            :avatar-style="friend.avatar_style || undefined"
            :size="44"
            class="clickable-avatar"
            @click.stop="openTrainerProfile(friend.id)"
          >
            <template #overlay>
              <div
                class="status-dot"
                :class="{ online: friend.isOnline }"
              />
            </template>
          </TrainerAvatar>
          
          <div class="friend-info">
            <div
              v-gsap-nick="friend.nick_style || 'normal'"
              class="name clickable-username"
              :class="friend.nick_style || 'normal'"
              @click.stop="openTrainerProfile(friend.id)"
            >
              {{ friend.username }}
            </div>
            <div class="meta">
              Nv.{{ friend.level }} • {{ friend.playerClass || 'Entrenador' }}
            </div>
          </div>
        </div>

        <div class="friend-actions">
          <PVTooltip
            title="CHAT"
            description="Enviar mensaje privado."
            position="top"
          >
            <button
              class="action-btn chat"
              :disabled="isChatActive(friend.id)"
              @click.stop="openChat(friend)"
            >
              💬
              <span 
                v-if="getUnreadCount(friend.id) > 0" 
                class="chat-badge"
              >{{ getUnreadCount(friend.id) }}</span>
            </button>
          </PVTooltip>

          <PVTooltip
            title="INTERCAMBIO"
            description="Solicitar comercio Pokémon."
            position="top"
          >
            <button
              class="action-btn trade"
              @click.stop="openTrade(friend)"
            >
              🔄
            </button>
          </PVTooltip>

          <PVTooltip
            title="DESAFÍO (NO DISPONIBLE)"
            description="Los combates PvP en vivo no están disponibles actualmente."
            position="top"
          >
            <button
              class="action-btn battle"
              disabled
              @click.stop
            >
              ⚔️
            </button>
          </PVTooltip>

          <PVTooltip
            title="ELIMINAR"
            description="Quitar de tu lista de amigos."
            position="top"
          >
            <button
              class="action-btn remove"
              @click.stop="confirmRemoveFriend(friend)"
            >
              ×
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.friends-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.tab-mounting .friend-card {
    transition: none !important;
  }
}

.friend-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(199, 125, 255, 0.2);
    transform: Translatex(4px);
  }
}

.friend-main {
  display: flex;
  gap: 12px;
  align-items: center;
}



.friend-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .name {
    font-size: 14px;
    font-weight: 700;
    color: Rgba(241, 245, 249, 1);
    line-height: 1.2;
  }
  
  .meta {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1.2;
  }
}

.friend-actions {
  display: flex;
  gap: 6px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    background: Rgba(255, 255, 255, 0.05);
    color: var(--white);
    position: relative;

    &:hover:not(:disabled) { transform: Scale(1.1); }
    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      background: Rgba(255, 255, 255, 0.02);
      color: Rgba(255, 255, 255, 0.3);
    }
    &.chat:hover { background: Rgba(59, 130, 246, 0.2); color: Rgba(96, 165, 250, 1); }
    &.trade:hover { background: Rgba(34, 197, 94, 0.2); color: Rgba(74, 222, 128, 1); }
    &.battle:hover { background: Rgba(168, 85, 247, 0.2); color: Rgba(192, 132, 252, 1); }
    &.remove:hover { 
      @include btn-vicio-danger;
      width: 32px; height: 32px; // Keep same size
      font-size: 14px;
    }

    .chat-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: Rgba(239, 68, 68, 1);
      color: white;
      border-radius: 50%;
      min-width: 14px;
      height: 14px;
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      border: 1px solid Rgba(0, 0, 0, 0.3);
      box-shadow: 0 2px 4px Rgba(0, 0, 0, 0.3);
      padding: 0 3px;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(148, 163, 184, 1);
  .icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
  p { font-size: 14px; margin-bottom: 20px; }
}

.clickable-avatar {
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}
</style>



