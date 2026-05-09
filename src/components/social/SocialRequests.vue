<script setup lang="ts">
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
          {{ req.profiles?.username || req.profiles?.full_name || 'Entrenador' }}
        </div>
        <div class="friend-meta">
          Quiere ser tu amigo
        </div>
      </div>
      
      <div class="friend-actions">
        <button
          class="friend-btn accept"
          @click.stop="socialStore.respondRequest(req.id, 'accepted')"
        >
          ✓ ACEPTAR
        </button>
        <button
          class="friend-btn remove"
          @click.stop="socialStore.respondRequest(req.id, 'rejected')"
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
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.1);
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
    color: var(--white);
    margin-bottom: 4px;
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
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid Rgba(255, 255, 255, 0.2);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.1);
  }

  &.accept {
    background: Rgba(107, 203, 119, 0.2);
    color: Rgba(107, 203, 119, 1);
    border-color: Rgba(107, 203, 119, 0.4);
  }

  &.remove {
    background: Rgba(255, 71, 87, 0.1);
    color: Rgba(255, 71, 87, 1);
    border-color: Rgba(255, 71, 87, 0.2);
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
