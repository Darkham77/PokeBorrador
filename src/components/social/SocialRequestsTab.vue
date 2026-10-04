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
              v-gsap-hover
              class="btn-vicio-success btn-vicio-sm"
              @click.stop="socialStore.respondRequest(req.id, 'accepted')"
            >
              ACEPTAR
            </button>
            <button
              v-gsap-hover
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
}

.empty-state {
  padding: 40px 20px;
  color: Rgb(148 163 184 / 100%);
  text-align: center;
  .icon { font-size: 40px; opacity: 0.5; margin-bottom: 15px; }
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
    opacity: 0.85;
    text-decoration: underline;
  }
}
</style>

