<script setup>
import { ref } from 'vue'
import { useSocialStore } from '@/stores/social.js'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()
const searchInput = ref('')

const handleSearch = () => {
  socialStore.searchPlayers(searchInput.value)
}
</script>

<template>
  <div class="search-container">
    <div class="search-box">
      <input 
        v-model="searchInput" 
        placeholder="Nombre del entrenador..." 
        class="search-input"
        @input="handleSearch"
      >
      <div 
        v-if="socialStore.searchLoading" 
        class="search-loader"
      >
        ⏳
      </div>
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
          <div class="friend-meta">
            Nv. {{ result.level }}
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
        v-if="socialStore.searchResults.length === 0 && searchInput.length >= 2 && !socialStore.searchLoading"
        class="no-results"
      >
        No se encontraron entrenadores.
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-container {
  padding-top: 10px;
}

.search-box {
  margin-bottom: 20px;
  position: relative;
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
  font-family: inherit;

  &:focus {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.4);
  }
}

.search-loader {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.6;
}

.search-result-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 15px;
  margin-bottom: 12px;
}

.friend-avatar {
  flex-shrink: 0;
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

.search-actions {
  display: flex;
  gap: 8px;
}

.friend-btn {
  padding: 6px 12px;
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

.no-results {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 12px;
}
</style>
