<script setup lang="ts">
import { computed, useTemplateRef, onMounted, onUnmounted, nextTick } from 'vue';
import { gsap } from 'gsap';
import { useGameStore } from '@/stores/game';
import { formatTime } from '@/logic/utils/timeUtils';
import type { NotificationItem } from '@/types/system/game';
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue';

const gameStore = useGameStore();
const feedRef = useTemplateRef<HTMLElement>('feedRef');
let gsapCtx: gsap.Context | null = null;

const history = computed<NotificationItem[]>(() => {
  const raw = (gameStore.state.notificationHistory || []) as (NotificationItem & {
    msg?: string;
  })[];
  return raw
    .filter((n) => {
      const text = `${n.message || ''} ${n.msg || ''} ${n.title || ''}`.toLowerCase();
      return !text.includes('bienvenido');
    })
    .toReversed();
});

function getIcon(n: NotificationItem): string {
  const metaIcon = n.meta?.['icon'];
  if (typeof metaIcon === 'string' && metaIcon) return metaIcon;
  if (n.title && n.title.length <= 4) return n.title;
  return '🔔';
}

function getText(n: NotificationItem & { msg?: string }): string {
  return n.message || n.msg || '';
}

function getTimestamp(n: NotificationItem): number {
  return n.timestamp || 0;
}

function animateList() {
  if (gsapCtx) {
    gsapCtx.revert();
  }
  gsapCtx = gsap.context(() => {
    const items = feedRef.value?.querySelectorAll('.notif-row');
    if (items && items.length > 0) {
      const NOTIF_ROW_ENTRANCE_OFFSET_X_PX = -8 as const;
      gsap.fromTo(
        items,
        { opacity: 0, x: NOTIF_ROW_ENTRANCE_OFFSET_X_PX },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
      );
    }
  }, feedRef.value || undefined);
}

onMounted(() => {
  nextTick(animateList);
});

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert();
  }
});
</script>

<template>
  <div ref="feedRef" class="home-notifications-feed">
    <!-- Header -->
    <div class="feed-header-row">
      <div class="header-left">
        <span class="emoji">📜</span>
        <h3 class="feed-title">HISTORIAL DE ACTIVIDAD ({{ history.length }}/50)</h3>
      </div>
      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="notifications" />
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
            <strong v-if="n.title && n.title !== getIcon(n)" class="notif-title">
              {{ n.title }}:
            </strong>
            {{ getText(n) }}
          </div>
          <span class="notif-time">{{ formatTime(getTimestamp(n)) }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="history.length === 0" class="empty-feed">
        <span class="emoji empty-icon">📭</span>
        <span class="empty-text">Sin actividad reciente registrada.</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;

.home-notifications-feed {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: 14px 16px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-xl;
  background: Rgb(18 22 34 / 85%);
  box-sizing: border-box;
  box-shadow: $shadow-md;
}

.feed-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgb(255 255 255 / 6%);
}

.header-actions {
  @include widget-header-actions;

  flex-shrink: 0;
  margin-left: auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  min-width: 0;
  flex: 1;

  .feed-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: var(--font-10);
    letter-spacing: 1px;
  }
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  max-height: 580px;
  overflow: hidden auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    border-radius: $radius-xs-alt;
    background: Rgb(0 0 0 / 20%);
  }

  &::-webkit-scrollbar-thumb {
    border-radius: $radius-xs-alt;
    background: Rgb(255 255 255 / 15%);

    &:hover {
      background: var(--yellow, #facc15);
    }
  }
}

.notif-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md-alt;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-lg;
  background: Rgb(255 255 255 / 3%);
  box-sizing: border-box;

  &:hover {
    background: Rgb(255 255 255 / 6%);
    border-color: Rgb(255 255 255 / 12%);
  }
}

.notif-icon {
  font-size: var(--font-16);
  line-height: 1.2;
  flex-shrink: 0;
}

.notif-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs-alt;
  min-width: 0;
  flex: 1;
}

.notif-text {
  color: var(--slate-200);
  font-size: var(--font-11);
  line-height: 1.4;
  overflow-wrap: break-word;

  .notif-title {
    color: var(--yellow, #facc15);
    font-weight: 600;
  }
}

.notif-time {
  color: var(--gray, var(--slate-400));
  font-size: var(--font-9);
}

.empty-feed {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $spacing-sm;
  padding: 30px 16px;
  color: var(--gray, var(--slate-400));

  .empty-icon {
    font-size: var(--font-24);
  }

  .empty-text {
    font-size: var(--font-10);
    text-align: center;
  }
}
</style>
