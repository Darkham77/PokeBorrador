<script setup lang="ts">
import { onMounted } from 'vue'
import { useBuffsStore } from '@/stores/buffs'
import PVTooltip from '@/components/common/PVTooltip.vue'

const buffsStore = useBuffsStore() as any

onMounted(() => {
  buffsStore.initTick()
})

const formatTime = (secs: number) => {
  if (secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="buffs-overlay">
    <transition-group
      name="list"
      tag="div"
      class="buffs-list"
    >
      <PVTooltip 
        v-for="buff in buffsStore.activeBuffs" 
        :key="buff.id" 
        :title="buff.desc"
      >
        <div class="buff-badge">
          <img
            :src="buff.icon"
            :alt="buff.name"
            class="buff-icon"
            @error="handleImgError"
          >
          <div class="buff-info">
            <span class="buff-name">{{ buff.name }}</span>
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
  position: absolute;
  top: 80px; /* Below user bar */
  left: 10px;
  z-index: var(--z-base);
  pointer-events: none; /* Let clicks pass through */
}

.buffs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.buff-badge {
  display: flex;
  align-items: center;
  background: Rgba(0, 0, 0, 0.6);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px 10px;
  pointer-events: auto; /* Tooltip needs pointer */
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(4px);
  will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(4px);
  @include gpu-layer;
  box-shadow: 0 4px 6px Rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  cursor: help;
  @include gpu-layer;

  &:hover {
    background: Rgba(0, 0, 0, 0.8);
    border-color: var(--yellow, #ffd93d);
    box-shadow: 0 0 0 1px var(--yellow, #ffd93d);
    transform: Translatex(4px);
  }
}

.buff-icon {
  width: 24px;
  height: 24px;
  @include sprite-render;
  margin-right: 8px;
  will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 2px Rgba(0,0,0,0.5));
}

.buff-info {
  display: flex;
  flex-direction: column;
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
  margin-top: 2px;
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: Translatex(-30px);
}
</style>