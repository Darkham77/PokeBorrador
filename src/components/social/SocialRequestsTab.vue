<script setup>
import { useSocialStore } from '@/stores/social'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()
</script>

<template>
  <div class="tab-content">
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
</template>

<style scoped lang="scss">
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
      .username { color: $white; font-weight: 700; margin-right: 4px; }
    }
  }

  .request-btns {
    display: flex;
    gap: 8px;

    .btn-accept {
      background: #22c55e;
      border: none;
      color: $white;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  .icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
  p { font-size: 14px; margin-bottom: 20px; }
}
</style>
