<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBuffsStore, type ActiveBuffItem } from '@/stores/battle/buffs'
import { useModalStore } from '@/stores/modals'
import PVTooltip from '@/components/common/PVTooltip.vue'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'

const buffsStore = useBuffsStore()
const modalStore = useModalStore()

onMounted(() => {
  buffsStore.initTick()
})

const activeBuffs = computed<ActiveBuffItem[]>(() => buffsStore.activeBuffs)

const formatTime = (secs: number): string => {
  if (secs <= 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60

  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

const openInventory = () => {
  modalStore.open('Inventory')
}

const handleBuffClick = (buff: ActiveBuffItem) => {
  if (buff.isEvent && buff.event) {
    modalStore.open('EventDetail', { event: buff.event })
  } else {
    openInventory()
  }
}
</script>

<template>
  <div
    ref="widgetRef"
    class="home-active-buffs-widget home-section-card"
  >
    <!-- Header -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji card-icon">⚡</span>
        <div class="title-text-group">
          <h3 class="card-title">
            POTENCIADORES &amp; AURAS
          </h3>
          <span class="buffs-sub">
            {{ activeBuffs.length }} {{ activeBuffs.length === 1 ? 'efecto activo' : 'efectos activos' }}
          </span>
        </div>
      </div>

      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="buffs" />
      </div>
    </div>

    <!-- Active Buffs List -->
    <div
      v-if="activeBuffs.length > 0"
      class="buffs-grid"
    >
      <PVTooltip
        v-for="buff in activeBuffs"
        :key="buff.id"
        :title="buff.isEvent ? `📅 ${buff.name}` : buff.name"
        :description="buff.isEvent ? `${buff.desc} (Haz clic para ver detalles del evento)` : `${buff.desc} (Haz clic para gestionar en mochila)`"
      >
        <div
          :id="`home-buff-item-${buff.id}`"
          v-gsap-hover="{ scale: 1.02, y: -2 }"
          class="buff-card-item"
          :class="{ 'is-event-card': buff.isEvent }"
          @click.stop="handleBuffClick(buff)"
        >
          <!-- Icon slot -->
          <div class="buff-icon-slot">
            <span
              v-if="buff.isEmoji"
              class="buff-emoji emoji"
            >{{ buff.icon }}</span>
            <img
              v-else
              :src="buff.icon"
              :alt="buff.name"
              class="buff-icon-img"
              @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
            >
          </div>

          <!-- Info Body -->
          <div class="buff-info-body">
            <div class="buff-title-row">
              <span class="buff-label">{{ buff.name }}</span>
              <span
                class="buff-badge-pill"
                :class="{ 'is-event': buff.isEvent }"
              >
                {{ buff.isEvent ? 'EVENTO' : 'CONSUMIBLE' }}
              </span>
            </div>

            <div class="buff-time-row">
              <span class="buff-time-text">
                <span class="emoji timer-icon">⏱️</span> {{ formatTime(buff.secs) }}
              </span>
            </div>
          </div>
        </div>
      </PVTooltip>
    </div>

    <!-- Empty State -->
    <div
      v-else
      v-gsap-hover="{ scale: 1.01, y: -1 }"
      class="empty-buffs-card"
      @click.stop="openInventory"
    >
      <span class="emoji empty-icon">🧪</span>
      <div class="empty-info">
        <span class="empty-title">Sin potenciadores activos</span>
        <span class="empty-sub">Usa inciensos, huevos suerte o repelentes desde tu mochila.</span>
      </div>
      <button
        v-gsap-hover
        class="empty-action-btn"
      >
        ACTIVAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-active-buffs-widget {
  @include home-section-card;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgb(255 255 255 / 6%);
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;

  .card-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    font-size: 20px;
    line-height: 1;
    flex-shrink: 0;
  }

  .title-text-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .card-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .buffs-sub {
    color: Rgb(255 255 255 / 50%);
    font-size: 10px;
    line-height: 1.35;
  }
}

.header-actions {
  @include widget-header-actions;

  flex-shrink: 0;
  margin-left: auto;
}

.buffs-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
  width: 100%;
}

.buff-card-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 10px;
  background: Rgb(15 23 42 / 95%);
  box-shadow: 0 4px 12px Rgb(0 0 0 / 45%);
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    background: Rgb(250 204 21 / 4%);
    border-color: Rgb(250 204 21 / 40%);
    box-shadow: 0 4px 16px Rgb(0 0 0 / 55%);
  }

  &.is-event-card {
    background: Rgb(56 189 248 / 4%);
    border-color: Rgb(56 189 248 / 25%);

    &:hover {
      border-color: #38bdf8;
      box-shadow: 0 0 14px Rgb(56 189 248 / 30%);
    }
  }
}

.buff-icon-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: Rgb(255 255 255 / 4%);
  flex-shrink: 0;

  .buff-emoji {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", sans-serif;
    font-size: 20px;
    line-height: 1;
    filter: Drop-Shadow(0 2px 3px Rgb(0 0 0 / 60%));
    user-select: none;
  }

  .buff-icon-img {
    @include pixelated;

    width: 22px;
    height: 22px;
    object-fit: contain;
  }
}

.buff-info-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.buff-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.buff-label {
  @include pixelated;

  color: var(--white, #fff);
  font-size: 8px;
  line-height: 1.45;
  padding-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.buff-badge-pill {
  @include pixelated;

  padding: 1px 5px;
  border: 1px solid Rgb(250 204 21 / 30%);
  border-radius: 3px;
  background: Rgb(250 204 21 / 15%);
  color: var(--yellow, #facc15);
  font-size: 6px;

  &.is-event {
    background: Rgb(56 189 248 / 15%);
    color: #38bdf8;
    border-color: Rgb(56 189 248 / 30%);
  }
}

.buff-time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
}

.buff-time-text {
  @include pixelated;

  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--yellow, #facc15);
  font-size: 8px;

  .timer-icon {
    font-size: 9px;
  }
}

.empty-buffs-card {
  @include empty-state-card;
}
</style>
