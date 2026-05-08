<script setup lang="ts">
import { useSocialStore } from '@/stores/social.js'
import { useChatStore } from '@/stores/chat.js'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore() as any
const chatStore = useChatStore() as any

const openChat = (friend: any) => {
  chatStore.openChat(friend.id, friend.username)
}

const getUnreadCount = (friendId: string | number) => {
  return chatStore.privateChats[friendId]?.unreadCount || 0
}
</script>

<template>
  <div class="friends-container">
    <div
      v-if="socialStore.friends.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        👥
      </div>
      <div>Todavía no tenés amigos agregados.<br>Buscá a tu entrenador favorito arriba.</div>
    </div>
    
    <div
      v-for="friend in socialStore.friends"
      :key="friend.id"
      class="friend-card"
    >
      <div class="friend-avatar">
        <TrainerAvatar 
          :player-class="friend.playerClass" 
          :level="friend.level" 
          :size="44" 
        />
        <div
          class="friend-status-dot"
          :class="{ online: friend.isOnline }"
        />
      </div>
      
      <div class="friend-info">
        <div
          class="friend-name"
          :class="friend.nick_style"
        >
          {{ friend.username }}
        </div>
        <div class="friend-meta">
          <span class="m-badge-level">Nv. {{ friend.level }}</span> &nbsp;·&nbsp; {{ friend.badges }} medallas
        </div>
      </div>

      <div class="friend-actions">
        <button
          class="friend-btn chat"
          @click.stop="openChat(friend)"
        >
          💬 Chat
          <span 
            v-if="getUnreadCount(friend.id) > 0" 
            class="chat-badge"
          >{{ getUnreadCount(friend.id) }}</span>
        </button>
        <button
          class="friend-btn trade"
          @click.stop="socialStore.openTradeModal(friend.id, friend.username)"
        >
          🔄 Intercambiar
        </button>
        <button
          class="friend-btn battle"
          @click.stop="socialStore.sendBattleInvite(friend.id, friend.username)"
        >
          ⚔️ Batallar
        </button>
        <button
          class="friend-btn remove"
          @click.stop="socialStore.removeFriend(friend.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.friends-container {
  padding-top: 10px;
}

.friend-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 15px;
  margin-bottom: 12px;
  position: relative;
  transition: transform 0.2s, background 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    transform: Translatex(5px);
  }
}

.friend-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.friend-status-dot {
  position: absolute;
  top: 0;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: Rgba(75, 85, 99, 1); // offline
  border: 2px solid Rgba(16, 24, 34, 1);
  box-shadow: 0 0 5px Rgba(0,0,0,0.5);

  &.online {
    background: Rgba(16, 185, 129, 1);
    box-shadow: 0 0 8px Rgba(16, 185, 129, 0.4);
  }
}

.friend-info {
  flex: 1;
  min-width: 0;

  .friend-name {
    font-size: 14px;
    font-weight: 900;
    color: var(--white);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .friend-meta {
    font-size: 11px;
    color: Rgba(136, 136, 136, 1);
  }
}

.friend-actions {
  display: flex;
  gap: 8px;
}

.friend-btn {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid Rgba(255, 255, 255, 0.2);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: Rgba(255, 255, 255, 0.1);
  }

  &.chat {
    background: Rgba(107, 203, 119, 0.15);
    color: Rgba(107, 203, 119, 1);
    border-color: Rgba(107, 203, 119, 0.3);
  }

  &.trade {
    background: Rgba(255, 217, 61, 0.15);
    color: Rgba(255, 217, 61, 1);
    border-color: Rgba(255, 217, 61, 0.3);
  }

  &.battle {
    background: Rgba(199, 125, 255, 0.15);
    color: Rgba(199, 125, 255, 1);
    border-color: Rgba(199, 125, 255, 0.3);
  }

  &.remove {
    background: Rgba(255, 71, 87, 0.1);
    color: Rgba(255, 71, 87, 1);
    border-color: Rgba(255, 71, 87, 0.2);
    padding: 6px 8px;
  }

  .chat-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: Rgba(255, 71, 87, 1);
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    border: 1px solid Rgba(0,0,0,0.3);
    box-shadow: 0 2px 4px Rgba(0,0,0,0.3);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(136, 136, 136, 1);
  font-size: 12px;
  line-height: 1.6;

  .empty-icon {
    font-size: 40px;
    margin-bottom: 15px;
    opacity: 0.3;
  }
}
</style>
