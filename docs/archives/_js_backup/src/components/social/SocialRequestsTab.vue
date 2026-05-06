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
            @click.stop="socialStore.respondRequest(req.id, 'accepted')"
          >
            ACEPTAR
          </button>
          <button
            class="btn-reject"
            @click.stop="socialStore.respondRequest(req.id, 'rejected')"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-card {
  background: Rgba(157, 78, 221, 0.05);
  border: 1px solid Rgba(157, 78, 221, 0.1);
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
      color: Rgba(148, 163, 184, 1);
      .username { color: var(--white); font-weight: 700; margin-right: 4px; }
    }
  }

  .request-btns {
    display: flex;
    gap: 8px;

    .btn-accept {
      background: Rgba(34, 197, 94, 1);
      border: none;
      color: var(--white);
      padding: 8px 12px;
      border-radius: 8px;
      @include pixelated;
      font-size: 6px;
      cursor: pointer;
    }

    .btn-reject {
      background: Rgba(239, 68, 68, 0.1);
      border: 1px solid Rgba(239, 68, 68, 0.2);
      color: Rgba(248, 113, 113, 1);
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
  color: Rgba(148, 163, 184, 1);
  .icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
  p { font-size: 14px; margin-bottom: 20px; }
}
</style>
