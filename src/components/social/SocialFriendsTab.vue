<script setup lang="ts">
import { computed } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useChatStore } from '@/stores/chat'
import { useTradeStore } from '@/stores/trade'
import { useLivePvPStore } from '@/stores/livePvP'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

import type { Friend } from '@/stores/social'

const socialStore = useSocialStore()
const chatStore = useChatStore()
const tradeStore = useTradeStore()
const livePvP = useLivePvPStore()

const filteredFriends = computed(() => socialStore.friends)

function openChat(friend: Friend) {
  chatStore.openChat(friend.id, friend.username)
}

function openTrade(friend: Friend) {
  tradeStore.openTradeModal(friend.id, friend.username)
}

defineEmits<{
  (e: 'search-tab'): void
}>()
</script>

<template>
  <div class="tab-content">
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
            :size="44"
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
              class="name"
              :class="friend.nick_style"
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
              @click.stop="openChat(friend)"
            >
              💬
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
            title="DESAFÍO"
            description="Retar a un combate PvP en vivo."
            position="top"
          >
            <button
              class="action-btn battle"
              @click.stop="livePvP.sendInvite(friend.id, friend.username)"
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
              @click.stop="socialStore.removeFriend(friend.id)"
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

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid Rgba(16, 24, 34, 1);
  background: Rgba(255, 255, 255, 0.5);

  &.online {
    background: Rgba(34, 197, 94, 1);
    box-shadow: 0 0 8px Rgba(34, 197, 94, 1);
  }
}

.friend-info {
  .name {
    font-size: 14px;
    font-weight: 700;
    color: Rgba(241, 245, 249, 1);
    margin-bottom: 2px;
  }
  .meta {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.5);
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

    &:hover { transform: Scale(1.1); }
    &.chat:hover { background: Rgba(59, 130, 246, 0.2); color: Rgba(96, 165, 250, 1); }
    &.trade:hover { background: Rgba(34, 197, 94, 0.2); color: Rgba(74, 222, 128, 1); }
    &.battle:hover { background: Rgba(168, 85, 247, 0.2); color: Rgba(192, 132, 252, 1); }
    &.remove:hover { 
      @include btn-vicio-danger;
      width: 32px; height: 32px; // Keep same size
      font-size: 14px;
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

</style>
