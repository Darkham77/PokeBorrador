<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBuffsStore, type ActiveBuffItem } from '@/stores/battle/buffs'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'

const buffsStore = useBuffsStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const isVisible = computed(() => uiStore.activeTab === 'map')

onMounted(() => {
  buffsStore.initTick()
})

const formatTime = (secs: number) => {
  if (secs <= 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}

const handleBadgeClick = (buff: ActiveBuffItem) => {
  if (buff.isEvent && buff.event) {
    modalStore.open('EventDetail', { event: buff.event })
  }
}
</script>

<template>
  <div
    v-if="isVisible"
    class="buffs-overlay"
  >
    <transition-group
      name="list"
      tag="div"
      class="buffs-list"
    >
      <PVTooltip 
        v-for="buff in buffsStore.activeBuffs" 
        :key="buff.id" 
        :title="buff.isEvent ? `📅 EVENTO: ${buff.name} — ${buff.desc} (Haz clic para ver detalles)` : `${buff.name} — ${buff.desc}`"
      >
        <div 
          :id="`buff-badge-${buff.id}`"
          :class="['buff-badge', { 'is-event-badge': buff.isEvent }]"
          @click.stop="handleBadgeClick(buff)"
        >
          <div class="buff-icon-slot">
            <span 
              v-if="buff.isEmoji" 
              class="buff-emoji"
            >{{ buff.icon }}</span>
            <img
              v-else
              :src="buff.icon"
              :alt="buff.name"
              class="buff-icon"
              @error="handleImgError"
            >
          </div>
          <div class="buff-info">
            <span class="buff-time">{{ formatTime(buff.secs) }}</span>
          </div>
        </div>
      </PVTooltip>
    </transition-group>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.buffs-overlay {
  position: fixed;
  top: 160px; /* Below user bar on all resolutions */
  left: 16px;
  z-index: calc(var(--z-hud) + var(--z-low)); /* Above HUD layout using standard variables */
  pointer-events: none; /* Let clicks pass through */
}

.buffs-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.buff-badge {
  display: inline-flex;
  align-items: center;
  height: 36px;
  box-sizing: border-box;
  background: Rgba(0, 0, 0, 0.9);
  border: 1.5px solid var(--yellow, #ffd93d);
  border-radius: 12px;
  padding: 0 10px;
  pointer-events: auto; /* Tooltip needs pointer */
  @include gpu-layer;
  box-shadow: 0 4px 6px Rgba(0,0,0,0.3);
  
  cursor: help;
  @include gpu-layer;

  &:hover {
    background: Rgba(0, 0, 0, 0.8);
    border-color: var(--yellow, #ffd93d);
    box-shadow: 0 0 0 1px var(--yellow, #ffd93d);
    transform: Translatex(4px);
  }

  &.is-event-badge {
    cursor: pointer;

    &:hover {
      border-color: #ffe066;
      box-shadow: 0 0 8px Rgba(255, 217, 61, 0.5);
      transform: Translatex(4px);
    }
  }
}

.buff-icon-slot {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
  overflow: visible;
}

.buff-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", sans-serif;
  font-size: 22px;
  line-height: 1;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  filter: Drop-Shadow(0 2px 3px Rgba(0, 0, 0, 0.6));
  user-select: none;
  transform: Translatey(-2px);
}

.buff-icon {
  width: 24px;
  height: 24px;
  @include sprite-render;
  object-fit: contain;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 2px Rgba(0,0,0,0.5));
}

.buff-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.buff-name {
  color: $white;
  font-size: 10px;
  font-weight: 800;
  @include pixelated;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.buff-time {
  color: var(--yellow, #ffd93d);
  font-size: 12px;
  font-weight: 700;
  @include pixelated;
  line-height: 1;
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: Translatex(-30px);
}
</style>


