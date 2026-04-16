<script setup>
import { ref, onMounted } from 'vue'
import { useSocialStore } from '@/stores/social.js'
import { useChatStore } from '@/stores/chat.js'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()
const chatStore = useChatStore()

const activeTab = ref('friends') // 'friends', 'search', 'requests'
const searchInput = ref('')

const handleSearch = () => {
  socialStore.searchPlayers(searchInput.value)
}

const openChat = (friend) => {
  chatStore.openChat(friend.id, friend.username)
}

onMounted(() => {
  socialStore.loadSocialData()
  socialStore.startPresence()
})
</script>

<template>
  <div class="social-view">
    <!-- Tabs Nav (Legacy Style) -->
    <div class="tabs-nav">
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'friends' }"
        @click="activeTab = 'friends'"
      >
        AMIGOS
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'search' }"
        @click="activeTab = 'search'"
      >
        BUSCAR
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'requests' }"
        @click="activeTab = 'requests'"
      >
        SOLICITUDES
        <span
          v-if="socialStore.pendingRequests.length"
          class="notif-dot"
        >{{ socialStore.pendingRequests.length }}</span>
      </button>
    </div>

    <div class="tab-content">
      <!-- Friends List (1:1 with legacy) -->
      <div
        v-if="activeTab === 'friends'"
        class="friends-container"
      >
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
          </div>
          <div
            class="friend-status-dot"
            :class="{ online: friend.isOnline }"
          />
          
          <div class="friend-info">
            <div
              class="friend-name"
              :class="friend.nick_style"
            >
              {{ friend.username }}
            </div>
            <div class="friend-meta">
              Nv. {{ friend.level }} &nbsp;·&nbsp; {{ friend.badges }} medallas
            </div>
          </div>

          <div class="friend-actions">
            <button
              class="friend-btn chat"
              @click="openChat(friend)"
            >
              💬 Chat
            </button>
            <button
              class="friend-btn trade"
              @click="socialStore.openTradeModal(friend.id, friend.username)"
            >
              🔄 Intercambiar
            </button>
            <button
              class="friend-btn battle"
              @click="socialStore.sendBattleInvite(friend.id, friend.username)"
            >
              ⚔️ Batallar
            </button>
            <button
              class="friend-btn remove"
              @click="socialStore.removeFriend(friend.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Search (1:1 with legacy) -->
      <div
        v-if="activeTab === 'search'"
        class="search-container"
      >
        <div class="search-box">
          <input 
            v-model="searchInput" 
            placeholder="Nombre del entrenador..." 
            class="search-input"
            @input="handleSearch"
          >
        </div>

        <div class="results-list">
          <div
            v-for="result in socialStore.searchResults"
            :key="result.id"
            class="search-result-card"
          >
            <div class="friend-avatar">
              <TrainerAvatar 
                :player-class="result.playerClass" 
                :level="result.level" 
                :size="44" 
              />
            </div>
            <div class="friend-info">
              <div
                class="friend-name"
                :class="result.nick_style"
              >
                {{ result.username }}
              </div>
            </div>
             
            <div class="search-actions">
              <button 
                v-if="result.status === 'none'"
                class="friend-btn add" 
                @click="socialStore.sendFriendRequest(result.id)"
              >
                ➕ AGREGAR
              </button>
              <span
                v-else-if="result.status === 'pending' && result.isRequester"
                class="pending-badge"
              >⏳ Pendiente</span>
              <button 
                v-else-if="result.status === 'pending' && !result.isRequester"
                class="friend-btn accept" 
                @click="socialStore.respondRequest(result.relId, 'accepted')"
              >
                ✓ ACEPTAR
              </button>
              <span
                v-else-if="result.status === 'accepted'"
                class="pending-badge success"
              >✓ Amigos</span>
            </div>
          </div>
          <div
            v-if="socialStore.searchResults.length === 0 && searchInput.length >= 2"
            class="no-results"
          >
            No se encontraron entrenadores.
          </div>
        </div>
      </div>

      <!-- Requests (1:1 with legacy) -->
      <div
        v-if="activeTab === 'requests'"
        class="requests-container"
      >
        <div
          v-if="socialStore.pendingRequests.length === 0"
          class="empty-state"
        >
          <p>No tienes solicitudes de amistad pendientes.</p>
        </div>
        <div
          v-for="req in socialStore.pendingRequests"
          :key="req.id"
          class="friend-card"
        >
          <div class="friend-avatar">
            <TrainerAvatar 
              :player-class="req.profiles.playerClass" 
              :level="req.profiles.level" 
              :size="44" 
            />
          </div>
          <div class="friend-info">
            <div class="friend-name">
              {{ req.profiles.username }}
            </div>
            <div class="friend-meta">
              Quiere ser tu amigo
            </div>
          </div>
          <div class="friend-actions">
            <button
              class="friend-btn accept"
              @click="socialStore.respondRequest(req.id, 'accepted')"
            >
              ✓ Aceptar
            </button>
            <button
              class="friend-btn remove"
              @click="socialStore.respondRequest(req.id, 'rejected')"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.social-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: 0;
}

.tabs-nav {
  display: flex;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
  background: rgba(0,0,0,0.4);
}

.tab-link {
  flex: 1;
  background: none;
  border: none;
  padding: 15px;
  color: #888;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &.active {
    color: #fff;
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background: #fff;
    }
  }

  .notif-dot {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #ff4757;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
  }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px;
}

/* 1:1 Legacy Card Styles */
.friend-card, .search-result-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 15px;
  margin-bottom: 12px;
  position: relative;
}

.friend-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.friend-status-dot {
  position: absolute;
  top: 12px;
  left: 45px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4b5563; // offline
  border: 2px solid #1a1a1a;
  z-index: 5;

  &.online {
    background: #10b981;
  }
}

.friend-info {
  flex: 1;
  .friend-name {
    font-size: 14px;
    font-weight: 900;
    color: #fff;
    margin-bottom: 4px;
  }
  .friend-meta {
    font-size: 11px;
    color: #888;
  }
}

.friend-actions, .search-actions {
  display: flex;
  gap: 8px;
}

/* 1:1 Legacy Button Styles */
.friend-btn {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.chat {
    background: rgba(107, 203, 119, 0.15);
    color: #6bcb77;
    border-color: rgba(107, 203, 119, 0.3);
  }

  &.trade {
    background: rgba(255, 217, 61, 0.15);
    color: #ffd93d;
    border-color: rgba(255, 217, 61, 0.3);
  }

  &.battle {
    background: rgba(199, 125, 255, 0.15);
    color: #c77dff;
    border-color: rgba(199, 125, 255, 0.3);
  }

  &.remove {
    background: rgba(255, 71, 87, 0.1);
    color: #ff4757;
    border-color: rgba(255, 71, 87, 0.2);
  }

  &.add {
    background: rgba(199, 125, 255, 0.15);
    color: #c77dff;
    border-color: rgba(199, 125, 255, 0.3);
  }

  &.accept {
    background: rgba(107, 203, 119, 0.2);
    color: #6bcb77;
    border-color: rgba(107, 203, 119, 0.4);
  }
}

.pending-badge {
  font-size: 10px;
  color: #888;
  font-weight: bold;
  padding: 6px;

  &.success {
    color: #6bcb77;
  }
}

/* Search Box */
.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  outline: none;
  font-size: 13px;

  &:focus {
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #888;
  font-size: 12px;
  line-height: 1.6;

  .empty-icon {
    font-size: 40px;
    margin-bottom: 15px;
    opacity: 0.3;
  }
}

.no-results {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 12px;
}
</style>
