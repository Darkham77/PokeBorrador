<script setup>
import { computed } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useChatStore } from '@/stores/chat'
import { useTradeStore } from '@/stores/trade'
import { useLivePvPStore } from '@/stores/livePvP'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()
const chatStore = useChatStore()
const tradeStore = useTradeStore()
const livePvP = useLivePvPStore()

const filteredFriends = computed(() => socialStore.friends)

function openChat(friend) {
  chatStore.openChat(friend.id, friend.username)
}

function openTrade(friend) {
  tradeStore.openTradeModal(friend.id, friend.username)
}

defineEmits(['search-tab'])
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
        class="btn-primary-retro"
        @click="$emit('search-tab')"
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
          <button
            class="action-btn chat"
            title="Chat"
            @click="openChat(friend)"
          >
            💬
          </button>
          <button
            class="action-btn trade"
            title="Intercambio"
            @click="openTrade(friend)"
          >
            🔄
          </button>
          <button
            class="action-btn battle"
            title="Desafío"
            @click="livePvP.sendInvite(friend.id, friend.username)"
          >
            ⚔️
          </button>
          <button
            class="action-btn remove"
            title="Eliminar"
            @click="socialStore.removeFriend(friend.id)"
          >
            ×
          </button>
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(199, 125, 255, 0.2);
    transform: TranslateX(4px);
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
  border: 2px solid #101822;
  background: #64748b;

  &.online {
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
  }
}

.friend-info {
  .name {
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 2px;
  }
  .meta {
    font-size: 11px;
    color: #64748b;
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
    background: rgba(255, 255, 255, 0.05);
    color: #fff;

    &:hover { transform: Scale(1.1); }
    &.chat:hover { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    &.trade:hover { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    &.battle:hover { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
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
  color: #94a3b8;
  .icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
  p { font-size: 14px; margin-bottom: 20px; }
}

.btn-primary-retro {
  background: var(--purple-light);
  color: #000;
  border: none;
  padding: 10px 20px;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { transform: TranslateY(-2px); box-shadow: 0 4px 12px rgba(157, 78, 221, 0.3); }
}
</style>
