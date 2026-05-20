<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useUIStore } from '@/stores/ui'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import { gsap } from 'gsap'

const socialStore = useSocialStore()
const uiStore = useUIStore()
const listRef = ref<HTMLElement | null>(null)

function openTrainerProfile(userId: string) {
  uiStore.open('TrainerProfile', { userId })
}

function animateCards() {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.request-card')
    if (cards.length > 0) {
      listRef.value.classList.add('tab-mounting')
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: -20,
        scale: 0.95,
        duration: 0.45,
        stagger: 0.06,
        ease: 'back.out(1.2)',
        clearProps: 'all',
        onComplete: () => {
          listRef.value?.classList.remove('tab-mounting')
        }
      })
    }
  })
}

onMounted(() => {
  animateCards()
})

watch(() => socialStore.pendingRequests, () => {
  animateCards()
}, { deep: true })
</script>

<template>
  <div class="social-tab-content">
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
      ref="listRef"
      class="requests-list"
    >
      <div
        v-for="req in socialStore.pendingRequests"
        :key="req.id"
        class="request-card"
      >
        <div class="request-info">
          <TrainerAvatar 
            :player-class="req.profiles?.save_data?.playerClass || req.profiles?.playerClass || req.profiles?.player_class || 'Entrenador'" 
            :level="req.profiles?.save_data?.trainerLevel || req.profiles?.level || req.profiles?.trainer_level || 1" 
            :avatar-style="req.profiles?.avatar_style || req.profiles?.save_data?.avatar_style || undefined"
            :size="36"
            class="clickable-avatar"
            @click.stop="openTrainerProfile(req.requester_id)"
          />
          <div class="text">
            <span 
              class="username clickable-username"
              :class="req.profiles?.save_data?.nick_style || req.profiles?.nick_style"
              @click.stop="openTrainerProfile(req.requester_id)"
            >{{ req.profiles?.username }}</span>
            quiere ser tu amigo
          </div>
        </div>
        <div class="request-btns">
          <button
            class="btn-vicio-success btn-vicio-sm"
            @click.stop="socialStore.respondRequest(req.id, 'accepted')"
          >
            ACEPTAR
          </button>
          <button
            class="btn-vicio-danger btn-vicio-sm reject-btn"
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
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.tab-mounting .request-card {
    transition: none !important;
  }
}

.request-card {
  background: Rgba(157, 78, 221, 0.05);
  border: 1px solid Rgba(157, 78, 221, 0.1);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background: Rgba(157, 78, 221, 0.08);
    border-color: Rgba(157, 78, 221, 0.3);
    transform: Translatex(4px);
  }

  .request-info {
    display: flex;
    gap: 12px;
    align-items: center;
    
    .text {
      font-size: 13px;
      color: Rgba(148, 163, 184, 1);
      .username {
        color: var(--white);
        font-weight: 700;
        margin-right: 4px;
        font-size: 14px;
      }
    }
  }

  .request-btns {
    display: flex;
    gap: 8px;
    align-items: center;

    .reject-btn {
      min-width: 32px;
      padding: 0 !important;
      font-size: 16px !important;
      display: flex;
      align-items: center;
      justify-content: center;
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

.clickable-avatar {
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}
</style>

