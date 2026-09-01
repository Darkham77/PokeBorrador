<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { formatTime } from '@/logic/utils/timeUtils'
import type { NotificationItem } from '@/types/system/game'

const gameStore = useGameStore()
const feedRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

const history = computed<NotificationItem[]>(() => {
  const raw = (gameStore.state.notificationHistory || []) as (NotificationItem & { msg?: string })[]
  return raw
    .filter(n => {
      const text = `${n.message || ''} ${n.msg || ''} ${n.title || ''}`.toLowerCase()
      return !text.includes('bienvenido')
    })
    .slice()
    .reverse()
})

function getIcon(n: NotificationItem): string {
  const metaIcon = n.meta?.['icon']
  if (typeof metaIcon === 'string' && metaIcon) return metaIcon
  if (n.title && n.title.length <= 4) return n.title
  return '🔔'
}

function getText(n: NotificationItem & { msg?: string }): string {
  return n.message || n.msg || ''
}

function getTimestamp(n: NotificationItem): number {
  return n.timestamp || 0
}

function animateList() {
  if (gsapCtx) {
    gsapCtx.revert()
  }
  gsapCtx = gsap.context(() => {
    const items = feedRef.value?.querySelectorAll('.notif-row')
    if (items && items.length > 0) {
      gsap.fromTo(
        items,
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
      )
    }
  }, feedRef.value || undefined)
}

onMounted(() => {
  nextTick(animateList)
})

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert()
  }
})
</script>

<template>
  <div
    ref="feedRef"
    class="home-notifications-feed"
  >
    <!-- Header -->
    <div class="feed-header-row">
      <div class="header-left">
        <span class="emoji">📜</span>
        <h3 class="feed-title">
          HISTORIAL DE ACTIVIDAD ({{ history.length }}/50)
        </h3>
      </div>
    </div>

    <!-- Notifications Scroll List (Scrollbar when > 10 items) -->
    <div class="notifications-list custom-scrollbar">
      <div
        v-for="n in history"
        :key="n.id"
        v-gsap-hover="{ scale: 1.01, y: -1, duration: 0.15 }"
        class="notif-row"
      >
        <span class="emoji notif-icon">{{ getIcon(n) }}</span>
        <div class="notif-content">
          <div class="notif-text">
            <strong
              v-if="n.title && n.title !== getIcon(n)"
              class="notif-title"
            >
              {{ n.title }}:
            </strong>
            {{ getText(n) }}
          </div>
          <span class="notif-time">{{ formatTime(getTimestamp(n)) }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="history.length === 0"
        class="empty-feed"
      >
        <span class="emoji empty-icon">📭</span>
        <span class="empty-text">Sin actividad reciente registrada.</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-notifications-feed {
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);
}

.feed-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;

  .feed-icon {
    font-size: 16px;
  }

  .feed-title {
    @include pixelated;
    font-size: 10px;
    color: var(--yellow, #facc15);
    margin: 0;
    letter-spacing: 1px;
  }
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 580px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.15);
    border-radius: 3px;

    &:hover {
      background: var(--yellow, #facc15);
    }
  }
}

.notif-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 10px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  box-sizing: border-box;
  width: 100%;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    border-color: Rgba(255, 255, 255, 0.12);
  }
}

.notif-icon {
  font-size: 16px;
  line-height: 1.2;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.notif-text {
  font-size: 11px;
  color: #e2e8f0;
  line-height: 1.4;
  word-break: break-word;

  .notif-title {
    color: var(--yellow, #facc15);
    font-weight: 600;
  }
}

.notif-time {
  font-size: 9px;
  color: var(--gray, #94a3b8);
}

.empty-feed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px 16px;
  color: var(--gray, #94a3b8);

  .empty-icon {
    font-size: 24px;
  }

  .empty-text {
    font-size: 10px;
    text-align: center;
  }
}
</style>
