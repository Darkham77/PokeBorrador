<script setup>
import { useSocialStore } from '@/stores/social.js'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()
</script>

<template>
  <div class="requests-container">
    <div
      v-if="socialStore.pendingRequests.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        📩
      </div>
      <p>No tienes solicitudes de amistad pendientes.</p>
    </div>
    
    <div
      v-for="req in socialStore.pendingRequests"
      :key="req.id"
      class="friend-card"
    >
      <div class="friend-avatar">
        <TrainerAvatar 
          :player-class="req.profiles?.playerClass || req.profiles?.player_class" 
          :level="req.profiles?.level || req.profiles?.trainer_level" 
          :size="44" 
        />
      </div>
      
      <div class="friend-info">
        <div class="friend-name">
          {{ req.profiles?.username || 'Entrenador' }}
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
          ✓ ACEPTAR
        </button>
        <button
          class="friend-btn remove"
          @click="socialStore.respondRequest(req.id, 'rejected')"
        >
          ✕ RECHAZAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.requests-container {
  padding-top: 10px;
}

.friend-card {
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

.friend-actions {
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

  &.accept {
    background: rgba(107, 203, 119, 0.2);
    color: #6bcb77;
    border-color: rgba(107, 203, 119, 0.4);
  }

  &.remove {
    background: rgba(255, 71, 87, 0.1);
    color: #ff4757;
    border-color: rgba(255, 71, 87, 0.2);
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
</style>
