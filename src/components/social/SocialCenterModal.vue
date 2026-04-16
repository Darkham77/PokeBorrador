<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSocialStore } from '@/stores/social';
import { useChatStore } from '@/stores/chat';
import { useTradeStore } from '@/stores/trade';
import { useAuthStore } from '@/stores/auth';
import TrainerAvatar from '@/components/TrainerAvatar.vue';

const socialStore = useSocialStore();
const chatStore = useChatStore();
const tradeStore = useTradeStore();
const authStore = useAuthStore();

const activeTab = ref('friends'); // 'friends', 'requests', 'search'
const searchQuery = ref('');

const filteredFriends = computed(() => {
  return socialStore.friends;
});

async function handleSearch() {
  if (searchQuery.value.length < 2) return;
  await socialStore.searchPlayers(searchQuery.value);
}

function openChat(friend) {
  chatStore.openChat(friend.id, friend.username);
  socialStore.loading = false; // Close modal logic if needed, but usually kept open
}

function openTrade(friend) {
  tradeStore.openTradeModal(friend.id, friend.username);
}

// Emits for parent control
const emit = defineEmits(['close']);

onMounted(() => {
  socialStore.loadSocialData();
});
</script>

<template>
  <div
    class="social-modal-overlay"
    @click.self="emit('close')"
  >
    <div class="social-modal-content animate-slide-up">
      <header class="modal-header">
        <div class="title">
          CENTRO SOCIAL
        </div>
        <button
          class="close-btn"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <nav class="modal-tabs">
        <button 
          :class="{ active: activeTab === 'friends' }" 
          @click="activeTab = 'friends'"
        >
          AMIGOS
          <span
            v-if="socialStore.friends.length"
            class="badge-mini"
          >{{ socialStore.friends.length }}</span>
        </button>
        <button 
          :class="{ active: activeTab === 'requests' }" 
          @click="activeTab = 'requests'"
        >
          SOLICITUDES
          <span
            v-if="socialStore.notifications.friends > 0"
            class="badge-notif"
          >{{ socialStore.notifications.friends }}</span>
        </button>
        <button 
          :class="{ active: activeTab === 'search' }" 
          @click="activeTab = 'search'"
        >
          BUSCAR
        </button>
      </nav>

      <div class="modal-body custom-scrollbar">
        <!-- TABS: FRIENDS -->
        <div
          v-if="activeTab === 'friends'"
          class="tab-content"
        >
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
              @click="activeTab = 'search'"
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

        <!-- TABS: REQUESTS -->
        <div
          v-if="activeTab === 'requests'"
          class="tab-content"
        >
          <div
            v-if="socialStore.pendingRequests.length === 0"
            class="empty-state"
          >
            <div class="icon">
              ✉️
            </div>
            <p>No tenés solicitudes pendientes.</p>
          </div>

          <div
            v-else
            class="requests-list"
          >
            <div
              v-for="req in socialStore.pendingRequests"
              :key="req.id"
              class="request-card"
            >
              <div class="request-info">
                <TrainerAvatar 
                  :player-class="req.profiles?.save_data?.playerClass" 
                  :level="req.profiles?.save_data?.trainerLevel" 
                  :size="36"
                />
                <div class="text">
                  <span class="username">{{ req.profiles?.username }}</span>
                  quiere ser tu amigo
                </div>
              </div>
              <div class="request-btns">
                <button
                  class="btn-accept"
                  @click="socialStore.respondRequest(req.id, 'accepted')"
                >
                  ACEPTAR
                </button>
                <button
                  class="btn-reject"
                  @click="socialStore.respondRequest(req.id, 'rejected')"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TABS: SEARCH -->
        <div
          v-if="activeTab === 'search'"
          class="tab-content"
        >
          <div class="search-bar">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Nombre del entrenador..." 
              @input="handleSearch"
            >
            <span
              v-if="socialStore.searchLoading"
              class="loader-mini"
            />
          </div>

          <div class="search-results">
            <div
              v-for="player in socialStore.searchResults"
              :key="player.id"
              class="search-card"
            >
              <TrainerAvatar 
                :player-class="player.playerClass" 
                :level="player.level" 
                :size="40"
              />
              <div class="player-info">
                <div class="name">
                  {{ player.username }}
                </div>
                <div class="meta">
                  Nv.{{ player.level }}
                </div>
              </div>
              
              <div class="search-actions">
                <button 
                  v-if="player.status === 'none'" 
                  class="btn-add" 
                  @click="socialStore.sendFriendRequest(player.id)"
                >
                  ➕ AGREGAR
                </button>
                <span
                  v-else-if="player.status === 'pending'"
                  class="status-badge pending"
                >
                  {{ player.isRequester ? '⏳ ENVIADA' : '🔔 PENDIENTE' }}
                </span>
                <span
                  v-else-if="player.status === 'accepted'"
                  class="status-badge friend"
                >
                  ✅ AMIGO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.social-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.social-modal-content {
  width: min(500px, 100%);
  background: #101822;
  border: 1px solid rgba(199, 125, 255, 0.25);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.modal-header {
  padding: 20px;
  background: linear-gradient(90deg, #161e2e, #10172a);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    color: var(--purple-light);
    letter-spacing: 1px;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #fff;
    font-size: 24px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover { background: rgba(239, 68, 68, 0.2); }
  }
}

.modal-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  gap: 4px;

  button {
    flex: 1;
    background: transparent;
    border: none;
    padding: 12px;
    color: #64748b;
    font-family: 'Press Start 2P', cursive;
    font-size: 7px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s;
    position: relative;

    &.active {
      background: rgba(157, 78, 221, 0.15);
      color: var(--purple-light);
      box-shadow: inset 0 0 10px rgba(157, 78, 221, 0.1);
    }

    .badge-mini {
      font-size: 9px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 5px;
      border-radius: 6px;
      margin-left: 5px;
    }

    .badge-notif {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      background: #ef4444;
      color: #fff;
      font-size: 9px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;

  .icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
  p { font-size: 14px; margin-bottom: 20px; }
}

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
    transform: translateX(4px);
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

    &:hover { transform: unquote("scale(1.1)"); }
    &.chat:hover { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    &.trade:hover { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    &.battle:hover { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    &.remove:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }
  }
}

.search-bar {
  margin-bottom: 20px;
  position: relative;

  input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(199, 125, 255, 0.2);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    outline: none;

    &:focus { border-color: var(--purple-light); box-shadow: 0 0 15px rgba(157, 78, 221, 0.1); }
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  .player-info {
    flex: 1;
    .name { font-weight: 700; color: #fff; }
    .meta { font-size: 11px; color: #64748b; }
  }
}

.btn-add {
  background: rgba(157, 78, 221, 0.15);
  border: 1px solid rgba(157, 78, 221, 0.3);
  color: var(--purple-light);
  padding: 8px 12px;
  border-radius: 8px;
  font-family: 'Press Start 2P', cursive;
  font-size: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: var(--purple); color: #fff; }
}

.status-badge {
  font-family: 'Press Start 2P', cursive;
  font-size: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  
  &.pending { background: rgba(255, 193, 7, 0.1); color: #ffc107; }
  &.friend { background: rgba(34, 197, 94, 0.1); color: #4ade80; }
}

.request-card {
  background: rgba(157, 78, 221, 0.05);
  border: 1px solid rgba(157, 78, 221, 0.1);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .request-info {
    display: flex;
    gap: 12px;
    align-items: center;
    
    .text {
      font-size: 12px;
      color: #94a3b8;
      .username { color: #fff; font-weight: 700; margin-right: 4px; }
    }
  }

  .request-btns {
    display: flex;
    gap: 8px;

    .btn-accept {
      background: #22c55e;
      border: none;
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: 'Press Start 2P', cursive;
      font-size: 6px;
      cursor: pointer;
    }

    .btn-reject {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
    }
  }
}

.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
