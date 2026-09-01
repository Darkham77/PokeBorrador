<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'
import { useSocialStore, type PendingRequest } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import TrainerCard from './TrainerCard.vue'
import { gsap } from 'gsap'

const REQUEST_CARD_INITIAL_OPACITY = 0;
const REQUEST_CARD_INITIAL_X_OFFSET = -20;
const REQUEST_CARD_INITIAL_SCALE = 0.95;
const REQUEST_CARD_ANIM_DURATION_SEC = 0.45;
const REQUEST_CARD_ANIM_STAGGER_SEC = 0.06;

const socialStore = useSocialStore()
const uiStore = useUIStore()
const listRef = ref<HTMLElement | null>(null)

function openTrainerProfile(userId: string) {
  uiStore.open('TrainerProfile', { userId })
}

const getProfileForRequest = (req: PendingRequest) => {
  const p = req.profiles;
  return {
    id: req.requester_id,
    username: p?.username || 'Entrenador',
    level: p?.level || p?.trainer_level || 1,
    playerClass: p?.playerClass || p?.player_class || 'Entrenador',
    faction: p?.full_name || null,
    nick_style: p?.save_data?.nick_style || p?.nick_style || 'normal',
    avatar_style: p?.avatar_style || null,
    gender: p?.gender || null
  }
}

function animateCards() {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.trainer-card')
    if (cards.length > 0) {
      listRef.value.classList.add('tab-mounting')
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: REQUEST_CARD_INITIAL_OPACITY,
        x: REQUEST_CARD_INITIAL_X_OFFSET,
        scale: REQUEST_CARD_INITIAL_SCALE,
        duration: REQUEST_CARD_ANIM_DURATION_SEC,
        stagger: REQUEST_CARD_ANIM_STAGGER_SEC,
        ease: 'back.out(1.2)',
        clearProps: 'opacity,x,scale',
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

watch(() => socialStore.pendingRequests.map((r) => r.id).join(','), () => {
  animateCards()
})
</script>

<template>
  <div class="social-tab-content">
    <div
      v-if="socialStore.pendingRequests.length === 0"
      class="empty-state"
    >
      <div class="icon emoji">
        ✉️
      </div>
      <p>No tenés solicitudes pendientes.</p>
    </div>

    <div
      v-else
      ref="listRef"
      class="requests-list"
    >
      <TrainerCard
        v-for="req in socialStore.pendingRequests"
        :key="req.id"
        :profile="getProfileForRequest(req)"
        :avatar-size="36"
        variant="pending"
        @click-profile="openTrainerProfile"
      >
        <template #subtext>
          quiere ser tu amigo
        </template>

        <template #actions>
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
        </template>
      </TrainerCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.tab-mounting .request-card {
    
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
  will-change: transform, filter;
  

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;
  

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}
</style>

