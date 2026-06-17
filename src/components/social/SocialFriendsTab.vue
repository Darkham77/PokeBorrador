<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { useChatStore } from '@/stores/social/chat'
import { useTradeStore } from '@/stores/trade'
import { useUIStore } from '@/stores/ui'
import TrainerCard from './TrainerCard.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { gsap } from 'gsap'

import type { Friend } from '@/stores/social/social'

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
    const cards = listRef.value.querySelectorAll('.trainer-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: -20,
        scale: 0.95,
        duration: 0.45,
        stagger: 0.06,
        ease: 'back.out(1.2)',
        clearProps: 'all'
      })
    }
  })
}

onMounted(() => {
  animateCards()
})

watch(() => filteredFriends.value.map((f: Friend) => f.id).join(','), () => {
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
      <TrainerCard
        v-for="friend in filteredFriends"
        :key="friend.id"
        :profile="friend"
        :avatar-size="44"
        @click-profile="openTrainerProfile"
      >
        <template #avatar-overlay>
          <div
            class="status-dot"
            :class="{ online: friend.isOnline }"
          />
        </template>

        <template #actions>
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
        </template>
      </TrainerCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/social-friends-tab";
</style>
