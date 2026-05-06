<script setup>
import { ref } from 'vue'
import { useSocialStore } from '@/stores/social'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()
const searchQuery = ref('')

async function handleSearch() {
  if (searchQuery.value.length < 2) return
  await socialStore.searchPlayers(searchQuery.value)
}
</script>

<template>
  <div class="tab-content">
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
            @click.stop="socialStore.sendFriendRequest(player.id)"
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
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.search-bar {
  margin-bottom: 20px;
  position: relative;

  input {
    width: 100%;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(199, 125, 255, 0.2);
    border-radius: 12px;
    padding: 12px 16px;
    color: var(--white);
    font-size: 14px;
    outline: none;

    &:focus { border-color: var(--purple-light); box-shadow: 0 0 15px Rgba(157, 78, 221, 0.1); }
  }
  
  .loader-mini {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border: 2px solid Rgba(255, 255, 255, 0.1);
    border-top-color: var(--purple-light);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-card {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  .player-info {
    flex: 1;
    .name { font-weight: 700; color: var(--white); }
    .meta { font-size: 11px; color: Rgba(255, 255, 255, 0.5); }
  }
}

.btn-add {
  background: Rgba(157, 78, 221, 0.15);
  border: 1px solid Rgba(157, 78, 221, 0.3);
  color: var(--purple-light);
  padding: 8px 12px;
  border-radius: 8px;
  @include pixelated;
  font-size: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: var(--purple); color: var(--white); }
}

.status-badge {
  @include pixelated;
  font-size: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  
  &.pending { background: Rgba(255, 193, 7, 0.1); color: Rgba(255, 193, 7, 1); }
  &.friend { background: Rgba(34, 197, 94, 0.1); color: Rgba(74, 222, 128, 1); }
}

@keyframes spin { to { transform: translateY(-50%) Rotate(360deg); } }
</style>
